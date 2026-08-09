package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/auth"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/rbac"
)

// UserLookup resolves active (non-deleted) users for auth middleware.
type UserLookup interface {
	GetByID(ctx context.Context, id int64) (*domain.User, error)
}

func UserIDFromContext(ctx context.Context) int64 {
	id, _ := ctx.Value(UserIDKey).(int64)
	return id
}

func RolesFromContext(ctx context.Context) []string {
	roles, _ := ctx.Value(RolesKey).([]string)
	return roles
}

func Auth(jwt *auth.JWTService, users UserLookup) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if !strings.HasPrefix(h, "Bearer ") {
				writeError(w, r, 401, "UNAUTHORIZED", "Authentication required")
				return
			}
			claims, err := jwt.ParseAccessToken(strings.TrimPrefix(h, "Bearer "))
			if err != nil {
				writeError(w, r, 401, "UNAUTHORIZED", "Authentication required")
				return
			}
			u, err := users.GetByID(r.Context(), claims.UserID)
			if err != nil || u == nil {
				writeError(w, r, 401, "UNAUTHORIZED", "Authentication required")
				return
			}
			ctx := context.WithValue(r.Context(), UserIDKey, u.ID)
			ctx = context.WithValue(ctx, RolesKey, u.Roles)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RBAC(enforcer *rbac.Enforcer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			roles := RolesFromContext(r.Context())
			if !enforcer.AllowAny(roles, r.URL.Path, r.Method) {
				writeError(w, r, 403, "FORBIDDEN", "Access denied")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	reqID, _ := r.Context().Value(RequestIDKey).(string)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]string{
			"code": code, "message": message, "request_id": reqID,
		},
	})
}
