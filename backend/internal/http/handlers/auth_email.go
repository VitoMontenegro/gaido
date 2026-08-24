package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/auth"
	"github.com/vitomonte/experts-tourister/internal/auth/password"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"unicode/utf8"

	"github.com/vitomonte/experts-tourister/internal/http/response"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
	mailsvc "github.com/vitomonte/experts-tourister/internal/service/mail"
)

func (h *Handlers) ConfirmRegister(w http.ResponseWriter, r *http.Request) {
	plain := strings.TrimSpace(r.URL.Query().Get("token"))
	tok, payload, err := h.loadRegisterToken(r.Context(), plain)
	if err != nil {
		h.redirectAuth(w, r, h.resolveAuthOrigin(r, ""), "/login?confirm=invalid")
		return
	}
	if u, err := h.Users.GetByEmail(r.Context(), tok.Email); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	} else if u != nil {
		_ = h.EmailTokens.Delete(r.Context(), tok.ID)
		h.redirectAuth(w, r, payload.Origin, "/login?confirm=exists")
		return
	}
	if u, err := h.Users.GetByLogin(r.Context(), payload.Login); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	} else if u != nil {
		_ = h.EmailTokens.Delete(r.Context(), tok.ID)
		h.redirectAuth(w, r, payload.Origin, "/login?confirm=exists")
		return
	}
	roles := []string{domain.RoleTourist}
	if payload.AsGuide {
		roles = append(roles, domain.RoleGuide)
	}
	id, err := h.Users.Create(r.Context(), tok.Email, payload.Login, payload.FirstName, payload.LastName, payload.PasswordHash, roles)
	if err != nil {
		response.Error(w, r, apperrors.ErrConflict)
		return
	}
	_ = h.EmailTokens.Delete(r.Context(), tok.ID)
	if payload.AsGuide {
		slug := guidesvc.Slugify(payload.Login)
		displayName := domain.UserDisplayName(payload.FirstName, payload.LastName, payload.Login)
		if guideID, err := h.Guides.CreateProfile(r.Context(), id, domain.GuideTypeGuide, displayName, slug); err != nil {
			h.Log.Warn("guide profile creation failed", "user_id", id, "error", err)
		} else {
			_ = h.GuideSvc.ActivateForCatalogFilling(r.Context(), guideID)
		}
	}
	if _, err := h.issueSession(w, r, id, roles); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	h.redirectAuth(w, r, payload.Origin, "/")
}

func (h *Handlers) ResendRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email        string `json:"email"`
		ReturnOrigin string `json:"return_origin"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || !emailRe.MatchString(email) {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "invalid email format", 400))
		return
	}
	tok, err := h.EmailTokens.GetLatest(r.Context(), email, domain.EmailPurposeRegister)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if tok == nil || time.Now().After(tok.ExpiresAt) {
		response.JSON(w, r, 200, map[string]any{"email": email, "status": "ok"})
		return
	}
	if time.Since(tok.LastSentAt) < time.Minute {
		response.Error(w, r, apperrors.ErrRateLimited)
		return
	}
	plain, err := newEmailToken()
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	exp := time.Now().Add(24 * time.Hour)
	if err := h.EmailTokens.ReplaceToken(r.Context(), tok.ID, auth.HashToken(plain), exp, time.Now()); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	var payload domain.RegisterEmailPayload
	_ = json.Unmarshal(tok.Payload, &payload)
	origin := payload.Origin
	if origin == "" {
		origin = h.resolveAuthOrigin(r, req.ReturnOrigin)
	}
	link := origin + "/api/v1/auth/register/confirm?token=" + plain
	if err := h.sendAuthMail(r.Context(), email, "Підтвердіть реєстрацію на Gaido", registerMailBody(link)); err != nil {
		response.Error(w, r, err)
		return
	}
	out := map[string]any{"email": email, "expires_in": int(time.Until(exp).Seconds())}
	if h.devTokenEnabled() {
		out["dev_token"] = plain
	}
	response.JSON(w, r, 200, out)
}

func (h *Handlers) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email        string `json:"email"`
		ReturnOrigin string `json:"return_origin"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	origin := h.resolveAuthOrigin(r, req.ReturnOrigin)
	out := map[string]any{"status": "ok"}
	if email == "" || !emailRe.MatchString(email) {
		response.JSON(w, r, 200, out)
		return
	}
	u, err := h.Users.GetByLoginOrEmail(r.Context(), email)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if u == nil {
		response.JSON(w, r, 200, out)
		return
	}
	if latest, _ := h.EmailTokens.GetLatest(r.Context(), email, domain.EmailPurposeReset); latest != nil && time.Since(latest.LastSentAt) < time.Minute {
		response.JSON(w, r, 200, out)
		return
	}
	payload, err := json.Marshal(domain.ResetEmailPayload{Origin: origin})
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	plain, _, err := h.storeEmailToken(r.Context(), email, domain.EmailPurposeReset, payload, time.Hour)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	link := origin + "/reset-password?token=" + url.QueryEscape(plain)
	if err := h.sendAuthMail(r.Context(), email, "Скидання пароля Gaido", resetMailBody(link)); err != nil {
		response.Error(w, r, err)
		return
	}
	if h.devTokenEnabled() {
		out["dev_token"] = plain
		h.Log.Info("password reset token", "email", email, "dev_token", plain)
	}
	response.JSON(w, r, 200, out)
}

func (h *Handlers) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if utf8.RuneCountInString(req.Password) < 8 {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "password must be at least 8 characters", 400))
		return
	}
	tok, err := h.EmailTokens.GetByHash(r.Context(), auth.HashToken(strings.TrimSpace(req.Token)))
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if tok == nil || tok.Purpose != domain.EmailPurposeReset || time.Now().After(tok.ExpiresAt) {
		response.Error(w, r, apperrors.ErrInvalidToken)
		return
	}
	u, err := h.Users.GetByEmail(r.Context(), tok.Email)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if u == nil {
		response.Error(w, r, apperrors.ErrInvalidToken)
		return
	}
	hash, err := password.Hash(req.Password)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if err := h.Users.UpdatePassword(r.Context(), u.ID, hash); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	_ = h.Users.DeleteRefreshTokensForUser(r.Context(), u.ID)
	_ = h.EmailTokens.Delete(r.Context(), tok.ID)
	h.WriteTokens(w, r, u.ID, u.Roles)
}

func (h *Handlers) loadRegisterToken(ctx context.Context, plain string) (*domain.EmailToken, domain.RegisterEmailPayload, error) {
	var payload domain.RegisterEmailPayload
	if plain == "" {
		return nil, payload, apperrors.ErrInvalidToken
	}
	tok, err := h.EmailTokens.GetByHash(ctx, auth.HashToken(plain))
	if err != nil {
		return nil, payload, err
	}
	if tok == nil || tok.Purpose != domain.EmailPurposeRegister || time.Now().After(tok.ExpiresAt) {
		return nil, payload, apperrors.ErrInvalidToken
	}
	if err := json.Unmarshal(tok.Payload, &payload); err != nil {
		return nil, payload, err
	}
	return tok, payload, nil
}

func (h *Handlers) storeEmailToken(ctx context.Context, email, purpose string, payload []byte, ttl time.Duration) (plain string, exp time.Time, err error) {
	plain, err = newEmailToken()
	if err != nil {
		return "", time.Time{}, err
	}
	exp = time.Now().Add(ttl)
	err = h.EmailTokens.Upsert(ctx, email, purpose, auth.HashToken(plain), payload, exp, time.Now())
	return plain, exp, err
}

func newEmailToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (h *Handlers) sendAuthMail(ctx context.Context, to, subject, body string) error {
	cfg, err := h.Mail.Load(ctx)
	if err != nil {
		return apperrors.ErrInternal
	}
	if mailsvc.Configured(cfg) {
		if err := h.Mail.Send(ctx, to, subject, body); err != nil {
			h.Log.Warn("auth mail send failed", "email", to, "error", err)
			return apperrors.New("MAIL_SEND_FAILED", "failed to send email", 502)
		}
		return nil
	}
	if h.devTokenEnabled() {
		return nil
	}
	return apperrors.ErrMailNotConfigured
}

func (h *Handlers) devTokenEnabled() bool {
	return h.Cfg.AppEnv != "production"
}

func registerMailBody(link string) string {
	return "Підтвердіть реєстрацію на Gaido\n\nНатисніть посилання, щоб завершити реєстрацію:\n" + link + "\n\nПосилання дійсне 24 години.\n"
}

func resetMailBody(link string) string {
	return "Скидання пароля Gaido\n\nЩоб встановити новий пароль, відкрийте посилання:\n" + link + "\n\nЯкщо ви не просили скидання — проігноруйте цей лист.\nПосилання дійсне 1 годину.\n"
}

func (h *Handlers) redirectAuth(w http.ResponseWriter, r *http.Request, origin, path string) {
	target := path
	if origin != "" {
		target = strings.TrimRight(origin, "/") + path
	}
	http.Redirect(w, r, target, http.StatusFound)
}

func (h *Handlers) resolveAuthOrigin(r *http.Request, hinted string) string {
	for _, raw := range []string{hinted, r.Header.Get("Origin"), originFromReferer(r.Header.Get("Referer")), h.Cfg.PublicBaseURL} {
		if origin, ok := h.normalizeAllowedOrigin(raw); ok {
			return origin
		}
	}
	if origin, ok := h.normalizeAllowedOrigin(h.Cfg.PublicBaseURL); ok {
		return origin
	}
	return "https://gaido.top"
}

func originFromReferer(ref string) string {
	u, err := url.Parse(strings.TrimSpace(ref))
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

func (h *Handlers) normalizeAllowedOrigin(raw string) (string, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", false
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return "", false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", false
	}
	origin := u.Scheme + "://" + u.Host
	if !h.originAllowed(origin) {
		return "", false
	}
	return origin, true
}

func (h *Handlers) originAllowed(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	host := strings.ToLower(u.Hostname())
	if _, ok := h.Cfg.StaticHostMap[host]; ok {
		if host == "localhost" || host == "127.0.0.1" {
			return h.Cfg.AppEnv != "production"
		}
		return u.Scheme == "https" || h.Cfg.AppEnv != "production"
	}
	want := strings.TrimRight(origin, "/")
	for _, allowed := range h.Cfg.CORSOrigins {
		if strings.TrimRight(allowed, "/") == want {
			return true
		}
	}
	return false
}
