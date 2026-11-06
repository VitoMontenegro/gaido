package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/auth"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/impersonate"
	"github.com/vitomonte/experts-tourister/internal/rbac"
)

const ActAsGuideHeader = "X-Act-As-Guide-Id"

// UserLookup resolves active (non-deleted) users for auth middleware.
type UserLookup interface {
	GetByID(ctx context.Context, id int64) (*domain.User, error)
}

// GuideLookup resolves a guide profile by id for admin impersonation.
type GuideLookup interface {
	GetByID(ctx context.Context, id int64) (*domain.GuideProfile, error)
}

func UserIDFromContext(ctx context.Context) int64 {
	id, _ := ctx.Value(UserIDKey).(int64)
	return id
}

func RolesFromContext(ctx context.Context) []string {
	roles, _ := ctx.Value(RolesKey).([]string)
	return roles
}

func hasRole(roles []string, want string) bool {
	for _, role := range roles {
		if role == want {
			return true
		}
	}
	return false
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	return strings.TrimSpace(r.URL.Query().Get("access_token"))
}

func attachUser(ctx context.Context, jwt *auth.JWTService, users UserLookup, r *http.Request) context.Context {
	token := bearerToken(r)
	if token == "" {
		return ctx
	}
	claims, err := jwt.ParseAccessToken(token)
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

func applyImpersonation(ctx context.Context, users UserLookup, guides GuideLookup, r *http.Request) (context.Context, int, string, string) {
	raw := strings.TrimSpace(r.Header.Get(ActAsGuideHeader))
	if raw == "" {
		return ctx, 0, "", ""
	}
	actorID := UserIDFromContext(ctx)
	if actorID == 0 {
		return ctx, 0, "", ""
	}
	if !hasRole(RolesFromContext(ctx), domain.RoleAdmin) {
		return ctx, http.StatusForbidden, "FORBIDDEN", "Only administrators can act as a guide"
	}
	gid, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || gid <= 0 {
		return ctx, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid guide id"
	}
	g, err := guides.GetByID(ctx, gid)
	if err != nil || g == nil {
		return ctx, http.StatusNotFound, "NOT_FOUND", "Guide not found"
	}
	u, err := users.GetByID(ctx, g.UserID)
	if err != nil || u == nil {
		return ctx, http.StatusNotFound, "NOT_FOUND", "Guide user not found"
	}
	if hasRole(u.Roles, domain.RoleAdmin) {
		return ctx, http.StatusForbidden, "FORBIDDEN", "Cannot impersonate an administrator"
	}
	ctx = impersonate.With(ctx, actorID, g.ID, g.DisplayName)
	ctx = context.WithValue(ctx, UserIDKey, u.ID)
	ctx = context.WithValue(ctx, RolesKey, u.Roles)
	return ctx, 0, "", ""
}

func Auth(jwt *auth.JWTService, users UserLookup, guides GuideLookup) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := attachUser(r.Context(), jwt, users, r)
			if UserIDFromContext(ctx) == 0 {
				writeError(w, r, 401, "UNAUTHORIZED", "Authentication required")
				return
			}
			ctx, status, code, msg := applyImpersonation(ctx, users, guides, r)
			if status != 0 {
				writeError(w, r, status, code, msg)
				return
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func OptionalAuth(jwt *auth.JWTService, users UserLookup, guides GuideLookup) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := attachUser(r.Context(), jwt, users, r)
			if UserIDFromContext(ctx) != 0 {
				var status int
				var code, msg string
				ctx, status, code, msg = applyImpersonation(ctx, users, guides, r)
				if status != 0 {
					writeError(w, r, status, code, msg)
					return
				}
			}
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
