package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) GetProviderAccount(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if p == nil || !roleProvider(r.Context()) {
		out := map[string]any{"profile": nil}
		if hint := identityHintDTO(h.identityHint(r.Context(), userID, "provider")); hint != nil {
			out["identity_hint"] = hint
		}
		response.JSON(w, r, 200, out)
		return
	}
	offerings, _ := h.Providers.ListOfferingsByProvider(r.Context(), p.ID, false)
	if offerings == nil {
		offerings = []domain.ServiceOffering{}
	}
	points, _ := h.Providers.ListPointsByProvider(r.Context(), p.ID)
	if points == nil {
		points = []domain.ServicePoint{}
	}
	response.JSON(w, r, 200, map[string]any{"profile": p, "offerings": offerings, "points": points})
}

func (h *Handlers) RegisterProvider(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	existing, _ := h.Providers.GetProviderByUserID(r.Context(), userID)
	if existing != nil && roleProvider(r.Context()) {
		response.Error(w, r, apperrors.ErrConflict)
		return
	}
	var req struct {
		DisplayName string `json:"display_name"`
		Slug        string `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	req.Slug = strings.ToLower(strings.TrimSpace(req.Slug))
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	if req.DisplayName == "" {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "display_name is required", 400))
		return
	}
	exceptID := int64(0)
	if existing != nil {
		exceptID = existing.ID
	}
	slug, err := h.uniqueProviderSlug(r.Context(), req.Slug, req.DisplayName, exceptID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	if existing != nil {
		existing.DisplayName = req.DisplayName
		existing.WebsiteSlug = slug
		if err := h.Providers.UpdateProvider(r.Context(), existing); err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		_ = h.Users.AddRole(r.Context(), userID, domain.RoleProvider)
		response.JSON(w, r, 201, map[string]any{"id": existing.ID, "website_slug": slug})
		return
	}
	id, err := h.Providers.CreateProvider(r.Context(), userID, slug, req.DisplayName)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	_ = h.Users.AddRole(r.Context(), userID, domain.RoleProvider)
	response.JSON(w, r, 201, map[string]any{"id": id, "website_slug": slug})
}

func (h *Handlers) UpdateProviderAccount(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil || !roleProvider(r.Context()) {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req domain.Provider
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if dn := strings.TrimSpace(req.DisplayName); dn != "" {
		p.DisplayName = dn
	}
	if p.DisplayName == "" {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "display_name is required", 400))
		return
	}
	slug, err := h.uniqueProviderSlug(r.Context(), req.WebsiteSlug, p.DisplayName, p.ID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	p.WebsiteSlug = slug
	if req.BusinessName != "" {
		p.BusinessName = req.BusinessName
	}
	if req.Profession != "" {
		p.Profession = req.Profession
	}
	if req.About != "" {
		p.About = req.About
	}
	if req.AvatarURL != "" {
		p.AvatarURL = req.AvatarURL
	}
	if req.ResponseHours != "" {
		p.ResponseHours = req.ResponseHours
	}
	if req.Phone != "" {
		p.Phone = req.Phone
	}
	if req.Email != "" {
		p.Email = req.Email
	}
	if req.Telegram != "" {
		p.Telegram = req.Telegram
	}
	if req.Whatsapp != "" {
		p.Whatsapp = req.Whatsapp
	}
	if req.Viber != "" {
		p.Viber = req.Viber
	}
	if req.Instagram != "" {
		p.Instagram = req.Instagram
	}
	if req.Facebook != "" {
		p.Facebook = req.Facebook
	}
	if req.Website != "" {
		p.Website = req.Website
	}
	if req.PrimaryCityID != nil {
		p.PrimaryCityID = req.PrimaryCityID
	}
	if len(req.Languages) > 0 {
		p.Languages = req.Languages
	}
	if err := h.Providers.UpdateProvider(r.Context(), p); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"status": "ok", "website_slug": slug, "display_name": p.DisplayName})
}

func (h *Handlers) UpsertProviderOffering(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var o domain.ServiceOffering
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	o.ProviderID = p.ID
	if o.Title == "" || o.CategoryID == 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if o.Slug == "" {
		o.Slug = slugify(o.Title)
	}
	if o.Status == "" {
		o.Status = domain.OfferingStatusDraft
	}
	id, err := h.Providers.UpsertOffering(r.Context(), &o)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"id": id})
}

func (h *Handlers) UpsertProviderPoint(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	count, _ := h.Providers.CountActivePoints(r.Context(), p.ID)
	paymentsOn, _ := h.Settings.GetBool(r.Context(), "guide_placement_payments_enabled", false)
	hasSub, _ := h.Providers.HasActiveSubscription(r.Context(), p.ID)
	if paymentsOn && !hasSub && count >= 1 {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	var pt domain.ServicePoint
	if err := json.NewDecoder(r.Body).Decode(&pt); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	pt.ProviderID = p.ID
	if pt.Label == "" {
		pt.Label = strings.TrimSpace(pt.AddressText)
	}
	if pt.Label == "" {
		pt.Label = strings.TrimSpace(pt.District)
	}
	if pt.Label == "" || (pt.Latitude == 0 && pt.Longitude == 0) {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if pt.AddressVisibility == "" {
		pt.AddressVisibility = domain.AddressDistrict
	}
	id, err := h.Providers.UpsertPoint(r.Context(), &pt)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"id": id})
}

func (h *Handlers) LinkOfferingPoint(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		OfferingID int64 `json:"offering_id"`
		PointID    int64 `json:"point_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if err := h.Providers.LinkOfferingPoint(r.Context(), req.OfferingID, req.PointID); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) UpsertProviderZone(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var z domain.ServiceZone
	if err := json.NewDecoder(r.Body).Decode(&z); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	z.ProviderID = p.ID
	if z.ZoneKind == domain.ZoneKindTransport {
		allowed := map[string]bool{domain.ZoneTypeCity: true, domain.ZoneTypeCitySuburbs: true, domain.ZoneTypeRegion: true, domain.ZoneTypeIntercity: true}
		if !allowed[z.ZoneType] {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
	}
	id, err := h.Providers.UpsertZone(r.Context(), &z)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"id": id})
}

func (h *Handlers) CreateServiceSuggestion(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		Title             string `json:"title"`
		Description       string `json:"description"`
		CategoryID        *int64 `json:"category_id"`
		SuggestedCategory string `json:"suggested_category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Title == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	id, err := h.Providers.CreateSuggestion(r.Context(), p.ID, req.Title, req.Description, req.CategoryID, req.SuggestedCategory)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]any{"id": id, "status": "pending"})
}

func (h *Handlers) CreatePlatformReview(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	var req struct {
		TargetType string `json:"target_type"`
		TargetID   int64  `json:"target_id"`
		Rating     int    `json:"rating"`
		Body       string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Rating < 1 || req.Rating > 5 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.TargetType != domain.ReviewTargetOffering && req.TargetType != domain.ReviewTargetProvider {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if err := h.Providers.CreatePlatformReview(r.Context(), userID, req.TargetType, req.TargetID, req.Rating, req.Body); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]string{"status": "ok"})
}

func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "'", "")
	return s
}
