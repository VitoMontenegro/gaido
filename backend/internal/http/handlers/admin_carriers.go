package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) AdminListCarriers(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	items, err := h.Carriers.ListAdmin(r.Context(), status, 200)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, carrierProfileAdminDTO(r, item, h))
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}

func (h *Handlers) AdminUpdateCarrier(w http.ResponseWriter, r *http.Request) {
	providerID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if providerID <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	prof, err := h.Carriers.GetProfileByProviderID(r.Context(), providerID)
	if err != nil || prof == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		Status          string `json:"status"`
		IdentityStatus  string `json:"identity_status"`
		UkrainianStatus string `json:"ukrainian_status"`
		BusinessStatus  string `json:"business_status"`
		DocumentsStatus string `json:"documents_status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.Status != "" {
		switch req.Status {
		case domain.CarrierStatusDraft, domain.CarrierStatusPending, domain.CarrierStatusPublished, domain.CarrierStatusSuspended:
			if err := h.Carriers.SetStatus(r.Context(), providerID, req.Status); err != nil {
				response.Error(w, r, apperrors.ErrInternal)
				return
			}
		default:
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
	}
	for field, val := range map[string]string{
		"identity":  req.IdentityStatus,
		"ukrainian": req.UkrainianStatus,
		"business":  req.BusinessStatus,
		"documents": req.DocumentsStatus,
	} {
		if val == "" {
			continue
		}
		if err := h.Carriers.SetVerification(r.Context(), providerID, field, val); err != nil {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
	}
	prof, _ = h.Carriers.GetProfileByProviderID(r.Context(), providerID)
	actor := middleware.UserIDFromContext(r.Context())
	_ = h.Audit.Log(r.Context(), &actor, "CARRIER_ADMIN_UPDATE", "carrier", &providerID, prof.DisplayName, req.Status, r.RemoteAddr, r.UserAgent())
	response.JSON(w, r, 200, carrierProfileAdminDTO(r, *prof, h))
}

func (h *Handlers) AdminBypassCarrier(w http.ResponseWriter, r *http.Request) {
	providerID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if providerID <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	prof, err := h.Carriers.GetProfileByProviderID(r.Context(), providerID)
	if err != nil || prof == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		PlanID int64 `json:"plan_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	planID := req.PlanID
	if planID <= 0 {
		plans, err := h.Subs.ListPlansByType(r.Context(), domain.PlanTypeProviderPlacement)
		if err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		for _, p := range plans {
			if p.Code == "carrier-12m" {
				planID = p.ID
				break
			}
		}
		if planID <= 0 && len(plans) > 0 {
			planID = plans[0].ID
		}
	}
	if planID <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	starts := time.Now().UTC()
	expires := starts.AddDate(1, 0, 0)
	if err := h.Providers.ActivateSubscription(r.Context(), providerID, planID, starts, expires, nil, domain.ActivationAdminBypass); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	_ = h.Audit.Log(r.Context(), &actor, "CARRIER_BYPASS", "carrier", &providerID, prof.DisplayName, "", r.RemoteAddr, r.UserAgent())
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func carrierProfileAdminDTO(r *http.Request, prof domain.CarrierProfile, h *Handlers) map[string]any {
	dto := carrierProfileDTO(r, prof, h)
	dto["phone"] = prof.Phone
	dto["email"] = prof.Email
	dto["telegram"] = prof.Telegram
	dto["whatsapp"] = prof.Whatsapp
	dto["viber"] = prof.Viber
	dto["contacts_unlocked"] = true
	return dto
}
