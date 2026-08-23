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

func (h *Handlers) AdminListTransportRides(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	items, err := h.Transport.ListAdmin(r.Context(), status, 200)
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

func (h *Handlers) AdminUpdateTransportRide(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if id <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Status == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	switch req.Status {
	case domain.TransportListingDraft, domain.TransportListingPending,
		domain.TransportListingPublished, domain.TransportListingRejected:
	default:
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if err := h.Transport.SetStatus(r.Context(), id, req.Status); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	_ = h.Audit.Log(r.Context(), &actor, "TRANSPORT_ADMIN_UPDATE", "transport_listing", &id, "", req.Status, r.RemoteAddr, r.UserAgent())
	response.JSON(w, r, 200, map[string]string{"status": req.Status})
}
