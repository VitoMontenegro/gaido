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
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

type carrierProfileReq struct {
	CarrierType     string  `json:"carrier_type"`
	Citizenship     string  `json:"citizenship"`
	BaseCityID      *int64  `json:"base_city_id"`
	About           string  `json:"about"`
	ExperienceYears int     `json:"experience_years"`
	TripsCount      int     `json:"trips_count"`
	HoursText       string  `json:"hours_text"`
	ContactPerson   string  `json:"contact_person"`
	Status          string  `json:"status"`
	DisplayName     string  `json:"display_name"`
	BusinessName    string  `json:"business_name"`
	Phone           string  `json:"phone"`
	Email           string  `json:"email"`
	Telegram        string  `json:"telegram"`
	Whatsapp        string  `json:"whatsapp"`
	Viber           string  `json:"viber"`
}

type carrierVehicleReq struct {
	Brand       string `json:"brand"`
	Model       string `json:"model"`
	Year        *int   `json:"year"`
	VehicleType string `json:"vehicle_type"`
	Seats       int    `json:"seats"`
	PhotoURL    string `json:"photo_url"`
	Description string `json:"description"`
	IsPrimary   bool   `json:"is_primary"`
}

func (h *Handlers) ListCarriers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	p := postgres.CarrierSearchParams{}
	p.CarrierType = strings.TrimSpace(q.Get("carrier_type"))
	if v, err := strconv.ParseInt(q.Get("base_city_id"), 10, 64); err == nil {
		p.BaseCityID = v
	}
	p.VerifiedUkrainian = q.Get("verified_ukrainian") == "1" || q.Get("verified_ukrainian") == "true"
	if v, err := strconv.Atoi(q.Get("limit")); err == nil {
		p.Limit = v
	}
	if v, err := strconv.Atoi(q.Get("offset")); err == nil {
		p.Offset = v
	}
	items, total, err := h.Carriers.ListPublished(r.Context(), p)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, carrierProfileDTO(r, item, h))
	}
	response.JSON(w, r, 200, map[string]any{"items": out, "total": total})
}

func (h *Handlers) GetCarrierPublic(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	prof, err := h.Carriers.GetProfileBySlug(r.Context(), slug)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if prof == nil || prof.Status != domain.CarrierStatusPublished {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	vehicles, _ := h.Carriers.ListVehicles(r.Context(), prof.ProviderID)
	prof.Vehicles = vehicles
	reviews, _ := h.Carriers.ListReviews(r.Context(), prof.ProviderID)
	prof.Reviews = reviews
	rides, _ := h.Transport.ListByProvider(r.Context(), prof.ProviderID)
	published := make([]domain.TransportListing, 0, len(rides))
	for _, ride := range rides {
		if ride.Status == domain.TransportListingPublished {
			published = append(published, ride)
		}
	}
	prof.Rides = published
	response.JSON(w, r, 200, carrierProfileDTO(r, *prof, h))
}

func (h *Handlers) GetCarrierAccount(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int64)
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.JSON(w, r, 200, map[string]any{"profile": nil, "vehicles": []any{}})
		return
	}
	prof, err := h.Carriers.GetProfileByProviderID(r.Context(), p.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	vehicles, _ := h.Carriers.ListVehicles(r.Context(), p.ID)
	hasSub, _ := h.Providers.HasActiveSubscription(r.Context(), p.ID)
	out := map[string]any{
		"provider_id":         p.ID,
		"website_slug":        p.WebsiteSlug,
		"subscription_active": hasSub,
		"vehicles":            vehicles,
	}
	if prof != nil {
		out["profile"] = carrierProfileDTO(r, *prof, h)
	} else {
		out["profile"] = nil
	}
	response.JSON(w, r, 200, out)
}

func (h *Handlers) UpsertCarrierAccount(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int64)
	var req carrierProfileReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	p, err := h.ensureCarrierProvider(r, userID, req)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			response.Error(w, r, appErr)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	carrierType := req.CarrierType
	if carrierType == "" {
		carrierType = domain.CarrierTypePrivate
	}
	if carrierType != domain.CarrierTypeCompany && carrierType != domain.CarrierTypeFOP &&
		carrierType != domain.CarrierTypePrivate && carrierType != domain.CarrierTypeIndividual {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	citizenship := strings.ToUpper(strings.TrimSpace(req.Citizenship))
	if citizenship == "" {
		citizenship = "UA"
	}
	status := strings.TrimSpace(req.Status)
	if status == "" {
		status = domain.CarrierStatusPending
	}
	prof := domain.CarrierProfile{
		ProviderID:      p.ID,
		CarrierType:     carrierType,
		Citizenship:     citizenship,
		BaseCityID:      req.BaseCityID,
		About:           strings.TrimSpace(req.About),
		ExperienceYears: req.ExperienceYears,
		TripsCount:      req.TripsCount,
		TrustLevel:      domain.CarrierTrustNew,
		IdentityStatus:  domain.VerificationPending,
		UkrainianStatus: domain.VerificationPending,
		BusinessStatus:  domain.VerificationPending,
		DocumentsStatus: domain.VerificationPending,
		HoursText:       strings.TrimSpace(req.HoursText),
		ContactPerson:   strings.TrimSpace(req.ContactPerson),
		Status:          status,
	}
	if err := h.Carriers.UpsertProfile(r.Context(), prof); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) CreateCarrierVehicle(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int64)
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req carrierVehicleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if strings.TrimSpace(req.Brand) == "" {
		response.Error(w, r, apperrors.New("VALIDATION", "Вкажіть марку авто", 400))
		return
	}
	seats := req.Seats
	if seats <= 0 {
		seats = 4
	}
	vType := req.VehicleType
	if vType == "" {
		vType = "minivan"
	}
	id, err := h.Carriers.CreateVehicle(r.Context(), domain.CarrierVehicle{
		ProviderID:         p.ID,
		Brand:              strings.TrimSpace(req.Brand),
		Model:              strings.TrimSpace(req.Model),
		Year:               req.Year,
		VehicleType:        vType,
		Seats:              seats,
		PhotoURL:           strings.TrimSpace(req.PhotoURL),
		Description:        strings.TrimSpace(req.Description),
		VerificationStatus: domain.VerificationPending,
		IsPrimary:          req.IsPrimary,
	})
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]any{"id": id})
}

func (h *Handlers) UpdateCarrierVehicle(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int64)
	vehicleID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || vehicleID <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req carrierVehicleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	seats := req.Seats
	if seats <= 0 {
		seats = 4
	}
	if err := h.Carriers.UpdateVehicle(r.Context(), domain.CarrierVehicle{
		ID:          vehicleID,
		ProviderID:  p.ID,
		Brand:       strings.TrimSpace(req.Brand),
		Model:       strings.TrimSpace(req.Model),
		Year:        req.Year,
		VehicleType: req.VehicleType,
		Seats:       seats,
		PhotoURL:    strings.TrimSpace(req.PhotoURL),
		Description: strings.TrimSpace(req.Description),
		IsPrimary:   req.IsPrimary,
	}); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) DeleteCarrierVehicle(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int64)
	vehicleID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := h.Carriers.DeleteVehicle(r.Context(), p.ID, vehicleID); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}

func (h *Handlers) ModListCarriers(w http.ResponseWriter, r *http.Request) {
	items, err := h.Carriers.ListPendingModeration(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, carrierProfileDTO(r, item, h))
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}

func (h *Handlers) ModApproveCarrier(w http.ResponseWriter, r *http.Request) {
	providerID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.Carriers.SetStatus(r.Context(), providerID, domain.CarrierStatusPublished); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "published"})
}

func (h *Handlers) ModRejectCarrier(w http.ResponseWriter, r *http.Request) {
	providerID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.Carriers.SetStatus(r.Context(), providerID, domain.CarrierStatusSuspended); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "suspended"})
}

func (h *Handlers) ModVerifyCarrier(w http.ResponseWriter, r *http.Request) {
	providerID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	field := chi.URLParam(r, "field")
	var req struct {
		Status string `json:"status"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	status := req.Status
	if status == "" {
		status = domain.VerificationVerified
	}
	if err := h.Carriers.SetVerification(r.Context(), providerID, field, status); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) ensureCarrierProvider(r *http.Request, userID int64, req carrierProfileReq) (*domain.Provider, error) {
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil {
		return nil, err
	}
	if p != nil {
		if req.DisplayName != "" || req.Phone != "" {
			if req.DisplayName != "" {
				p.DisplayName = strings.TrimSpace(req.DisplayName)
			}
			if req.BusinessName != "" {
				p.BusinessName = strings.TrimSpace(req.BusinessName)
			}
			if req.Phone != "" {
				p.Phone = strings.TrimSpace(req.Phone)
			}
			if req.Email != "" {
				p.Email = strings.TrimSpace(req.Email)
			}
			if req.Telegram != "" {
				p.Telegram = strings.TrimSpace(req.Telegram)
			}
			if req.Whatsapp != "" {
				p.Whatsapp = strings.TrimSpace(req.Whatsapp)
			}
			if req.Viber != "" {
				p.Viber = strings.TrimSpace(req.Viber)
			}
			_ = h.Providers.UpdateProvider(r.Context(), p)
		}
		return p, nil
	}
	displayName := strings.TrimSpace(req.DisplayName)
	if displayName == "" {
		displayName = strings.TrimSpace(req.ContactPerson)
	}
	u, err := h.Users.GetByID(r.Context(), userID)
	if err != nil || u == nil {
		return nil, err
	}
	slug := strings.ToLower(u.Login)
	if !transportSlugRe.MatchString(slug) || displayName == "" {
		return nil, apperrors.ErrValidation
	}
	id, err := h.Providers.CreateProvider(r.Context(), userID, slug, displayName)
	if err != nil {
		return nil, err
	}
	_ = h.Users.AddRole(r.Context(), userID, domain.RoleProvider)
	p, err = h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		return &domain.Provider{ID: id, UserID: userID}, nil
	}
	p.BusinessName = strings.TrimSpace(req.BusinessName)
	p.Phone = strings.TrimSpace(req.Phone)
	p.Email = strings.TrimSpace(req.Email)
	p.Telegram = strings.TrimSpace(req.Telegram)
	p.Whatsapp = strings.TrimSpace(req.Whatsapp)
	p.Viber = strings.TrimSpace(req.Viber)
	_ = h.Providers.UpdateProvider(r.Context(), p)
	return p, nil
}

func carrierProfileDTO(r *http.Request, prof domain.CarrierProfile, h *Handlers) map[string]any {
	hasSub, _ := h.Providers.HasActiveSubscription(r.Context(), prof.ProviderID)
	dto := map[string]any{
		"provider_id":       prof.ProviderID,
		"carrier_type":      prof.CarrierType,
		"citizenship":       prof.Citizenship,
		"base_city_id":      prof.BaseCityID,
		"base_city_name":    prof.BaseCityName,
		"base_city_slug":    prof.BaseCitySlug,
		"about":             prof.About,
		"experience_years":  prof.ExperienceYears,
		"trips_count":       prof.TripsCount,
		"trust_level":       prof.TrustLevel,
		"identity_status":   prof.IdentityStatus,
		"ukrainian_status":  prof.UkrainianStatus,
		"business_status":   prof.BusinessStatus,
		"documents_status":  prof.DocumentsStatus,
		"hours_text":        prof.HoursText,
		"contact_person":    prof.ContactPerson,
		"status":            prof.Status,
		"display_name":      prof.DisplayName,
		"business_name":     prof.BusinessName,
		"website_slug":      prof.WebsiteSlug,
		"avatar_url":        prof.AvatarURL,
		"rating_avg":        prof.RatingAvg,
		"rating_count":      prof.RatingCount,
		"subscription_active": hasSub,
		"contacts_unlocked": hasSub,
		"verified_ukrainian": prof.UkrainianStatus == domain.VerificationVerified,
	}
	if hasSub {
		dto["phone"] = prof.Phone
		dto["email"] = prof.Email
		dto["telegram"] = prof.Telegram
		dto["whatsapp"] = prof.Whatsapp
		dto["viber"] = prof.Viber
	}
	if len(prof.Vehicles) > 0 {
		dto["vehicles"] = prof.Vehicles
	}
	if len(prof.Rides) > 0 {
		rides := make([]map[string]any, 0, len(prof.Rides))
		for _, ride := range prof.Rides {
			rides = append(rides, transportListingDTO(ride, hasSub))
		}
		dto["rides"] = rides
	}
	if len(prof.Reviews) > 0 {
		dto["reviews"] = prof.Reviews
	}
	return dto
}

func (h *Handlers) transportContactsUnlocked(r *http.Request, providerID int64) bool {
	ok, _ := h.Providers.HasActiveSubscription(r.Context(), providerID)
	return ok
}

func (h *Handlers) enrichTransportCarrierMeta(ctx context.Context, items []domain.TransportListing) map[int64]domain.CarrierProfile {
	if h.Carriers == nil || len(items) == 0 {
		return map[int64]domain.CarrierProfile{}
	}
	ids := make([]int64, 0, len(items))
	seen := map[int64]bool{}
	for _, item := range items {
		if !seen[item.ProviderID] {
			ids = append(ids, item.ProviderID)
			seen[item.ProviderID] = true
		}
	}
	meta, err := h.Carriers.GetCarrierMetaByProviderIDs(ctx, ids)
	if err != nil {
		return map[int64]domain.CarrierProfile{}
	}
	return meta
}
