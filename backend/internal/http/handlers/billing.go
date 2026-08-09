package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) ListPlans(w http.ResponseWriter, r *http.Request) {
	planType := r.URL.Query().Get("type")
	var (
		plans []domain.SubscriptionPlan
		err   error
	)
	if planType != "" {
		plans, err = h.Subs.ListPlansByType(r.Context(), planType)
	} else {
		plans, err = h.Subs.ListPlans(r.Context())
	}
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": plans})
}
func (h *Handlers) GetBillingStatus(w http.ResponseWriter, r *http.Request) {
	status, err := h.Billing.BillingStatus(r.Context(), middleware.UserIDFromContext(r.Context()))
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, status)
}
func (h *Handlers) Checkout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PlanID      int64  `json:"plan_id"`
		ExcursionID *int64 `json:"excursion_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlanID == 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	pid, err := h.Billing.Checkout(r.Context(), middleware.UserIDFromContext(r.Context()), req.PlanID, req.ExcursionID)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]any{"payment_id": pid, "confirm_url": "/api/v1/payments/" + strconv.FormatInt(pid, 10) + "/confirm?plan_id=" + strconv.FormatInt(req.PlanID, 10)})
}
func (h *Handlers) GuideConfirmPayment(w http.ResponseWriter, r *http.Request) {
	if !h.Cfg.PaymentStubEnabled {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	planID, _ := strconv.ParseInt(r.URL.Query().Get("plan_id"), 10, 64)
	caller := middleware.UserIDFromContext(r.Context())
	if err := h.Billing.ConfirmPayment(r.Context(), id, planID, caller, true); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "activated"})
}
func (h *Handlers) ConfirmPayment(w http.ResponseWriter, r *http.Request) {
	if !h.Cfg.PaymentStubEnabled && !hasRole(r.Context(), domain.RoleAdmin) {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	planID, _ := strconv.ParseInt(r.URL.Query().Get("plan_id"), 10, 64)
	caller := middleware.UserIDFromContext(r.Context())
	if err := h.Billing.ConfirmPayment(r.Context(), id, planID, caller, false); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "activated"})
}
func (h *Handlers) GetSubscription(w http.ResponseWriter, r *http.Request) {
	g, err := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	sub, _ := h.Subs.GetActive(r.Context(), g.ID)
	response.JSON(w, r, 200, map[string]any{"subscription": sub})
}
func (h *Handlers) AdminBypass(w http.ResponseWriter, r *http.Request) {
	gid, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		PlanID int64 `json:"plan_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if err := h.Billing.AdminBypass(r.Context(), gid, req.PlanID, middleware.UserIDFromContext(r.Context())); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "activated"})
}
