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

func attachUser(ctx context.Context, jwt *auth.JWTService, users UserLookup, r *http.Request) context.Context {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ctx
	}
	claims, err := jwt.ParseAccessToken(strings.TrimPrefix(h, "Bearer "))
	if err != nil {
		return ctx
	}
	u, err := users.GetByID(ctx, claims.UserID)
	if err != nil || u == nil {
		return ctx
	}
	ctx = context.WithValue(ctx, UserIDKey, u.ID)
	return context.WithValue(ctx, RolesKey, u.Roles)
}

func Auth(jwt *auth.JWTService, users UserLookup) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := attachUser(r.Context(), jwt, users, r)
			if UserIDFromContext(ctx) == 0 {
				writeError(w, r, 401, "UNAUTHORIZED", "Authentication required")
				return
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func OptionalAuth(jwt *auth.JWTService, users UserLookup) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(attachUser(r.Context(), jwt, users, r)))
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
