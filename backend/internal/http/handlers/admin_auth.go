package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) AdminClearLoginRateLimit(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Login string `json:"login"`
		IP    string `json:"ip"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	login := strings.TrimSpace(req.Login)
	ip := strings.TrimSpace(req.IP)
	if login == "" && ip == "" {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "login or ip is required", 400))
		return
	}

	loginCleared := false
	ipCleared := false
	if login != "" {
		loginCleared = middleware.ClearLoginRateLimit(login)
	}
	if ip != "" {
		ipCleared = middleware.ClearIPRateLimit(ip)
	}

	detail := strings.TrimSpace(strings.Join([]string{login, ip}, " "))
	actor := middleware.UserIDFromContext(r.Context())
	_ = h.Audit.Log(r.Context(), &actor, "LOGIN_RATE_LIMIT_CLEAR", "auth", nil, detail, "", r.RemoteAddr, r.UserAgent())

	response.JSON(w, r, 200, map[string]any{
		"status":        "cleared",
		"login_cleared": loginCleared,
		"ip_cleared":    ipCleared,
	})
}
