package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

func (h *Handlers) GetGuideProfile(w http.ResponseWriter, r *http.Request) {
	g, err := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if u, err := h.Users.GetByID(r.Context(), g.UserID); err == nil && u != nil {
		fullName := domain.UserDisplayName(u.FirstName, u.LastName, u.Login)
		if g.DisplayName == "" || g.DisplayName == u.Login {
			g.DisplayName = fullName
		}
	}
	response.JSON(w, r, 200, h.buildGuideAccountProfile(r.Context(), g))
}
func (h *Handlers) buildGuideAccountProfile(ctx context.Context, g *domain.GuideProfile) domain.GuideAccountProfile {
	profile := guidesvc.BuildGuideAccountProfile(g, h.HasUploadedLicense(ctx, g))
	if g.CountryID != nil && *g.CountryID > 0 {
		if country, err := h.Geo.GetCountryByID(ctx, *g.CountryID); err == nil && country != nil {
			profile.CountrySlug = country.Slug
			profile.CountryName = country.Name
		}
	}
	cities, err := h.Guides.ListCities(ctx, g.ID)
	if err == nil {
		profile.Cities = cities
	}
	if profile.Cities == nil {
		profile.Cities = []domain.GuideCityBrief{}
	}
	return profile
}
func (h *Handlers) GuideAccountProfile(ctx context.Context, g *domain.GuideProfile) domain.GuideAccountProfile {
	return h.buildGuideAccountProfile(ctx, g)
}
func (h *Handlers) HasUploadedLicense(ctx context.Context, g *domain.GuideProfile) bool {
	ok, _ := h.Guides.HasDocument(ctx, g.ID, domain.DocTypeGuideLicense)
	if ok {
		return true
	}
	ok, _ = h.Guides.HasDocument(ctx, g.ID, domain.DocTypeEntertainerLicense)
	return ok
}
func (h *Handlers) UpdateGuideProfile(w http.ResponseWriter, r *http.Request) {
	var req domain.GuideProfile
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.CountryID != nil && *req.CountryID > 0 {
		country, err := h.Geo.GetCountryByID(r.Context(), *req.CountryID)
		if err != nil || country == nil {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
	}
	profile, err := h.GuideSvc.UpdateProfile(r.Context(), middleware.UserIDFromContext(r.Context()), req)
	if err != nil || profile == nil {
		if err == nil {
			response.Error(w, r, apperrors.ErrNotFound)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	response.JSON(w, r, 200, h.buildGuideAccountProfile(r.Context(), g))
}
func (h *Handlers) UploadDocument(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := r.ParseMultipartForm(h.Cfg.MediaMaxUploadBytes); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	docType := r.FormValue("type")
	if docType != domain.DocTypeGuideLicense && docType != domain.DocTypeEntertainerLicense {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	defer file.Close()
	mime := hdr.Header.Get("Content-Type")
	priv, pub, size, err := h.Media.SaveUpload(file, mime, h.Cfg.MediaMaxUploadBytes)
	if err != nil {
		h.Log.Warn("media upload rejected", "err", err, "declared_mime", mime, "request_id", middleware.GetRequestID(r.Context()))
		response.Error(w, r, mediaUploadError(err))
		return
	}
	_ = pub
	if err := h.Guides.DeleteDocumentByType(r.Context(), g.ID, guidesvc.OppositeDocumentType(docType)); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if err := h.Guides.AddDocument(r.Context(), g.ID, docType, priv, mime, size, ""); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	g.GuideType = guidesvc.GuideTypeForDocument(docType)
	if err := h.Guides.UpdateProfile(r.Context(), g); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, h.GuideAccountProfile(r.Context(), g))
}
func (h *Handlers) ListDocuments(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	items, err := h.Guides.ListDocuments(r.Context(), g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) ModListDocuments(w http.ResponseWriter, r *http.Request) {
	items, err := h.Guides.ListDocumentsForModeration(r.Context(), 100)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.GuideDocumentModerationItem{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) AddGuideCity(w http.ResponseWriter, r *http.Request) {
	g, err := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		CityID    int64 `json:"city_id"`
		IsPrimary bool  `json:"is_primary"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.CityID <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if err := h.Guides.AddCity(r.Context(), g.ID, req.CityID, req.IsPrimary); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) SetGuideCities(w http.ResponseWriter, r *http.Request) {
	g, err := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		CityIDs       []int64 `json:"city_ids"`
		PrimaryCityID int64   `json:"primary_city_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	for _, cityID := range req.CityIDs {
		if cityID <= 0 {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
		city, err := h.Geo.GetCityByID(r.Context(), cityID)
		if err != nil || city == nil {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
		if g.CountryID != nil && *g.CountryID > 0 && city.CountryID != *g.CountryID {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
	}
	if req.PrimaryCityID > 0 {
		found := false
		for _, id := range req.CityIDs {
			if id == req.PrimaryCityID {
				found = true
				break
			}
		}
		if !found {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
	}
	if err := h.Guides.ReplaceCities(r.Context(), g.ID, req.CityIDs, req.PrimaryCityID); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	cities, _ := h.Guides.ListCities(r.Context(), g.ID)
	if cities == nil {
		cities = []domain.GuideCityBrief{}
	}
	response.JSON(w, r, 200, map[string]any{"items": cities})
}

func (h *Handlers) RemoveGuideCity(w http.ResponseWriter, r *http.Request) {
	g, err := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	cityID, err := strconv.ParseInt(chi.URLParam(r, "cityId"), 10, 64)
	if err != nil || cityID <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if err := h.Guides.RemoveCity(r.Context(), g.ID, cityID); err != nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) CreateGuideGeoCity(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CountrySlug string   `json:"country_slug"`
		Name        string   `json:"name"`
		Latitude    *float64 `json:"latitude"`
		Longitude   *float64 `json:"longitude"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.CountrySlug == "" || req.Name == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	country, err := h.Geo.GetCountryBySlug(r.Context(), req.CountrySlug)
	if err != nil || country == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	regionID, err := h.Geo.EnsureRegion(r.Context(), country.ID, "main", country.Name)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	lat, lng, displayName, err := h.resolveCityGeocode(r.Context(), req.Name, req.CountrySlug, 0, 0)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	cityID, created, err := h.Geo.ResolveOrCreateCity(
		r.Context(), country.ID, regionID, guidesvc.CitySlug(displayName), displayName, lat, lng,
	)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	h.ensureCityCoords(r.Context(), cityID, lat, lng)
	h.ensureCityName(r.Context(), cityID, displayName)
	status := http.StatusCreated
	if !created {
		status = http.StatusOK
	}
	response.JSON(w, r, status, map[string]any{
		"id": cityID, "name": displayName, "created": created,
		"latitude": lat, "longitude": lng,
	})
}

func (h *Handlers) GuideDashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := middleware.UserIDFromContext(ctx)
	g, err := h.Guides.GetByUserID(ctx, uid)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}

	stats, err := h.Admin.GuideDashboardStats(ctx, g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	sub, _ := h.Subs.GetActive(ctx, g.ID)
	featuredGuide, _ := h.Featured.GetActiveGuideSlot(ctx, g.ID)
	featuredExcursions, _ := h.Featured.ListActiveExcursionSlotsByGuide(ctx, g.ID)
	paymentsEnabled, _ := h.Settings.GetBool(ctx, "guide_placement_payments_enabled", false)

	response.JSON(w, r, 200, guidesvc.BuildDashboard(guidesvc.DashboardInput{
		Guide:              g,
		Stats:              stats,
		Subscription:       sub,
		FeaturedGuide:      featuredGuide,
		FeaturedExcursions: featuredExcursions,
		PaymentsEnabled:    paymentsEnabled,
		HasLicense:         h.licensePresent(ctx, g),
	}))
}
