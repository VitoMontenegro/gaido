package app_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/vitomonte/experts-tourister/internal/app"
	"github.com/vitomonte/experts-tourister/internal/config"
)

func testConfig() config.Config {
	cfg := config.Load()
	cfg.SeedDemoData = false
	return cfg
}

func newTestApp(t *testing.T) *app.App {
	t.Helper()
	return newTestAppWithConfig(t, testConfig())
}

func newSeededTestApp(t *testing.T) *app.App {
	t.Helper()
	a := newTestAppWithConfig(t, testConfig())
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if err := a.RunDemoSeed(ctx); err != nil {
		t.Fatalf("demo seed: %v", err)
	}
	return a
}

func newTestAppWithConfig(t *testing.T, cfg config.Config) *app.App {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	log := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	a, err := app.New(ctx, cfg, log)
	if err != nil {
		t.Skipf("integration smoke skipped (db/redis unavailable): %v", err)
	}
	t.Cleanup(a.Close)
	return a
}

type smokeResp struct {
	code int
	body []byte
	hdr  http.Header
}

func smokeRequest(t *testing.T, a *app.App, method, path string, body any, token string, cookies []*http.Cookie) smokeResp {
	t.Helper()
	var rdr io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		rdr = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, rdr)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for _, c := range cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	a.Router().ServeHTTP(rec, req)
	return smokeResp{code: rec.Code, body: rec.Body.Bytes(), hdr: rec.Header()}
}

func decodeJSON[T any](t *testing.T, raw []byte) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("decode json: %v body=%s", err, string(raw))
	}
	return v
}

func uniqueLogin(prefix string) string {
	return prefix + time.Now().Format("150405") + strconv.FormatInt(time.Now().UnixNano()%1000, 10)
}

func registerUser(t *testing.T, a *app.App, login string, asGuide bool) (token string, cookies []*http.Cookie) {
	t.Helper()
	res := smokeRequest(t, a, http.MethodPost, "/api/v1/auth/register", map[string]any{
		"email":                  login + "@test.local",
		"login":                  login,
		"password":               "smokepass12345",
		"first_name":             "Smoke",
		"last_name":              "User",
		"as_guide":               asGuide,
		"accept_privacy":         true,
		"accept_site_rules":      !asGuide,
		"accept_placement_rules": asGuide,
	}, "", nil)
	if res.code != http.StatusOK && res.code != http.StatusCreated {
		t.Fatalf("register: %d %s", res.code, res.body)
	}
	out := decodeJSON[struct {
		AccessToken string `json:"access_token"`
	}](t, res.body)
	return out.AccessToken, parseSetCookies(res.hdr)
}

func loginUser(t *testing.T, a *app.App, login, password string) (token string, cookies []*http.Cookie) {
	t.Helper()
	res := smokeRequest(t, a, http.MethodPost, "/api/v1/auth/login", map[string]any{
		"login":    login,
		"password": password,
	}, "", nil)
	if res.code != http.StatusOK {
		t.Fatalf("login %s: %d %s", login, res.code, res.body)
	}
	out := decodeJSON[struct {
		AccessToken string `json:"access_token"`
	}](t, res.body)
	return out.AccessToken, parseSetCookies(res.hdr)
}

func parseSetCookies(h http.Header) []*http.Cookie {
	var out []*http.Cookie
	for _, line := range h.Values("Set-Cookie") {
		if c, err := http.ParseSetCookie(line); err == nil {
			out = append(out, c)
		}
	}
	return out
}

func refreshToken(t *testing.T, a *app.App, cookies []*http.Cookie) string {
	t.Helper()
	res := smokeRequest(t, a, http.MethodPost, "/api/v1/auth/refresh", nil, "", cookies)
	if res.code != http.StatusOK {
		t.Fatalf("refresh: %d %s", res.code, res.body)
	}
	out := decodeJSON[struct {
		AccessToken string `json:"access_token"`
	}](t, res.body)
	if out.AccessToken == "" {
		t.Fatal("refresh: empty access_token")
	}
	return out.AccessToken
}

func TestSmoke_healthz(t *testing.T) {
	a := newTestApp(t)
	res := smokeRequest(t, a, http.MethodGet, "/healthz", nil, "", nil)
	if res.code != http.StatusOK {
		t.Fatalf("healthz: got %d", res.code)
	}
}

func TestSmoke_readyz(t *testing.T) {
	a := newTestApp(t)
	res := smokeRequest(t, a, http.MethodGet, "/readyz", nil, "", nil)
	if res.code != http.StatusOK {
		t.Fatalf("readyz: got %d body=%s", res.code, res.body)
	}
}

func TestSmoke_publicCatalog(t *testing.T) {
	a := newTestApp(t)
	for _, path := range []string{"/api/v1/guides", "/api/v1/excursions", "/api/v1/geo/countries"} {
		res := smokeRequest(t, a, http.MethodGet, path, nil, "", nil)
		if res.code != http.StatusOK {
			t.Fatalf("%s: got %d body=%s", path, res.code, res.body)
		}
	}
}

func TestSmoke_authRegisterLogin(t *testing.T) {
	a := newTestApp(t)
	login := uniqueLogin("smoke_")
	res := smokeRequest(t, a, http.MethodPost, "/api/v1/auth/register", map[string]any{
		"email":             login + "@test.local",
		"login":             login,
		"password":          "smokepass12345",
		"first_name":        "Smoke",
		"last_name":         "Test",
		"accept_privacy":    true,
		"accept_site_rules": true,
	}, "", nil)
	if res.code != http.StatusOK && res.code != http.StatusCreated {
		t.Fatalf("register: got %d body=%s", res.code, res.body)
	}
}

func TestSmoke_authLoginRefresh(t *testing.T) {
	a := newTestApp(t)
	login := uniqueLogin("refresh_")
	_, cookies := registerUser(t, a, login, true)
	token := refreshToken(t, a, cookies)
	res := smokeRequest(t, a, http.MethodGet, "/api/v1/account/me", nil, token, cookies)
	if res.code != http.StatusOK {
		t.Fatalf("me after refresh: %d %s", res.code, res.body)
	}
}

func TestSmoke_contactPaywall(t *testing.T) {
	a := newSeededTestApp(t)
	adminToken, _ := loginUser(t, a, "admin", "admin12345")

	// Growth mode: monetization off — contacts visible for ACTIVE guides without paid sub.
	settingsRes := smokeRequest(t, a, http.MethodPut, "/api/v1/admin/settings", map[string]any{
		"guide_placement_payments_enabled": false,
	}, adminToken, nil)
	if settingsRes.code != http.StatusOK {
		t.Fatalf("admin settings: %d %s", settingsRes.code, settingsRes.body)
	}

	login := uniqueLogin("paywall_")
	guideToken, _ := registerUser(t, a, login, true)

	profileRes := smokeRequest(t, a, http.MethodPut, "/api/v1/account/guide/profile", map[string]any{
		"display_name": "Smoke Guide",
		"phone":        "+79009998877",
		"about":        "Test guide profile",
	}, guideToken, nil)
	if profileRes.code != http.StatusOK {
		t.Fatalf("update profile: %d %s", profileRes.code, profileRes.body)
	}
	profile := decodeJSON[struct {
		ID          int64  `json:"id"`
		WebsiteSlug string `json:"website_slug"`
	}](t, profileRes.body)
	if profile.WebsiteSlug == "" || profile.ID == 0 {
		t.Fatalf("missing guide id/slug: %+v", profile)
	}

	publicBefore := smokeRequest(t, a, http.MethodGet, "/api/v1/guides/"+profile.WebsiteSlug, nil, "", nil)
	if publicBefore.code != http.StatusNotFound {
		t.Fatalf("expected 404 for non-ACTIVE public guide, got %d %s", publicBefore.code, publicBefore.body)
	}

	plansRes := smokeRequest(t, a, http.MethodGet, "/api/v1/account/guide/billing/plans", nil, guideToken, nil)
	if plansRes.code != http.StatusOK {
		t.Fatalf("list plans: %d %s", plansRes.code, plansRes.body)
	}
	plans := decodeJSON[struct {
		Items []struct {
			ID       int64  `json:"id"`
			PlanType string `json:"plan_type"`
		} `json:"items"`
	}](t, plansRes.body)
	var placementPlan int64
	for _, p := range plans.Items {
		if p.PlanType == "GUIDE_PLACEMENT" || p.PlanType == "" {
			placementPlan = p.ID
			break
		}
	}
	if placementPlan == 0 && len(plans.Items) > 0 {
		placementPlan = plans.Items[0].ID
	}
	if placementPlan == 0 {
		t.Fatal("no subscription plans")
	}

	bypassRes := smokeRequest(t, a, http.MethodPost, "/api/v1/admin/guides/"+strconv.FormatInt(profile.ID, 10)+"/bypass", map[string]any{
		"plan_id": placementPlan,
	}, adminToken, nil)
	if bypassRes.code != http.StatusOK {
		t.Fatalf("admin bypass: %d %s", bypassRes.code, bypassRes.body)
	}

	publicAfter := smokeRequest(t, a, http.MethodGet, "/api/v1/guides/"+profile.WebsiteSlug, nil, "", nil)
	if publicAfter.code != http.StatusOK {
		t.Fatalf("public guide after bypass: %d %s", publicAfter.code, publicAfter.body)
	}
	after := decodeJSON[struct {
		Contacts struct {
			Visible bool   `json:"visible"`
			Phone   string `json:"phone"`
		} `json:"contacts"`
	}](t, publicAfter.body)
	if !after.Contacts.Visible || after.Contacts.Phone == "" {
		t.Fatal("expected visible contacts in growth mode after activation")
	}

	// Monetization on: contacts require active subscription.
	paidOn := smokeRequest(t, a, http.MethodPut, "/api/v1/admin/settings", map[string]any{
		"guide_placement_payments_enabled": true,
	}, adminToken, nil)
	if paidOn.code != http.StatusOK {
		t.Fatalf("enable payments: %d %s", paidOn.code, paidOn.body)
	}
	withPaywall := smokeRequest(t, a, http.MethodGet, "/api/v1/guides/"+profile.WebsiteSlug, nil, "", nil)
	if withPaywall.code != http.StatusOK {
		t.Fatalf("public guide with paywall: %d %s", withPaywall.code, withPaywall.body)
	}
	paywalled := decodeJSON[struct {
		Contacts struct {
			Visible bool `json:"visible"`
		} `json:"contacts"`
	}](t, withPaywall.body)
	if !paywalled.Contacts.Visible {
		t.Fatal("expected contacts visible with active subscription when payments enabled")
	}

	// restore growth mode for other tests
	_ = smokeRequest(t, a, http.MethodPut, "/api/v1/admin/settings", map[string]any{
		"guide_placement_payments_enabled": false,
	}, adminToken, nil)
}

func TestSmoke_touristCannotAccessGuideAPI(t *testing.T) {
	a := newTestApp(t)
	touristToken, _ := registerUser(t, a, uniqueLogin("rbac_t_"), false)
	res := smokeRequest(t, a, http.MethodGet, "/api/v1/account/guide/profile", nil, touristToken, nil)
	if res.code != http.StatusForbidden {
		t.Fatalf("expected 403 for tourist on guide API, got %d %s", res.code, res.body)
	}
	createCity := smokeRequest(t, a, http.MethodPost, "/api/v1/account/guide/geo/cities", map[string]any{
		"country_slug": "ua",
		"name":         "HackCity",
	}, touristToken, nil)
	if createCity.code != http.StatusForbidden && createCity.code != http.StatusNotFound {
		t.Fatalf("expected 403/404 for removed geo create, got %d %s", createCity.code, createCity.body)
	}
}

func TestSmoke_reviewCreate(t *testing.T) {
	a := newSeededTestApp(t)
	excRes := smokeRequest(t, a, http.MethodGet, "/api/v1/excursions/moscow-red-square", nil, "", nil)
	if excRes.code != http.StatusOK {
		t.Fatalf("get excursion: %d %s", excRes.code, excRes.body)
	}
	exc := decodeJSON[struct {
		ID int64 `json:"id"`
	}](t, excRes.body)

	touristToken, _ := registerUser(t, a, uniqueLogin("tourist_"), false)
	reviewRes := smokeRequest(t, a, http.MethodPost, "/api/v1/reviews", map[string]any{
		"excursion_id": exc.ID,
		"rating":       5,
		"text":         "Great smoke test review",
	}, touristToken, nil)
	if reviewRes.code != http.StatusCreated && reviewRes.code != http.StatusOK {
		var errBody struct {
			Error struct {
				Code string `json:"code"`
			} `json:"error"`
		}
		_ = json.Unmarshal(reviewRes.body, &errBody)
		if errBody.Error.Code != "REVIEW_ALREADY_EXISTS" {
			t.Fatalf("create review: %d %s", reviewRes.code, reviewRes.body)
		}
	}
}

func TestSmoke_excursionCRUD(t *testing.T) {
	a := newSeededTestApp(t)
	adminToken, _ := loginUser(t, a, "admin", "admin12345")
	settingsRes := smokeRequest(t, a, http.MethodPut, "/api/v1/admin/settings", map[string]any{
		"moderation_enabled": false,
	}, adminToken, nil)
	if settingsRes.code != http.StatusOK {
		t.Fatalf("disable moderation: %d %s", settingsRes.code, settingsRes.body)
	}

	guideToken, _ := registerUser(t, a, uniqueLogin("exc_"), true)

	cityRes := smokeRequest(t, a, http.MethodGet, "/api/v1/geo/cities/moscow", nil, "", nil)
	if cityRes.code != http.StatusOK {
		t.Fatalf("get city: %d %s", cityRes.code, cityRes.body)
	}
	city := decodeJSON[struct {
		ID int64 `json:"id"`
	}](t, cityRes.body)

	createRes := smokeRequest(t, a, http.MethodPost, "/api/v1/account/guide/excursions", map[string]any{
		"title":       "Smoke excursion",
		"description": "Short desc",
		"city_id":     city.ID,
		"max_guests":  4,
		"price_from":  1000,
		"currency":    "UAH",
		"type":        "INDIVIDUAL",
	}, guideToken, nil)
	if createRes.code != http.StatusCreated {
		t.Fatalf("create excursion: %d %s", createRes.code, createRes.body)
	}
	created := decodeJSON[struct {
		ID int64 `json:"id"`
	}](t, createRes.body)

	submitRes := smokeRequest(t, a, http.MethodPost, "/api/v1/account/guide/excursions/"+strconv.FormatInt(created.ID, 10)+"/submit", nil, guideToken, nil)
	if submitRes.code != http.StatusOK {
		t.Fatalf("submit excursion: %d %s", submitRes.code, submitRes.body)
	}
	submitted := decodeJSON[struct {
		Status string `json:"status"`
	}](t, submitRes.body)
	if submitted.Status != "PUBLISHED" {
		t.Fatalf("expected PUBLISHED without moderation, got %q", submitted.Status)
	}
}
