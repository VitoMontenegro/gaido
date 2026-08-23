package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) ListCarrierBillingPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.Subs.ListPlansByType(r.Context(), domain.PlanTypeProviderPlacement)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": plans})
}

func (h *Handlers) GetCarrierBillingStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	enabled, _ := h.Billing.PaymentsEnabled(r.Context())
	out := map[string]any{"payments_enabled": enabled, "subscription": nil}
	if p != nil {
		sub, _ := h.Providers.GetActiveSubscription(r.Context(), p.ID)
		out["subscription"] = sub
		out["subscription_active"], _ = h.Providers.HasActiveSubscription(r.Context(), p.ID)
	}
	response.JSON(w, r, 200, out)
}

func (h *Handlers) CarrierBillingCheckout(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())
	var req struct {
		PlanID int64 `json:"plan_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlanID == 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.New("VALIDATION", "Спочатку створіть профіль перевізника", 400))
		return
	}
	plan, err := h.Subs.GetPlan(r.Context(), req.PlanID)
	if err != nil || plan == nil || plan.PlanType != domain.PlanTypeProviderPlacement {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	enabled, err := h.Billing.PaymentsEnabled(r.Context())
	if err != nil || !enabled {
		response.Error(w, r, apperrors.New("PAYMENTS_DISABLED", "Оплата вимкнена", 400))
		return
	}
	pid, err := h.Payments.Create(r.Context(), userID, domain.PaymentPurposeProviderPlacement, plan.Price, plan.Currency, map[string]any{
		"plan_id":     req.PlanID,
		"provider_id": p.ID,
	})
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{
		"payment_id": pid,
		"confirm_url": "/api/v1/account/carrier/billing/confirm/" + strconv.FormatInt(pid, 10) + "?plan_id=" + strconv.FormatInt(req.PlanID, 10),
	})
}

func (h *Handlers) CarrierBillingConfirm(w http.ResponseWriter, r *http.Request) {
	if !h.Cfg.PaymentStubEnabled {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	userID := middleware.UserIDFromContext(r.Context())
	paymentID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	planID, _ := strconv.ParseInt(r.URL.Query().Get("plan_id"), 10, 64)
	p, err := h.Providers.GetProviderByUserID(r.Context(), userID)
	if err != nil || p == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	plan, err := h.Subs.GetPlan(r.Context(), planID)
	if err != nil || plan == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	starts := time.Now().UTC()
	expires := starts.AddDate(0, 0, plan.DurationDays)
	if err := h.Providers.ActivateSubscription(r.Context(), p.ID, planID, starts, expires, &paymentID, "PAYMENT"); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "activated"})
}
