package handlers

import (
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

func discoverParamsFromRequest(r *http.Request) postgres.DiscoverParams {
	q := r.URL.Query()
	p := postgres.DiscoverParams{
		Query:        strings.TrimSpace(q.Get("q")),
		CategorySlug: q.Get("category"),
		ServiceSlug:  q.Get("service"),
		Format:       q.Get("format"),
		ZoneFilter:   q.Get("zone"),
		Section:      q.Get("section"),
		SortNearest:  q.Get("sort") == "nearest",
	}
	if v, err := strconv.ParseInt(q.Get("city_id"), 10, 64); err == nil {
		p.CityID = v
	}
	if v, err := strconv.ParseInt(q.Get("region_id"), 10, 64); err == nil {
		p.RegionID = v
	}
	if v, err := strconv.ParseFloat(q.Get("lat"), 64); err == nil {
		p.Lat = v
	}
	if v, err := strconv.ParseFloat(q.Get("lng"), 64); err == nil {
		p.Lng = v
	}
	if v, err := strconv.Atoi(q.Get("radius_km")); err == nil {
		p.RadiusKm = v
	}
	if v, err := strconv.ParseFloat(q.Get("min_rating"), 64); err == nil {
		p.MinRating = v
	}
	p.VerifiedOnly = q.Get("verified") == "1"
	p.HasAvailability = q.Get("availability") == "1"
	if v, err := strconv.Atoi(q.Get("limit")); err == nil {
		p.Limit = v
	}
	if v, err := strconv.Atoi(q.Get("offset")); err == nil {
		p.Offset = v
	}
	return p
}

func (h *Handlers) ListDiscover(w http.ResponseWriter, r *http.Request) {
	p := discoverParamsFromRequest(r)
	items, total, err := h.Providers.Discover(r.Context(), p)
	if err != nil {
		h.Log.Error("discover failed", "error", err)
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	paymentsOn, _ := h.Settings.GetBool(r.Context(), "guide_placement_payments_enabled", false)
	out := make([]map[string]any, 0, len(items))
	for _, row := range items {
		out = append(out, h.discoverRowDTO(r, row, paymentsOn))
	}
	response.JSON(w, r, 200, map[string]any{"items": out, "total": total})
}

func (h *Handlers) ListDiscoverMapPoints(w http.ResponseWriter, r *http.Request) {
	p := discoverParamsFromRequest(r)
	items, err := h.Providers.DiscoverMapPoints(r.Context(), p)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.DiscoverMapPoint{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) discoverRowDTO(r *http.Request, row domain.DiscoverOfferingRow, paymentsOn bool) map[string]any {
	contactsUnlocked := !paymentsOn
	if paymentsOn {
		ok, _ := h.Providers.HasActiveSubscription(r.Context(), row.Provider.ID)
		contactsUnlocked = ok
	}
	// Never expose user geolocation to providers via public API
	pub := map[string]any{
		"id":               row.Offering.ID,
		"title":            row.Offering.Title,
		"slug":             row.Offering.Slug,
		"description":      row.Offering.Description,
		"formats":          row.Offering.Formats,
		"languages":        row.Offering.Languages,
		"has_availability": row.Offering.HasAvailability,
		"rating_avg":       row.Offering.RatingAvg,
		"rating_count":     row.Offering.RatingCount,
		"category_name":    row.CategoryName,
		"category_slug":    row.CategorySlug,
		"service_name":     row.ServiceName,
		"city_name":        row.CityName,
		"point_label":      row.PointLabel,
		"point_district":   row.PointDistrict,
		"distance_km":      row.DistanceKm,
		"has_verified_docs": row.HasVerifiedDocs,
		"provider": map[string]any{
			"id":             row.Provider.ID,
			"display_name":   row.Provider.DisplayName,
			"business_name":  row.Provider.BusinessName,
			"website_slug":   row.Provider.WebsiteSlug,
			"avatar_url":     row.Provider.AvatarURL,
			"response_hours": row.Provider.ResponseHours,
			"status":         row.Provider.Status,
			"rating_avg":     row.Provider.RatingAvg,
			"rating_count":   row.Provider.RatingCount,
		},
		"contacts_unlocked": contactsUnlocked,
	}
	return pub
}

func (h *Handlers) ListServiceCategories(w http.ResponseWriter, r *http.Request) {
	items, err := h.Providers.ListCategories(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) ListCategoryServices(w http.ResponseWriter, r *http.Request) {
	cat, err := h.Providers.GetCategoryBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || cat == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	items, err := h.Providers.ListServicesByCategory(r.Context(), cat.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"category": cat, "items": items})
}

func (h *Handlers) GeoReverse(w http.ResponseWriter, r *http.Request) {
	lat, err1 := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	lng, err2 := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
	if err1 != nil || err2 != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	c, err := h.Providers.ReverseGeocodeCity(r.Context(), lat, lng)
	if err != nil || c == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, c)
}

func (h *Handlers) GeoNearbyCities(w http.ResponseWriter, r *http.Request) {
	cityID, err := strconv.ParseInt(r.URL.Query().Get("city_id"), 10, 64)
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	radius, _ := strconv.Atoi(r.URL.Query().Get("radius_km"))
	items, err := h.Providers.NearbyCities(r.Context(), cityID, radius)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) ListRegions(w http.ResponseWriter, r *http.Request) {
	country, err := h.Geo.GetCountryBySlug(r.Context(), chi.URLParam(r, "country"))
	if err != nil || country == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	items, err := h.Providers.ListRegionsByCountry(r.Context(), country.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) GetProviderPublic(w http.ResponseWriter, r *http.Request) {
	p, err := h.Providers.GetProviderBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || p == nil || p.Status == domain.ProviderStatusBlocked {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if p.Status != domain.ProviderStatusVerified && p.Status != domain.ProviderStatusModeration {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	offerings, _ := h.Providers.ListOfferingsByProvider(r.Context(), p.ID, true)
	points, _ := h.Providers.ListPointsByProvider(r.Context(), p.ID)
	hasDocs, _ := h.Providers.HasVerifiedDocs(r.Context(), p.ID)

	paymentsOn, _ := h.Settings.GetBool(r.Context(), "guide_placement_payments_enabled", false)
	contactsUnlocked := !paymentsOn
	if paymentsOn {
		ok, _ := h.Providers.HasActiveSubscription(r.Context(), p.ID)
		contactsUnlocked = ok
	}

	dto := map[string]any{
		"id": p.ID, "display_name": p.DisplayName, "business_name": p.BusinessName,
		"profession": p.Profession, "about": p.About, "website_slug": p.WebsiteSlug,
		"avatar_url": p.AvatarURL, "rating_avg": p.RatingAvg, "rating_count": p.RatingCount,
		"response_hours": p.ResponseHours, "status": p.Status, "languages": p.Languages,
		"has_verified_docs": hasDocs, "offerings": offerings, "points": points,
		"contacts_unlocked": contactsUnlocked,
	}
	if contactsUnlocked {
		dto["phone"] = p.Phone
		dto["email"] = p.Email
		dto["telegram"] = p.Telegram
		dto["whatsapp"] = p.Whatsapp
		dto["viber"] = p.Viber
		dto["instagram"] = p.Instagram
		dto["facebook"] = p.Facebook
		dto["website"] = p.Website
	}
	response.JSON(w, r, 200, dto)
}

func (h *Handlers) ListJobs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var cityID, regionID int64
	if v, err := strconv.ParseInt(q.Get("city_id"), 10, 64); err == nil {
		cityID = v
	}
	if v, err := strconv.ParseInt(q.Get("region_id"), 10, 64); err == nil {
		regionID = v
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	items, total, err := h.Jobs.ListJobs(r.Context(), cityID, regionID, limit, offset)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items, "total": total})
}

func (h *Handlers) ListLookingRequests(w http.ResponseWriter, r *http.Request) {
	cityID, _ := strconv.ParseInt(r.URL.Query().Get("city_id"), 10, 64)
	items, err := h.Looking.ListRequests(r.Context(), cityID, 50)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) CreateLookingRequest(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int64)
	var req struct {
		CityID      *int64   `json:"city_id"`
		RegionID    *int64   `json:"region_id"`
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Formats     []string `json:"formats"`
		Languages   []string `json:"languages"`
		NeededDate  *string  `json:"needed_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Title) == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	lr := &domain.LookingRequest{
		AuthorID: userID, CityID: req.CityID, RegionID: req.RegionID,
		Title: req.Title, Description: req.Description, Formats: req.Formats, Languages: req.Languages,
	}
	if len(lr.Languages) == 0 {
		lr.Languages = []string{"uk"}
	}
	id, err := h.Looking.CreateRequest(r.Context(), lr)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]any{"id": id})
}

func (h *Handlers) RespondLookingRequest(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int64)
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	reqID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	var body struct {
		Message          string   `json:"message"`
		OfferingID       *int64   `json:"offering_id"`
		AvailabilityNote string   `json:"availability_note"`
		Formats          []string `json:"formats"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	resp := &domain.LookingResponse{
		RequestID: reqID, ProviderID: p.ID, Message: body.Message,
		OfferingID: body.OfferingID, AvailabilityNote: body.AvailabilityNote, Formats: body.Formats,
	}
	id, err := h.Looking.CreateResponse(r.Context(), resp)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]any{"id": id})
}
