package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

var errRoleRevoked = apperrors.New("ROLE_REVOKED", "Роль знято адміністратором. Зверніться до підтримки.", 403)

// AdminSetUserRole — PUT /admin/users/{id}/roles: {"role": "ROLE_GUIDE", "enabled": true}.
// Керує лише ролями гіда, перевізника та автора оголошень.
func (h *Handlers) AdminSetUserRole(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Role    string `json:"role"`
		Enabled bool   `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if !postgres.IsAdminManagedRole(req.Role) {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "role must be ROLE_GUIDE, ROLE_CARRIER or ROLE_PROVIDER", 400))
		return
	}
	u, err := h.Users.GetByID(r.Context(), id)
	if err != nil || u == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := h.Users.SetRoleByAdmin(r.Context(), id, req.Role, req.Enabled); err != nil {
		h.Log.Warn("admin set user role failed", "user_id", id, "role", req.Role, "enabled", req.Enabled, "error", err)
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	action := "USER_ROLE_REMOVE"
	if req.Enabled {
		action = "USER_ROLE_ADD"
	}
	_ = h.Audit.Log(r.Context(), &actor, action, "user", &id, u.Login, req.Role, r.RemoteAddr, r.UserAgent())
	updated, err := h.Users.GetByID(r.Context(), id)
	if err != nil || updated == nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"id": updated.ID, "roles": updated.Roles})
}

// rejectIfRoleRevoked не дає самостійно повернути роль, яку зняв адміністратор.
func (h *Handlers) rejectIfRoleRevoked(w http.ResponseWriter, r *http.Request, userID int64, role string) bool {
	revoked, err := h.Users.IsRoleRevoked(r.Context(), userID, role)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return true
	}
	if revoked {
		response.Error(w, r, errRoleRevoked)
		return true
	}
	return false
}
