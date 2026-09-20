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

func (h *Handlers) AdminListComplaints(w http.ResponseWriter, r *http.Request) {
	h.listComplaintsAdmin(w, r)
}

func (h *Handlers) ModListComplaints(w http.ResponseWriter, r *http.Request) {
	h.listComplaintsAdmin(w, r)
}

func (h *Handlers) listComplaintsAdmin(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status != "" && !domain.ValidComplaintStatus(status) {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	items, err := h.Providers.ListComplaintsAdmin(r.Context(), status)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) AdminUpdateComplaint(w http.ResponseWriter, r *http.Request) {
	h.updateComplaintStatus(w, r, "COMPLAINT_ADMIN_UPDATE")
}

func (h *Handlers) ModUpdateComplaint(w http.ResponseWriter, r *http.Request) {
	h.updateComplaintStatus(w, r, "COMPLAINT_MOD_UPDATE")
}

func (h *Handlers) updateComplaintStatus(w http.ResponseWriter, r *http.Request, action string) {
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || !domain.ValidComplaintStatus(req.Status) {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	complaintID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if complaintID <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := h.Providers.UpdateComplaintStatus(r.Context(), complaintID, req.Status); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	_ = h.Audit.Log(r.Context(), &actor, action, "complaint", &complaintID, "", req.Status, r.RemoteAddr, r.UserAgent())
	items, _ := h.Providers.ListComplaintsAdmin(r.Context(), "")
	response.JSON(w, r, 200, map[string]any{"items": items})
}
