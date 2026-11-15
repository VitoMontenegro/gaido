package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/auth"
	"github.com/vitomonte/experts-tourister/internal/auth/oauth"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/impersonate"
	"github.com/vitomonte/experts-tourister/internal/service/identity"
)

const (
	oauthTxCookie       = "oauth_tx"
	oauthOnboardCookie  = "oauth_onboarding"
	oauthCookiePath     = "/api/v1/auth"
	googleIssuer        = "https://accounts.google.com"
)

func (h *Handlers) googleEnabled() bool {
	return h.Cfg.OAuthGoogleEnabled && h.Cfg.GoogleOAuthClientID != "" && h.Cfg.GoogleOAuthSecret != ""
}

func (h *Handlers) facebookEnabled() bool {
	return h.Cfg.OAuthFacebookEnabled && h.Cfg.FacebookAppID != "" && h.Cfg.FacebookAppSecret != ""
}

func (h *Handlers) oauthCallbackURL(provider string) string {
	base := strings.TrimRight(h.Cfg.OAuthRedirectBase, "/")
	if base == "" {
		base = strings.TrimRight(authAPIBase(h.Cfg.PublicBaseURL), "/")
	}
	if base == "" {
		base = "https://gaido-ua.com"
	}
	return base + "/api/v1/auth/oauth/" + provider + "/callback"
}

func (h *Handlers) oauthLog(provider, reason string) {
	if h.Log != nil {
		h.Log.Info("oauth denied", slog.String("provider", provider), slog.String("reason", reason))
	}
}

func (h *Handlers) ListOAuthProviders(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, r, 200, map[string]any{
		"google":   h.googleEnabled(),
		"facebook": h.facebookEnabled(),
	})
}

func (h *Handlers) OAuthStart(w http.ResponseWriter, r *http.Request) {
	provider := strings.ToLower(chi.URLParam(r, "provider"))
	if (provider == "google" && !h.googleEnabled()) || (provider == "facebook" && !h.facebookEnabled()) || (provider != "google" && provider != "facebook") {
		h.oauthLog(provider, "unavailable")
		response.Error(w, r, apperrors.ErrOAuthUnavailable)
		return
	}
	if h.OAuth == nil {
		h.oauthLog(provider, "unavailable")
		response.Error(w, r, apperrors.ErrOAuthUnavailable)
		return
	}
	intent := strings.TrimSpace(r.URL.Query().Get("intent"))
	if intent == "" {
		intent = "login"
	}
	returnURL := h.resolveAuthOrigin(r, r.URL.Query().Get("return_origin"))
	if impersonate.FromContext(r.Context()) != nil && intent == "link" {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	uid := middleware.UserIDFromContext(r.Context())
	if intent == "link" && uid == 0 {
		response.Error(w, r, apperrors.ErrUnauthorized)
		return
	}
	if intent != "link" {
		if !parseBoolQuery(r.URL.Query().Get("accept_privacy")) || !parseBoolQuery(r.URL.Query().Get("accept_site_rules")) {
			response.Error(w, r, apperrors.New("VALIDATION_ERROR", "privacy policy must be accepted", 400))
			return
		}
	}
	state, err := oauth.RandomID(16)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	nonce, err := oauth.RandomID(16)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	verifier, err := oauth.RandomID(32)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	tx := oauth.Transaction{
		Provider:     provider,
		State:        state,
		Nonce:        nonce,
		CodeVerifier: verifier,
		ReturnURL:    returnURL,
		Intent:       intent,
		UserID:       uid,
		AcceptPriv:   parseBoolQuery(r.URL.Query().Get("accept_privacy")),
		AcceptSite:   parseBoolQuery(r.URL.Query().Get("accept_site_rules")),
	}
	if err := h.OAuth.PutTx(r.Context(), tx); err != nil {
		h.oauthLog(provider, "unavailable")
		response.Error(w, r, apperrors.ErrOAuthUnavailable)
		return
	}
	h.setOAuthCookie(w, oauthTxCookie, state, 10*time.Minute)
	redirect := ""
	cb := h.oauthCallbackURL(provider)
	if provider == "google" {
		redirect = oauth.GoogleAuthURL(h.Cfg.GoogleOAuthClientID, cb, state, nonce, verifier)
	} else {
		redirect = oauth.FacebookAuthURL(h.Cfg.FacebookAppID, cb, state, verifier)
	}
	// 200 HTML so the browser stores oauth_tx before leaving. JS location keeps
	// raw "&" in the Google URL; html.EscapeString in meta-refresh turns them
	// into "&amp;" and Google then returns a mismatching state.
	jsURL, err := json.Marshal(redirect)
	if err != nil {
		h.oauthLog(provider, "unavailable")
		response.Error(w, r, apperrors.ErrOAuthUnavailable)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprintf(w, `<!DOCTYPE html><html><head><meta charset="utf-8"><script>location.replace(%s)</script></head><body><a href="%s">Continue</a></body></html>`, jsURL, html.EscapeString(redirect))
}

func (h *Handlers) OAuthCallback(w http.ResponseWriter, r *http.Request) {
	provider := strings.ToLower(chi.URLParam(r, "provider"))
	if r.URL.Query().Get("error") != "" {
		h.oauthLog(provider, "unavailable")
		origin := h.resolveAuthOrigin(r, "")
		h.redirectAuth(w, r, origin, "/login?oauth=cancelled")
		return
	}
	state := strings.TrimSpace(r.URL.Query().Get("state"))
	code := strings.TrimSpace(r.URL.Query().Get("code"))
	c, err := r.Cookie(oauthTxCookie)
	reason := ""
	switch {
	case h.OAuth == nil:
		reason = "unavailable"
	case state == "":
		reason = "state"
	case code == "":
		reason = "code"
	case err != nil || c == nil:
		reason = "cookie"
	case c.Value != state:
		reason = "mismatch"
	}
	if reason != "" {
		h.oauthLog(provider, reason)
		h.redirectAuth(w, r, h.resolveAuthOrigin(r, ""), "/login?oauth=invalid")
		return
	}
	tx, err := h.OAuth.ConsumeTx(r.Context(), state)
	h.clearOAuthCookie(w, oauthTxCookie)
	if err != nil || tx == nil || tx.Provider != provider {
		h.oauthLog(provider, "redis")
		h.redirectAuth(w, r, h.resolveAuthOrigin(r, ""), "/login?oauth=invalid")
		return
	}
	cb := h.oauthCallbackURL(provider)
	var subject, issuer, email, first, last string
	emailVerified := false
	hd := ""
	if provider == "google" {
		p, err := oauth.ExchangeGoogle(r.Context(), h.Cfg.GoogleOAuthClientID, h.Cfg.GoogleOAuthSecret, cb, code, tx.CodeVerifier, tx.Nonce)
		if err != nil {
			h.oauthLog(provider, "exchange")
			h.redirectAuth(w, r, tx.ReturnURL, "/login?oauth=invalid")
			return
		}
		subject, issuer, email = p.Subject, p.Issuer, p.Email
		emailVerified, hd = p.EmailVerified, p.HD
		first, last = p.GivenName, p.FamilyName
		if first == "" {
			first, last = identity.SplitProviderName(p.Name)
		}
	} else {
		p, err := oauth.ExchangeFacebook(r.Context(), h.Cfg.FacebookAppID, h.Cfg.FacebookAppSecret, cb, code, tx.CodeVerifier)
		if err != nil {
			h.oauthLog(provider, "exchange")
			h.redirectAuth(w, r, tx.ReturnURL, "/login?oauth=invalid")
			return
		}
		subject, issuer, email = p.Subject, p.Issuer, p.Email
		first, last = p.FirstName, p.LastName
		if first == "" {
			first, last = identity.SplitProviderName(p.Name)
		}
	}
	if ident, err := h.Identities.Get(r.Context(), provider, issuer, subject); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	} else if ident != nil {
		u, err := h.Users.GetByID(r.Context(), ident.UserID)
		if err != nil || u == nil {
			h.redirectAuth(w, r, tx.ReturnURL, "/login?oauth=invalid")
			return
		}
		if tx.Intent == "link" && tx.UserID != 0 && tx.UserID != u.ID {
			h.redirectAuth(w, r, tx.ReturnURL, "/account/settings?oauth=taken")
			return
		}
		_ = h.Identities.TouchLogin(r.Context(), ident.ID)
		if _, err := h.issueSession(w, r, u.ID, u.Roles); err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		h.redirectAuth(w, r, tx.ReturnURL, "/")
		return
	}
	if tx.Intent == "link" && tx.UserID != 0 {
		if impersonate.FromContext(r.Context()) != nil {
			response.Error(w, r, apperrors.ErrForbidden)
			return
		}
		if err := h.Identities.Insert(r.Context(), tx.UserID, provider, issuer, subject); err != nil {
			h.redirectAuth(w, r, tx.ReturnURL, "/account/settings?oauth=taken")
			return
		}
		u, err := h.Users.GetByID(r.Context(), tx.UserID)
		if err != nil || u == nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		if _, err := h.issueSession(w, r, u.ID, u.Roles); err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		h.redirectAuth(w, r, tx.ReturnURL, "/account/settings?oauth=linked")
		return
	}
	email = identity.NormalizeEmail(email)
	trusted := provider == "google" && identity.GoogleEmailTrusted(email, emailVerified, hd)
	if email == "" || (provider == "google" && !trusted) || (provider == "facebook" && email == "") {
		id, err := oauth.RandomID(16)
		if err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		ob := oauth.Onboarding{
			ID: id, Provider: provider, Issuer: issuer, Subject: subject,
			FirstName: first, LastName: last, ReturnURL: tx.ReturnURL,
			AcceptPriv: tx.AcceptPriv, AcceptSite: tx.AcceptSite,
		}
		if err := h.OAuth.PutOnboarding(r.Context(), ob); err != nil {
			h.oauthLog(provider, "unavailable")
			h.redirectAuth(w, r, tx.ReturnURL, "/login?oauth=invalid")
			return
		}
		h.setOAuthCookie(w, oauthOnboardCookie, id, 30*time.Minute)
		path := "/login?oauth=email"
		if email != "" {
			path = "/login?oauth=email&hint=" + email
		}
		h.redirectAuth(w, r, tx.ReturnURL, path)
		return
	}
	if existing, err := h.Users.GetByEmail(r.Context(), email); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	} else if existing != nil {
		h.redirectAuth(w, r, tx.ReturnURL, "/login?oauth=link")
		return
	}
	u, err := h.createOAuthUser(r.Context(), email, first, last, provider, issuer, subject, trusted, tx.AcceptPriv, tx.AcceptSite)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	_ = h.EmailTokens.DeleteByEmailPurpose(r.Context(), email, domain.EmailPurposeRegister)
	if _, err := h.issueSession(w, r, u.ID, u.Roles); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	h.redirectAuth(w, r, tx.ReturnURL, "/")
}

func (h *Handlers) OAuthCompleteEmail(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email        string `json:"email"`
		ReturnOrigin string `json:"return_origin"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	email := identity.NormalizeEmail(req.Email)
	if email == "" || !emailRe.MatchString(email) {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "invalid email format", 400))
		return
	}
	c, err := r.Cookie(oauthOnboardCookie)
	if err != nil || c.Value == "" || h.OAuth == nil {
		response.Error(w, r, apperrors.ErrInvalidToken)
		return
	}
	ob, err := h.OAuth.GetOnboarding(r.Context(), c.Value)
	if err != nil || ob == nil {
		response.Error(w, r, apperrors.ErrInvalidToken)
		return
	}
	payload, err := json.Marshal(domain.OAuthEmailPayload{OnboardingID: ob.ID, Origin: ob.ReturnURL})
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	plain, exp, err := h.storeEmailToken(r.Context(), email, domain.EmailPurposeOAuthEmail, payload, 24*time.Hour)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	origin := h.resolveAuthOrigin(r, req.ReturnOrigin)
	if ob.ReturnURL != "" {
		origin = ob.ReturnURL
	}
	link := authAPIBase(origin) + "/api/v1/auth/oauth/complete?token=" + plain
	if err := h.sendAuthMail(r.Context(), email, "Підтвердіть email на Gaido", registerMailBody(link)); err != nil {
		response.Error(w, r, err)
		return
	}
	out := map[string]any{"email": email, "expires_in": int(time.Until(exp).Seconds())}
	if h.devTokenEnabled() {
		out["dev_token"] = plain
	}
	response.JSON(w, r, 200, out)
}

func (h *Handlers) OAuthCompleteConfirm(w http.ResponseWriter, r *http.Request) {
	plain := strings.TrimSpace(r.URL.Query().Get("token"))
	tok, err := h.EmailTokens.ConsumeByHash(r.Context(), auth.HashToken(plain))
	if err != nil || tok == nil || tok.Purpose != domain.EmailPurposeOAuthEmail {
		h.redirectAuth(w, r, h.resolveAuthOrigin(r, ""), "/login?confirm=invalid")
		return
	}
	var payload domain.OAuthEmailPayload
	_ = json.Unmarshal(tok.Payload, &payload)
	ob, err := h.OAuth.GetOnboarding(r.Context(), payload.OnboardingID)
	if err != nil || ob == nil {
		h.redirectAuth(w, r, payload.Origin, "/login?oauth=invalid")
		return
	}
	email := identity.NormalizeEmail(tok.Email)
	if existing, err := h.Users.GetByEmail(r.Context(), email); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	} else if existing != nil {
		h.redirectAuth(w, r, payload.Origin, "/login?oauth=link")
		return
	}
	u, err := h.createOAuthUser(r.Context(), email, ob.FirstName, ob.LastName, ob.Provider, ob.Issuer, ob.Subject, true, ob.AcceptPriv, ob.AcceptSite)
	if err != nil {
		response.Error(w, r, apperrors.ErrConflict)
		return
	}
	h.OAuth.DeleteOnboarding(r.Context(), ob.ID)
	h.clearOAuthCookie(w, oauthOnboardCookie)
	_ = h.EmailTokens.DeleteByEmailPurpose(r.Context(), email, domain.EmailPurposeRegister)
	if _, err := h.issueSession(w, r, u.ID, u.Roles); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	h.redirectAuth(w, r, payload.Origin, "/")
}

func (h *Handlers) ListAccountIdentities(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	items, err := h.Identities.ListByUser(r.Context(), uid)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		out = append(out, map[string]any{"provider": it.Provider, "connected_at": it.ConnectedAt})
	}
	u, _ := h.Users.GetByID(r.Context(), uid)
	response.JSON(w, r, 200, map[string]any{"items": out, "has_password": u != nil && u.HasPassword()})
}

func (h *Handlers) UnlinkAccountIdentity(w http.ResponseWriter, r *http.Request) {
	if impersonate.FromContext(r.Context()) != nil {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	provider := strings.ToLower(chi.URLParam(r, "provider"))
	uid := middleware.UserIDFromContext(r.Context())
	u, err := h.Users.GetByID(r.Context(), uid)
	if err != nil || u == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	items, err := h.Identities.ListByUser(r.Context(), uid)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	count := len(items)
	found := false
	for _, it := range items {
		if it.Provider == provider {
			found = true
		}
	}
	if !found {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if count <= 1 && !u.HasPassword() {
		response.Error(w, r, apperrors.ErrLastIdentity)
		return
	}
	if err := h.Identities.Delete(r.Context(), uid, provider); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) FacebookDataDeletion(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	raw := r.FormValue("signed_request")
	userID, err := oauth.ParseFacebookSignedRequest(raw, h.Cfg.FacebookAppSecret)
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	_ = h.Identities.DeleteBySubject(r.Context(), "facebook", h.Cfg.FacebookAppID, userID)
	code, _ := oauth.RandomID(8)
	response.JSON(w, r, 200, map[string]string{
		"url":               "https://gaido-ua.com/legal/privacy",
		"confirmation_code": code,
	})
}

func (h *Handlers) createOAuthUser(ctx context.Context, email, first, last, provider, issuer, subject string, verified, priv, site bool) (*domain.User, error) {
	if !priv || !site {
		return nil, apperrors.New("VALIDATION_ERROR", "privacy policy must be accepted", 400)
	}
	var verifiedAt *time.Time
	if verified {
		now := time.Now()
		verifiedAt = &now
	}
	var id int64
	var err error
	for i := 0; i < 8; i++ {
		login, gerr := identity.GenerateLogin()
		if gerr != nil {
			return nil, gerr
		}
		id, err = h.Users.CreateVerified(ctx, email, login, first, last, nil, []string{domain.RoleTourist}, verifiedAt)
		if err == nil {
			break
		}
		if !isUniqueViolation(err) {
			return nil, err
		}
		id = 0
	}
	if id == 0 {
		return nil, errors.New("login exhausted")
	}
	if err := h.Identities.Insert(ctx, id, provider, issuer, subject); err != nil {
		return nil, err
	}
	ver, _ := h.Identities.LegalVersion(ctx)
	_ = h.Identities.RecordConsent(ctx, id, "privacy_policy", ver)
	_ = h.Identities.RecordConsent(ctx, id, "site_rules", ver)
	return h.Users.GetByID(ctx, id)
}

func (h *Handlers) setOAuthCookie(w http.ResponseWriter, name, value string, ttl time.Duration) {
	c := &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     oauthCookiePath,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.Cfg.AppEnv != "development",
		Expires:  time.Now().Add(ttl),
	}
	if h.Cfg.CookieDomain != "" {
		c.Domain = h.Cfg.CookieDomain
	}
	http.SetCookie(w, c)
}

func (h *Handlers) clearOAuthCookie(w http.ResponseWriter, name string) {
	c := &http.Cookie{Name: name, Value: "", Path: oauthCookiePath, MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: h.Cfg.AppEnv != "development"}
	if h.Cfg.CookieDomain != "" {
		c.Domain = h.Cfg.CookieDomain
	}
	http.SetCookie(w, c)
}

func parseBoolQuery(v string) bool {
	v = strings.ToLower(strings.TrimSpace(v))
	return v == "1" || v == "true" || v == "yes"
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
