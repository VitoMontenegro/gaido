package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

type transportBookingReq struct {
	ListingID      int64  `json:"listing_id"`
	DepartureID    *int64 `json:"departure_id"`
	Seats          int    `json:"seats"`
	PassengerName  string `json:"passenger_name"`
	PassengerPhone string `json:"passenger_phone"`
	PassengerEmail string `json:"passenger_email"`
	Comment        string `json:"comment"`
}

func (h *Handlers) CreateTransportBooking(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	var req transportBookingReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.ListingID <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	seats := req.Seats
	if seats <= 0 {
		seats = 1
	}
	name := strings.TrimSpace(req.PassengerName)
	phone := strings.TrimSpace(req.PassengerPhone)
	if name == "" || phone == "" {
		response.Error(w, r, apperrors.New("VALIDATION", "Вкажіть ім'я та телефон", 400))
		return
	}

	listing, err := h.Transport.GetByID(r.Context(), req.ListingID)
	if err != nil || listing == nil || listing.Status != domain.TransportListingPublished {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	taken, err := h.TransportBookings.CountActiveSeats(r.Context(), req.ListingID, req.DepartureID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	capacity := listing.SeatsTotal
	if req.DepartureID != nil && *req.DepartureID > 0 {
		for _, d := range listing.Departures {
			if d.ID == *req.DepartureID && d.SeatsLeft != nil {
				capacity = *d.SeatsLeft
				break
			}
		}
	}
	if taken+seats > capacity {
		response.Error(w, r, apperrors.New("VALIDATION", "Недостатньо вільних місць", 400))
		return
	}

	id, err := h.TransportBookings.Create(r.Context(), domain.TransportBooking{
		ListingID:      req.ListingID,
		DepartureID:    req.DepartureID,
		UserID:         userID,
		ProviderID:     listing.ProviderID,
		Seats:          seats,
		PassengerName:  name,
		PassengerPhone: phone,
		PassengerEmail: strings.TrimSpace(req.PassengerEmail),
		Comment:        strings.TrimSpace(req.Comment),
		Status:         domain.TransportBookingPending,
	})
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]any{"id": id, "status": domain.TransportBookingPending})
}

func (h *Handlers) ListMyTransportBookings(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	items, err := h.TransportBookings.ListByUser(r.Context(), userID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.TransportBooking{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) ListIncomingTransportBookings(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.JSON(w, r, 200, map[string]any{"items": []any{}})
		return
	}
	items, err := h.TransportBookings.ListByProviderID(r.Context(), p.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.TransportBooking{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) UpdateTransportBookingStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	status := strings.TrimSpace(req.Status)
	if status != domain.TransportBookingConfirmed && status != domain.TransportBookingCancelled && status != domain.TransportBookingCompleted {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := h.TransportBookings.SetStatus(r.Context(), id, p.ID, status); err != nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": status})
}

func (h *Handlers) GetTransportRideCompanions(w http.ResponseWriter, r *http.Request) {
	listingID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var departureID *int64
	if v, err := strconv.ParseInt(r.URL.Query().Get("departure_id"), 10, 64); err == nil && v > 0 {
		departureID = &v
	}
	items, err := h.TransportBookings.ListCompanions(r.Context(), listingID, departureID, 20)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	taken, _ := h.TransportBookings.CountActiveSeats(r.Context(), listingID, departureID)
	response.JSON(w, r, 200, map[string]any{"items": items, "seats_taken": taken})
}

func (h *Handlers) GetTransportBooking(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	b, err := h.TransportBookings.GetByID(r.Context(), id)
	if err != nil || b == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	p, _ := h.Providers.GetProviderByUserID(r.Context(), userID)
	if b.UserID != userID && (p == nil || b.ProviderID != p.ID) {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	response.JSON(w, r, 200, b)
}

func (h *Handlers) transportContactsUnlockedForClient(r *http.Request, providerID int64) bool {
	return h.transportContactsUnlocked(r, providerID)
}
