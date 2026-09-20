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

func (h *Handlers) AdminListOfferings(w http.ResponseWriter, r *http.Request) {
	h.listOfferingsAdmin(w, r)
}

func (h *Handlers) ModListOfferings(w http.ResponseWriter, r *http.Request) {
	h.listOfferingsAdmin(w, r)
}

func (h *Handlers) listOfferingsAdmin(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status != "" && !domain.ValidOfferingStatus(status) {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	items, err := h.Providers.ListOfferingsAdmin(r.Context(), status)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) AdminUpdateOffering(w http.ResponseWriter, r *http.Request) {
	h.updateOfferingStatus(w, r, "OFFERING_ADMIN_UPDATE")
}

func (h *Handlers) ModUpdateOffering(w http.ResponseWriter, r *http.Request) {
	h.updateOfferingStatus(w, r, "OFFERING_MOD_UPDATE")
}

func (h *Handlers) updateOfferingStatus(w http.ResponseWriter, r *http.Request, action string) {
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || !domain.ValidOfferingStatus(req.Status) {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	offeringID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if offeringID <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := h.Providers.UpdateOfferingStatus(r.Context(), offeringID, req.Status); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	_ = h.Audit.Log(r.Context(), &actor, action, "offering", &offeringID, "", req.Status, r.RemoteAddr, r.UserAgent())
	items, _ := h.Providers.ListOfferingsAdmin(r.Context(), "")
	response.JSON(w, r, 200, map[string]any{"items": items})
}
