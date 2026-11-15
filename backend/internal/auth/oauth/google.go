package oauth

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type GoogleProfile struct {
	Subject       string
	Email         string
	EmailVerified bool
	HD            string
	GivenName     string
	FamilyName    string
	Name          string
	Issuer        string
}

type googleKeyCache struct {
	mu    sync.Mutex
	keys  map[string]any
	until time.Time
}

var googleKeys googleKeyCache

func GoogleAuthURL(clientID, redirect, state, nonce, verifier string) string {
	q := url.Values{}
	q.Set("client_id", clientID)
	q.Set("redirect_uri", redirect)
	q.Set("response_type", "code")
	q.Set("scope", "openid email profile")
	q.Set("state", state)
	q.Set("nonce", nonce)
	q.Set("code_challenge", pkceS256(verifier))
	q.Set("code_challenge_method", "S256")
	return "https://accounts.google.com/o/oauth2/v2/auth?" + q.Encode()
}

func ExchangeGoogle(ctx context.Context, clientID, secret, redirect, code, verifier, nonce string) (*GoogleProfile, error) {
	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", clientID)
	form.Set("client_secret", secret)
	form.Set("redirect_uri", redirect)
	form.Set("grant_type", "authorization_code")
	form.Set("code_verifier", verifier)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://oauth2.googleapis.com/token", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("google token exchange failed")
	}
	var tok struct {
		IDToken string `json:"id_token"`
	}
	if err := json.Unmarshal(body, &tok); err != nil || tok.IDToken == "" {
		return nil, fmt.Errorf("google token: missing id_token")
	}
	return parseGoogleIDToken(ctx, tok.IDToken, clientID, nonce)
}

func parseGoogleIDToken(ctx context.Context, raw, audience, nonce string) (*GoogleProfile, error) {
	keys, err := loadGoogleKeys(ctx)
	if err != nil {
		return nil, err
	}
	parsed, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) {
		kid, _ := t.Header["kid"].(string)
		k, ok := keys[kid]
		if !ok {
			return nil, fmt.Errorf("unknown kid")
		}
		return k, nil
	}, jwt.WithValidMethods([]string{"RS256"}))
	if err != nil || !parsed.Valid {
		return nil, fmt.Errorf("invalid id_token")
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}
	iss, _ := claims["iss"].(string)
	if iss != "https://accounts.google.com" && iss != "accounts.google.com" {
		return nil, fmt.Errorf("bad issuer")
	}
	audOK := false
	switch aud := claims["aud"].(type) {
	case string:
		audOK = aud == audience
	case []any:
		for _, v := range aud {
			if s, _ := v.(string); s == audience {
				audOK = true
			}
		}
	}
	if !audOK {
		return nil, fmt.Errorf("bad audience")
	}
	if n, _ := claims["nonce"].(string); n != nonce {
		return nil, fmt.Errorf("bad nonce")
	}
	p := &GoogleProfile{Issuer: "https://accounts.google.com"}
	p.Subject, _ = claims["sub"].(string)
	p.Email, _ = claims["email"].(string)
	switch v := claims["email_verified"].(type) {
	case bool:
		p.EmailVerified = v
	case string:
		p.EmailVerified = v == "true"
	}
	p.HD, _ = claims["hd"].(string)
	p.GivenName, _ = claims["given_name"].(string)
	p.FamilyName, _ = claims["family_name"].(string)
	p.Name, _ = claims["name"].(string)
	if p.Subject == "" {
		return nil, fmt.Errorf("missing sub")
	}
	return p, nil
}

func loadGoogleKeys(ctx context.Context) (map[string]any, error) {
	googleKeys.mu.Lock()
	defer googleKeys.mu.Unlock()
	if time.Now().Before(googleKeys.until) && googleKeys.keys != nil {
		return googleKeys.keys, nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v1/certs", nil)
	if err != nil {
		return nil, err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var pems map[string]string
	if err := json.NewDecoder(res.Body).Decode(&pems); err != nil {
		return nil, err
	}
	out := map[string]any{}
	for kid, pem := range pems {
		key, err := jwt.ParseRSAPublicKeyFromPEM([]byte(pem))
		if err != nil {
			continue
		}
		out[kid] = key
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("no google keys")
	}
	googleKeys.keys = out
	googleKeys.until = time.Now().Add(time.Hour)
	return out, nil
}

func pkceS256(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}
