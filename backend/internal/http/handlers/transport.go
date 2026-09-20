package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

var transportSlugRe = regexp.MustCompile(`^[a-z0-9-]+$`)

type transportListingReq struct {
	Kind             string                      `json:"kind"`
	CompanyName      string                      `json:"company_name"`
	DriverNames      string                      `json:"driver_names"`
	VehicleBrand     string                      `json:"vehicle_brand"`
	VehiclePhotoURL  string                      `json:"vehicle_photo_url"`
	Phone            string                      `json:"phone"`
	Email            string                      `json:"email"`
	Telegram         string                      `json:"telegram"`
	Whatsapp         string                      `json:"whatsapp"`
	Viber            string                      `json:"viber"`
	PriceAmount      float64                     `json:"price_amount"`
	PriceCurrency    string                      `json:"price_currency"`
	SeatsTotal       int                         `json:"seats_total"`
	ParcelsAccepted  bool                        `json:"parcels_accepted"`
	ParcelsTerms     string                      `json:"parcels_terms"`
	DepartTime       string                      `json:"depart_time"`
	ArriveTimeApprox string                      `json:"arrive_time_approx"`
	Status           string                      `json:"status"`
	Description      string                      `json:"description"`
	Stops            []domain.TransportStop      `json:"stops"`
	Departures       []domain.TransportDeparture `json:"departures"`
	ProviderSlug     string                      `json:"provider_slug"`
	ProviderName     string                      `json:"provider_name"`
}

func (h *Handlers) ListTransportRides(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	p := postgres.TransportSearchParams{}
	if v, err := strconv.ParseInt(q.Get("from_city_id"), 10, 64); err == nil {
		p.FromCityID = v
	}
	if v, err := strconv.ParseInt(q.Get("to_city_id"), 10, 64); err == nil {
		p.ToCityID = v
	}
	p.DateFrom = strings.TrimSpace(q.Get("date_from"))
	p.Kind = strings.TrimSpace(q.Get("kind"))
	if v, err := strconv.Atoi(q.Get("limit")); err == nil {
		p.Limit = v
	}
	if v, err := strconv.Atoi(q.Get("offset")); err == nil {
		p.Offset = v
	}
	p.CarrierType = strings.TrimSpace(q.Get("carrier_type"))
	p.VerifiedUkrainian = q.Get("verified_ukrainian") == "1" || q.Get("verified_ukrainian") == "true"

	items, total, err := h.Transport.Search(r.Context(), p)
	if err != nil {
		h.Log.Error("transport search failed", "error", err)
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	carrierMeta := h.enrichTransportCarrierMeta(r.Context(), items)
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		unlocked := h.transportContactsUnlockedForClient(r, item.ProviderID)
		dto := transportListingDTO(item, unlocked)
		if meta, ok := carrierMeta[item.ProviderID]; ok {
			dto["carrier_type"] = meta.CarrierType
			dto["verified_ukrainian"] = meta.UkrainianStatus == domain.VerificationVerified
		}
		out = append(out, dto)
	}
	response.JSON(w, r, 200, map[string]any{"items": out, "total": total})
}

func (h *Handlers) GetTransportRide(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	item, err := h.Transport.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if item == nil || item.Status != domain.TransportListingPublished {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	loggedIn := middleware.UserIDFromContext(r.Context()) > 0
	unlocked := h.transportContactsUnlockedForClient(r, item.ProviderID)
	hasSub, _ := h.Providers.HasActiveSubscription(r.Context(), item.ProviderID)
	dto := transportListingDTO(*item, unlocked)
	dto["subscription_active"] = hasSub
	dto["logged_in"] = loggedIn
	dto["description"] = item.Description
	if h.TransportBookings != nil {
		taken, _ := h.TransportBookings.CountActiveSeats(r.Context(), item.ID, nil)
		avail := item.SeatsTotal - taken
		if avail < 0 {
			avail = 0
		}
		dto["seats_available"] = avail
		dto["bookings_count"] = taken
	}
	if h.Carriers != nil {
		if meta, err := h.Carriers.GetProfileByProviderID(r.Context(), item.ProviderID); err == nil && meta != nil {
			dto["carrier_type"] = meta.CarrierType
			dto["verified_ukrainian"] = meta.UkrainianStatus == domain.VerificationVerified
		}
	}
	_ = loggedIn
	response.JSON(w, r, 200, dto)
}

func (h *Handlers) ListMyTransportRides(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if p == nil {
		response.JSON(w, r, 200, map[string]any{"items": []any{}})
		return
	}
	items, err := h.Transport.ListByProvider(r.Context(), p.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, transportListingDTO(item, true))
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}

func (h *Handlers) CreateTransportRide(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	var req transportListingReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	listing, err := h.parseTransportListingReq(req)
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if len(listing.Stops) < 2 {
		response.Error(w, r, apperrors.New("VALIDATION", "Маршрут має містити щонайменше 2 міста", 400))
		return
	}
	if listing.DriverNames == "" || listing.VehicleBrand == "" {
		response.Error(w, r, apperrors.New("VALIDATION", "Вкажіть водія та марку авто", 400))
		return
	}
	if listing.Phone == "" && listing.Telegram == "" && listing.Whatsapp == "" && listing.Viber == "" {
		response.Error(w, r, apperrors.New("VALIDATION", "Вкажіть хоча б один контакт для бронювання", 400))
		return
	}

	p, err := h.requireCarrierProfile(r, userID)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			response.Error(w, r, appErr)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	listing.ProviderID = p.ID
	if listing.Status == "" {
		listing.Status = domain.TransportListingPublished
	}
	id, err := h.Transport.Create(r.Context(), listing)
	if err != nil {
		h.Log.Error("create transport listing failed", "error", err)
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]any{"id": id})
}

func (h *Handlers) UpdateTransportRide(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req transportListingReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	listing, err := h.parseTransportListingReq(req)
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	listing.ID = id
	listing.ProviderID = p.ID
	if err := h.Transport.Update(r.Context(), listing); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) DeleteTransportRide(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := h.Transport.Delete(r.Context(), p.ID, id); err != nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}

func (h *Handlers) ModListTransportRides(w http.ResponseWriter, r *http.Request) {
	items, err := h.Transport.ListPendingModeration(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, transportListingDTO(item, true))
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}

func (h *Handlers) ModApproveTransportRide(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.Transport.SetStatus(r.Context(), id, domain.TransportListingPublished); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "published"})
}

func (h *Handlers) ModRejectTransportRide(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.Transport.SetStatus(r.Context(), id, domain.TransportListingRejected); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "rejected"})
}

func (h *Handlers) requireCarrierProfile(r *http.Request, userID int64) (*domain.Provider, error) {
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, apperrors.ErrCarrierProfileReq
	}
	prof, err := h.Carriers.GetProfileByProviderID(r.Context(), p.ID)
	if err != nil {
		return nil, err
	}
	if prof == nil {
		return nil, apperrors.ErrCarrierProfileReq
	}
	return p, nil
}

func (h *Handlers) parseTransportListingReq(req transportListingReq) (*domain.TransportListing, error) {
	kind := req.Kind
	if kind == "" {
		kind = domain.TransportKindRegular
	}
	if kind != domain.TransportKindRegular && kind != domain.TransportKindOccasional {
		return nil, apperrors.ErrValidation
	}
	currency := strings.TrimSpace(req.PriceCurrency)
	if currency == "" {
		currency = "EUR"
	}
	departTime := strings.TrimSpace(req.DepartTime)
	if departTime == "" {
		departTime = "08:00"
	}
	status := strings.TrimSpace(req.Status)
	if status == "" {
		status = domain.TransportListingPublished
	}
	seats := req.SeatsTotal
	if seats <= 0 {
		seats = 1
	}
	stops := make([]domain.TransportStop, 0, len(req.Stops))
	for i, s := range req.Stops {
		order := s.SortOrder
		if order <= 0 {
			order = i + 1
		}
		stops = append(stops, domain.TransportStop{CityID: s.CityID, SortOrder: order})
	}
	return &domain.TransportListing{
		Kind:             kind,
		CompanyName:      strings.TrimSpace(req.CompanyName),
		DriverNames:      strings.TrimSpace(req.DriverNames),
		VehicleBrand:     strings.TrimSpace(req.VehicleBrand),
		VehiclePhotoURL:  strings.TrimSpace(req.VehiclePhotoURL),
		Phone:            strings.TrimSpace(req.Phone),
		Email:            strings.TrimSpace(req.Email),
		Telegram:         strings.TrimSpace(req.Telegram),
		Whatsapp:         strings.TrimSpace(req.Whatsapp),
		Viber:            strings.TrimSpace(req.Viber),
		PriceAmount:      req.PriceAmount,
		PriceCurrency:    currency,
		SeatsTotal:       seats,
		ParcelsAccepted:  req.ParcelsAccepted,
		ParcelsTerms:     strings.TrimSpace(req.ParcelsTerms),
		DepartTime:       departTime,
		ArriveTimeApprox: strings.TrimSpace(req.ArriveTimeApprox),
		Status:           status,
		Description:      strings.TrimSpace(req.Description),
		Stops:            stops,
		Departures:       req.Departures,
	}, nil
}

func transportListingDTO(item domain.TransportListing, contactsUnlocked bool) map[string]any {
	dto := map[string]any{
		"id":                  item.ID,
		"provider_id":         item.ProviderID,
		"kind":                item.Kind,
		"company_name":        item.CompanyName,
		"driver_names":        item.DriverNames,
		"vehicle_brand":       item.VehicleBrand,
		"vehicle_photo_url":   item.VehiclePhotoURL,
		"price_amount":        item.PriceAmount,
		"price_currency":      item.PriceCurrency,
		"seats_total":         item.SeatsTotal,
		"parcels_accepted":    item.ParcelsAccepted,
		"parcels_terms":       item.ParcelsTerms,
		"depart_time":         item.DepartTime,
		"arrive_time_approx":  item.ArriveTimeApprox,
		"status":              item.Status,
		"provider_name":       item.ProviderName,
		"provider_slug":       item.ProviderSlug,
		"contacts_unlocked":   contactsUnlocked,
		"subscription_active": contactsUnlocked,
		"stops":               item.Stops,
		"departures":          item.Departures,
	}
	if contactsUnlocked {
		dto["phone"] = item.Phone
		dto["email"] = item.Email
		dto["telegram"] = item.Telegram
		dto["whatsapp"] = item.Whatsapp
		dto["viber"] = item.Viber
	}
	return dto
}
