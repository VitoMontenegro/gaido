package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/auth"
	"github.com/vitomonte/experts-tourister/internal/auth/password"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

var (
	emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	loginRe = regexp.MustCompile(`^[a-zA-Z0-9_.-]{3,32}$`)
)

func validateRegisterReq(req registerReq) error {
	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)
	switch {
	case req.Email == "":
		return apperrors.New("VALIDATION_ERROR", "email is required", 400)
	case !emailRe.MatchString(req.Email):
		return apperrors.New("VALIDATION_ERROR", "invalid email format", 400)
	case req.Login == "":
		return apperrors.New("VALIDATION_ERROR", "login is required", 400)
	case !loginRe.MatchString(req.Login):
		return apperrors.New("VALIDATION_ERROR", "login must be 3-32 latin letters, digits, _, . or -", 400)
	case utf8.RuneCountInString(req.Password) < 8:
		return apperrors.New("VALIDATION_ERROR", "password must be at least 8 characters", 400)
	case firstName == "":
		return apperrors.New("VALIDATION_ERROR", "first_name is required", 400)
	case lastName == "":
		return apperrors.New("VALIDATION_ERROR", "last_name is required", 400)
	case !req.AcceptPrivacy:
		return apperrors.New("VALIDATION_ERROR", "privacy policy must be accepted", 400)
	case req.AsGuide && !req.AcceptPlacementRules:
		return apperrors.New("VALIDATION_ERROR", "placement rules must be accepted", 400)
	case !req.AsGuide && !req.AcceptSiteRules:
		return apperrors.New("VALIDATION_ERROR", "site rules must be accepted", 400)
	default:
		return nil
	}
}

func (h *Handlers) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "invalid JSON body", 400))
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	req.Login = strings.TrimSpace(req.Login)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	if err := validateRegisterReq(req); err != nil {
		response.Error(w, r, err)
		return
	}
	roles := []string{domain.RoleTourist}
	if req.AsGuide {
		roles = append(roles, domain.RoleGuide)
	}
	hash, err := password.Hash(req.Password)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if u, err := h.Users.GetByEmail(r.Context(), req.Email); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	} else if u != nil {
		response.Error(w, r, apperrors.New("EMAIL_ALREADY_EXISTS", "email already registered", 409))
		return
	}
	if u, err := h.Users.GetByLogin(r.Context(), req.Login); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	} else if u != nil {
		response.Error(w, r, apperrors.New("LOGIN_ALREADY_EXISTS", "login already taken", 409))
		return
	}
	id, err := h.Users.Create(r.Context(), req.Email, req.Login, req.FirstName, req.LastName, hash, roles)
	if err != nil {
		response.Error(w, r, apperrors.ErrConflict)
		return
	}
	if req.AsGuide {
		slug := guidesvc.Slugify(req.Login)
		displayName := domain.UserDisplayName(req.FirstName, req.LastName, req.Login)
		if guideID, err := h.Guides.CreateProfile(r.Context(), id, domain.GuideTypeGuide, displayName, slug); err != nil {
			h.Log.Warn("guide profile creation failed", "user_id", id, "error", err)
		} else {
			_ = h.GuideSvc.ActivateForCatalogFilling(r.Context(), guideID)
		}
	}
	h.WriteTokens(w, r, id, roles)
}
func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	req.Login = strings.TrimSpace(req.Login)
	blocked, retryAfter := middleware.LoginRateLimitBlocked(r, req.Login, h.Cfg.TrustProxy)
	if blocked {
		if retryAfter > 0 {
			w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
		}
		response.Error(w, r, apperrors.ErrRateLimited)
		return
	}
	u, err := h.Users.GetByLoginOrEmail(r.Context(), req.Login)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if u == nil {
		middleware.RecordFailedLogin(r, req.Login, h.Cfg.TrustProxy)
		response.Error(w, r, apperrors.ErrInvalidCredentials)
		return
	}
	okPw, err := password.Verify(req.Password, u.PasswordHash)
	if err != nil || !okPw {
		middleware.RecordFailedLogin(r, req.Login, h.Cfg.TrustProxy)
		response.Error(w, r, apperrors.ErrInvalidCredentials)
		return
	}
	h.WriteTokens(w, r, u.ID, u.Roles)
}
func (h *Handlers) WriteTokens(w http.ResponseWriter, r *http.Request, userID int64, roles []string) {
	access, _, err := h.JWT.GenerateAccessToken(userID, roles)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	plain, hash, exp, err := h.JWT.NewRefreshToken()
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if err := h.Users.SaveRefreshToken(r.Context(), userID, hash, exp); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    plain,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.Cfg.AppEnv != "development",
		Expires:  exp,
	})
	response.JSON(w, r, 200, map[string]any{"access_token": access, "user_id": userID, "roles": roles})
}
func (h *Handlers) Refresh(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie("refresh_token")
	if err != nil {
		response.Error(w, r, apperrors.ErrUnauthorized)
		return
	}
	hash := auth.HashToken(c.Value)
	userID, exp, err := h.Users.GetRefreshToken(r.Context(), hash)
	if err != nil || time.Now().After(exp) {
		response.Error(w, r, apperrors.ErrUnauthorized)
		return
	}
	u, err := h.Users.GetByID(r.Context(), userID)
	if err != nil || u == nil {
		response.Error(w, r, apperrors.ErrUnauthorized)
		return
	}
	_ = h.Users.DeleteRefreshToken(r.Context(), hash)
	h.WriteTokens(w, r, u.ID, u.Roles)
}
func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie("refresh_token"); err == nil {
		_ = h.Users.DeleteRefreshToken(r.Context(), auth.HashToken(c.Value))
	}
	http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: "", Path: "/api/v1/auth", MaxAge: -1})
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}
func (h *Handlers) Me(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	u, err := h.Users.GetByID(r.Context(), uid)
	if err != nil || u == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, map[string]any{
		"id":         u.ID,
		"email":      u.Email,
		"login":      u.Login,
		"first_name": u.FirstName,
		"last_name":  u.LastName,
		"roles":      u.Roles,
	})
}
func (h *Handlers) UpdateAccountProfile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	uid := middleware.UserIDFromContext(r.Context())
	if err := h.Users.UpdateProfile(r.Context(), uid, strings.TrimSpace(req.FirstName), strings.TrimSpace(req.LastName)); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	u, err := h.Users.GetByID(r.Context(), uid)
	if err != nil || u == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, map[string]any{
		"id":         u.ID,
		"email":      u.Email,
		"login":      u.Login,
		"first_name": u.FirstName,
		"last_name":  u.LastName,
		"roles":      u.Roles,
	})
}
