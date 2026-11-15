package oauth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type FacebookProfile struct {
	Subject   string
	Email     string
	FirstName string
	LastName  string
	Name      string
	Issuer    string
}

func FacebookAuthURL(appID, redirect, state, verifier string) string {
	q := url.Values{}
	q.Set("client_id", appID)
	q.Set("redirect_uri", redirect)
	q.Set("state", state)
	q.Set("response_type", "code")
	q.Set("scope", "email,public_profile")
	if verifier != "" {
		q.Set("code_challenge", pkceS256(verifier))
		q.Set("code_challenge_method", "S256")
	}
	return "https://www.facebook.com/v21.0/dialog/oauth?" + q.Encode()
}

func ExchangeFacebook(ctx context.Context, appID, secret, redirect, code, verifier string) (*FacebookProfile, error) {
	q := url.Values{}
	q.Set("client_id", appID)
	q.Set("client_secret", secret)
	q.Set("redirect_uri", redirect)
	q.Set("code", code)
	if verifier != "" {
		q.Set("code_verifier", verifier)
	}
	tokenURL := "https://graph.facebook.com/v21.0/oauth/access_token?" + q.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, tokenURL, nil)
	if err != nil {
		return nil, err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("facebook token exchange failed")
	}
	var tok struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &tok); err != nil || tok.AccessToken == "" {
		return nil, fmt.Errorf("facebook token missing")
	}
	if err := debugFacebookToken(ctx, appID, secret, tok.AccessToken); err != nil {
		return nil, err
	}
	meURL := "https://graph.facebook.com/v21.0/me?fields=id,email,first_name,last_name,name&access_token=" + url.QueryEscape(tok.AccessToken)
	req, err = http.NewRequestWithContext(ctx, http.MethodGet, meURL, nil)
	if err != nil {
		return nil, err
	}
	res, err = http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	meBody, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("facebook profile failed")
	}
	var me struct {
		ID        string `json:"id"`
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Name      string `json:"name"`
	}
	if err := json.Unmarshal(meBody, &me); err != nil || me.ID == "" {
		return nil, fmt.Errorf("facebook profile missing")
	}
	return &FacebookProfile{
		Subject:   me.ID,
		Email:     me.Email,
		FirstName: me.FirstName,
		LastName:  me.LastName,
		Name:      me.Name,
		Issuer:    appID,
	}, nil
}

func debugFacebookToken(ctx context.Context, appID, secret, userToken string) error {
	appToken := appID + "|" + secret
	u := "https://graph.facebook.com/debug_token?input_token=" + url.QueryEscape(userToken) + "&access_token=" + url.QueryEscape(appToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	var out struct {
		Data struct {
			AppID   string `json:"app_id"`
			IsValid bool   `json:"is_valid"`
		} `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return err
	}
	if !out.Data.IsValid || out.Data.AppID != appID {
		return fmt.Errorf("facebook token not for this app")
	}
	return nil
}

func ParseFacebookSignedRequest(raw, secret string) (userID string, err error) {
	parts := strings.Split(raw, ".")
	if len(parts) != 2 {
		return "", fmt.Errorf("bad signed_request")
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", err
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(parts[1]))
	if !hmac.Equal(sig, mac.Sum(nil)) {
		return "", fmt.Errorf("bad signature")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}
	var data struct {
		UserID string `json:"user_id"`
	}
	if err := json.Unmarshal(payload, &data); err != nil || data.UserID == "" {
		return "", fmt.Errorf("missing user_id")
	}
	return data.UserID, nil
}
