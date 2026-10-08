package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) AdminListProviders(w http.ResponseWriter, r *http.Request) {
	h.listProvidersAdmin(w, r)
}

func (h *Handlers) ModListProviders(w http.ResponseWriter, r *http.Request) {
	h.listProvidersAdmin(w, r)
}

func (h *Handlers) listProvidersAdmin(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status != "" && !domain.ValidProviderStatus(status) {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	items, err := h.Providers.ListProvidersAdmin(r.Context(), status)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) AdminUpdateProvider(w http.ResponseWriter, r *http.Request) {
	h.updateProviderStatus(w, r, "PROVIDER_ADMIN_UPDATE")
}

func (h *Handlers) ModUpdateProvider(w http.ResponseWriter, r *http.Request) {
	h.updateProviderStatus(w, r, "PROVIDER_MOD_UPDATE")
}

func (h *Handlers) updateProviderStatus(w http.ResponseWriter, r *http.Request, action string) {
	var req struct {
		Status        string `json:"status"`
		PrimaryCityID *int64 `json:"primary_city_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	hasCity := req.PrimaryCityID != nil && *req.PrimaryCityID > 0
	if req.Status == "" && !hasCity {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.Status != "" && !domain.ValidProviderStatus(req.Status) {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	providerID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if providerID <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if req.Status != "" {
		if err := h.Providers.UpdateProviderStatus(r.Context(), providerID, req.Status); err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
	}
	if hasCity {
		city, err := h.Geo.GetCityByID(r.Context(), *req.PrimaryCityID)
		if err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		if city == nil {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
		if err := h.Providers.SetPrimaryCity(r.Context(), providerID, *req.PrimaryCityID); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				response.Error(w, r, apperrors.ErrNotFound)
				return
			}
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
	}
	actor := middleware.UserIDFromContext(r.Context())
	detail := req.Status
	if hasCity {
		if detail != "" {
			detail += " "
		}
		detail += "city"
	}
	_ = h.Audit.Log(r.Context(), &actor, action, "provider", &providerID, "", detail, r.RemoteAddr, r.UserAgent())
	items, _ := h.Providers.ListProvidersAdmin(r.Context(), "")
	response.JSON(w, r, 200, map[string]any{"items": items})
}
