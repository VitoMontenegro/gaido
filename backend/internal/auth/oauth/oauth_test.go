package oauth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strings"
	"testing"
)

func TestGoogleAuthURLPKCE(t *testing.T) {
	u := GoogleAuthURL("cid", "https://gaido-ua.com/api/v1/auth/oauth/google/callback", "st", "n", "verifier")
	if !strings.Contains(u, "code_challenge_method=S256") {
		t.Fatalf("missing pkce: %s", u)
	}
	if !strings.Contains(u, "nonce=n") {
		t.Fatalf("missing nonce: %s", u)
	}
}

func TestParseFacebookSignedRequest(t *testing.T) {
	secret := "app-secret"
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{"user_id":"123"}`))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	id, err := ParseFacebookSignedRequest(sig+"."+payload, secret)
	if err != nil || id != "123" {
		t.Fatalf("id=%s err=%v", id, err)
	}
	if _, err := ParseFacebookSignedRequest(sig+"."+payload, "other"); err == nil {
		t.Fatal("expected signature error")
	}
}
