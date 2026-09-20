package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) ModListProviders(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	items, err := h.Providers.ListProvidersAdmin(r.Context(), status)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) ModUpdateProvider(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	providerID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if providerID <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := h.Providers.UpdateProviderStatus(r.Context(), providerID, req.Status); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	_ = h.Audit.Log(r.Context(), &actor, "PROVIDER_MOD_UPDATE", "provider", &providerID, "", req.Status, r.RemoteAddr, r.UserAgent())
	items, _ := h.Providers.ListProvidersAdmin(r.Context(), "")
	response.JSON(w, r, 200, map[string]any{"items": items})
}
