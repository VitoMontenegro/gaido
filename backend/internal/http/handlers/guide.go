package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

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
	response.JSON(w, r, 200, h.GuideAccountProfile(r.Context(), g))
}
func (h *Handlers) GuideAccountProfile(ctx context.Context, g *domain.GuideProfile) domain.GuideAccountProfile {
	return guidesvc.BuildGuideAccountProfile(g, h.HasUploadedLicense(ctx, g))
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
	profile, err := h.GuideSvc.UpdateProfile(r.Context(), middleware.UserIDFromContext(r.Context()), req)
	if err != nil || profile == nil {
		if err == nil {
			response.Error(w, r, apperrors.ErrNotFound)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, profile)
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
