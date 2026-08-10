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
	h.adminApproveGuide(w, r)
}
func (h *Handlers) AdminApproveGuide(w http.ResponseWriter, r *http.Request) {
	h.adminApproveGuide(w, r)
}
func (h *Handlers) adminApproveGuide(w http.ResponseWriter, r *http.Request) {
	gid, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if gid <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	g, err := h.Guides.GetByID(r.Context(), gid)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if g.Status == domain.GuideStatusActive {
		response.JSON(w, r, 200, map[string]any{"status": g.Status, "id": gid})
		return
	}
	var req struct {
		PlanID int64 `json:"plan_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	planID := req.PlanID
	if planID == 0 {
		plans, err := h.Subs.ListPlansByType(r.Context(), domain.PlanTypeGuidePlacement)
		if err != nil || len(plans) == 0 {
			response.Error(w, r, apperrors.New("PLAN_NOT_FOUND", "guide placement plan not found", 400))
			return
		}
		planID = plans[0].ID
	}
	actor := middleware.UserIDFromContext(r.Context())
	if err := h.Billing.AdminApproveGuide(r.Context(), gid, planID, actor); err != nil {
		response.Error(w, r, err)
		return
	}
	_ = h.Audit.Log(r.Context(), &actor, "GUIDE_ADMIN_APPROVE", "guide", &gid, g.Status, domain.GuideStatusActive, r.RemoteAddr, r.UserAgent())
	response.JSON(w, r, 200, map[string]any{"status": domain.GuideStatusActive, "id": gid})
}
