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
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/app"
	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/domain"
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
	return smokeRequestHeader(t, a, method, path, body, token, cookies, nil)
}

func smokeRequestHeader(t *testing.T, a *app.App, method, path string, body any, token string, cookies []*http.Cookie, extra http.Header) smokeResp {
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
	for k, vs := range extra {
		for _, v := range vs {
			req.Header.Add(k, v)
		}
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
	pending := decodeJSON[struct {
		DevToken string `json:"dev_token"`
	}](t, res.body)
	if pending.DevToken == "" {
		t.Fatal("register: empty dev_token")
	}
	confirm := smokeRequest(t, a, http.MethodGet, "/api/v1/auth/register/confirm?token="+pending.DevToken, nil, "", nil)
	if confirm.code != http.StatusFound {
		t.Fatalf("confirm: %d %s loc=%s", confirm.code, confirm.body, confirm.hdr.Get("Location"))
	}
	return refreshTokenWithCookies(t, a, parseSetCookies(confirm.hdr))
}

func refreshTokenWithCookies(t *testing.T, a *app.App, cookies []*http.Cookie) (string, []*http.Cookie) {
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
	next := parseSetCookies(res.hdr)
	if len(next) == 0 {
		next = cookies
	}
	return out.AccessToken, next
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
	token, _ := refreshTokenWithCookies(t, a, cookies)
	return token
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
	token, _ := registerUser(t, a, login, false)
	res := smokeRequest(t, a, http.MethodGet, "/api/v1/account/me", nil, token, nil)
	if res.code != http.StatusOK {
		t.Fatalf("me after confirm: %d %s", res.code, res.body)
	}
}

func TestSmoke_authChangePassword(t *testing.T) {
	a := newTestApp(t)
	login := uniqueLogin("pwchg_")
	token, _ := registerUser(t, a, login, false)
	bad := smokeRequest(t, a, http.MethodPut, "/api/v1/account/password", map[string]any{
		"current_password": "wrong-password",
		"new_password":     "newpass12345",
	}, token, nil)
	if bad.code != http.StatusBadRequest {
		t.Fatalf("wrong current: %d %s", bad.code, bad.body)
	}
	ok := smokeRequest(t, a, http.MethodPut, "/api/v1/account/password", map[string]any{
		"current_password": "smokepass12345",
		"new_password":     "newpass12345",
	}, token, nil)
	if ok.code != http.StatusOK {
		t.Fatalf("change: %d %s", ok.code, ok.body)
	}
	oldLogin := smokeRequest(t, a, http.MethodPost, "/api/v1/auth/login", map[string]any{
		"login": login, "password": "smokepass12345",
	}, "", nil)
	if oldLogin.code == http.StatusOK {
		t.Fatal("old password still works")
	}
	fresh := smokeRequest(t, a, http.MethodPost, "/api/v1/auth/login", map[string]any{
		"login": login, "password": "newpass12345",
	}, "", nil)
	if fresh.code != http.StatusOK {
		t.Fatalf("login with new password: %d %s", fresh.code, fresh.body)
	}
}

func TestSmoke_authConfirmInvalid(t *testing.T) {
	a := newTestApp(t)
	res := smokeRequest(t, a, http.MethodGet, "/api/v1/auth/register/confirm?token=deadbeef", nil, "", nil)
	if res.code != http.StatusFound {
		t.Fatalf("invalid confirm: %d", res.code)
	}
	if loc := res.hdr.Get("Location"); loc == "" || !strings.Contains(loc, "confirm=invalid") {
		t.Fatalf("location: %s", loc)
	}
}

func TestSmoke_authForgotReset(t *testing.T) {
	a := newTestApp(t)
	login := uniqueLogin("reset_")
	registerUser(t, a, login, false)
	res := smokeRequest(t, a, http.MethodPost, "/api/v1/auth/forgot-password", map[string]any{
		"email": login + "@test.local",
	}, "", nil)
	if res.code != http.StatusOK {
		t.Fatalf("forgot: %d %s", res.code, res.body)
	}
	out := decodeJSON[struct {
		DevToken string `json:"dev_token"`
	}](t, res.body)
	if out.DevToken == "" {
		t.Fatal("forgot: empty dev_token")
	}
	reset := smokeRequest(t, a, http.MethodPost, "/api/v1/auth/reset-password", map[string]any{
		"token":    out.DevToken,
		"password": "newpass12345",
	}, "", nil)
	if reset.code != http.StatusOK {
		t.Fatalf("reset: %d %s", reset.code, reset.body)
	}
	if _, cookies := loginUser(t, a, login, "newpass12345"); len(cookies) == 0 {
		t.Fatal("login after reset: no cookies")
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

func TestSmoke_authRefreshGuest(t *testing.T) {
	a := newTestApp(t)
	res := smokeRequest(t, a, http.MethodPost, "/api/v1/auth/refresh", nil, "", nil)
	if res.code != http.StatusOK {
		t.Fatalf("guest refresh: got %d body=%s", res.code, res.body)
	}
	out := decodeJSON[struct {
		Authenticated bool   `json:"authenticated"`
		AccessToken   string `json:"access_token"`
	}](t, res.body)
	if out.Authenticated || out.AccessToken != "" {
		t.Fatalf("guest refresh: expected empty session, got %+v", out)
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
	if res.code != http.StatusOK {
		t.Fatalf("expected 200 stub for tourist on guide profile, got %d %s", res.code, res.body)
	}
	createCity := smokeRequest(t, a, http.MethodPost, "/api/v1/account/guide/geo/cities", map[string]any{
		"country_slug": "ua",
		"name":         "HackCity",
	}, touristToken, nil)
	if createCity.code != http.StatusForbidden {
		t.Fatalf("expected 403 for tourist on guide geo create, got %d %s", createCity.code, createCity.body)
	}
	sharedCreate := smokeRequest(t, a, http.MethodPost, "/api/v1/account/geo/cities", map[string]any{
		"country_slug": "ua",
		"name":         "HackCity",
	}, touristToken, nil)
	if sharedCreate.code != http.StatusForbidden {
		t.Fatalf("expected 403 for tourist on geo create, got %d %s", sharedCreate.code, sharedCreate.body)
	}
}

func TestSmoke_userCanAttachGuideProfile(t *testing.T) {
	a := newTestApp(t)
	token, _ := registerUser(t, a, uniqueLogin("attach_g_"), false)
	before := smokeRequest(t, a, http.MethodGet, "/api/v1/account/guide/dashboard", nil, token, nil)
	if before.code != http.StatusForbidden {
		t.Fatalf("expected 403 dashboard before guide profile, got %d %s", before.code, before.body)
	}
	put := smokeRequest(t, a, http.MethodPut, "/api/v1/account/guide/profile", map[string]any{
		"display_name": "Dual Role Guide",
	}, token, nil)
	if put.code != http.StatusOK {
		t.Fatalf("attach guide profile: %d %s", put.code, put.body)
	}
	after := smokeRequest(t, a, http.MethodGet, "/api/v1/account/guide/dashboard", nil, token, nil)
	if after.code != http.StatusOK {
		t.Fatalf("expected 200 dashboard after guide profile, got %d %s", after.code, after.body)
	}
}

func TestSmoke_guideCreateGeoCity(t *testing.T) {
	a := newSeededTestApp(t)
	guideToken, _ := registerUser(t, a, uniqueLogin("geo_"), true)

	badRes := smokeRequest(t, a, http.MethodPost, "/api/v1/account/guide/geo/cities", map[string]any{
		"country_slug": "me",
		"name":         "Калашин",
	}, guideToken, nil)
	if badRes.code != http.StatusBadRequest {
		t.Fatalf("expected 400 for misspelled city, got %d %s", badRes.code, badRes.body)
	}

	createRes := smokeRequest(t, a, http.MethodPost, "/api/v1/account/geo/cities", map[string]any{
		"country_slug": "me",
		"name":         "колашин",
	}, guideToken, nil)
	if createRes.code != http.StatusCreated && createRes.code != http.StatusOK {
		t.Fatalf("create city: %d %s", createRes.code, createRes.body)
	}
	created := decodeJSON[struct {
		ID      int64  `json:"id"`
		Name    string `json:"name"`
		Created bool   `json:"created"`
	}](t, createRes.body)
	if created.ID <= 0 || created.Name != "Колашин" {
		t.Fatalf("unexpected create response: %+v", created)
	}

	dupRes := smokeRequest(t, a, http.MethodPost, "/api/v1/account/guide/geo/cities", map[string]any{
		"country_slug": "me",
		"name":         "Колашин",
	}, guideToken, nil)
	if dupRes.code != http.StatusOK {
		t.Fatalf("duplicate city: %d %s", dupRes.code, dupRes.body)
	}
	dup := decodeJSON[struct {
		ID      int64 `json:"id"`
		Created bool  `json:"created"`
	}](t, dupRes.body)
	if dup.ID != created.ID || dup.Created {
		t.Fatalf("expected existing city id=%d created=false, got %+v", created.ID, dup)
	}
}

func TestSmoke_carrierCreateGeoCity(t *testing.T) {
	a := newSeededTestApp(t)
	token, _ := registerUser(t, a, uniqueLogin("cgeo_"), false)
	save := smokeRequest(t, a, http.MethodPut, "/api/v1/account/carrier/profile", map[string]any{
		"display_name": "Carrier Geo",
		"carrier_type": "private",
	}, token, nil)
	if save.code != http.StatusOK {
		t.Fatalf("save carrier: %d %s", save.code, save.body)
	}
	res := smokeRequest(t, a, http.MethodPost, "/api/v1/account/geo/cities", map[string]any{
		"country_slug": "pl",
		"name":         "Люблін",
	}, token, nil)
	if res.code != http.StatusCreated && res.code != http.StatusOK {
		t.Fatalf("carrier create city: %d %s", res.code, res.body)
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

func TestSmoke_favoritesGuestAndImport(t *testing.T) {
	a := newTestApp(t)

	guestToggle := smokeRequest(t, a, http.MethodPost, "/api/v1/favorites", map[string]any{
		"target_type": "EXCURSION",
		"target_id":   int64(1),
	}, "", nil)
	if guestToggle.code != http.StatusUnauthorized {
		t.Fatalf("guest toggle: %d %s", guestToggle.code, guestToggle.body)
	}

	resolve := smokeRequest(t, a, http.MethodPost, "/api/v1/favorites/resolve", map[string]any{
		"items": []map[string]any{{"target_type": "EXCURSION", "target_id": 1}},
	}, "", nil)
	if resolve.code != http.StatusOK {
		t.Fatalf("resolve: %d %s", resolve.code, resolve.body)
	}

	token, _ := registerUser(t, a, uniqueLogin("fav_"), false)
	toggle := smokeRequest(t, a, http.MethodPost, "/api/v1/favorites", map[string]any{
		"target_type": "EXCURSION",
		"target_id":   int64(1),
	}, token, nil)
	if toggle.code != http.StatusOK {
		t.Fatalf("toggle: %d %s", toggle.code, toggle.body)
	}
	imp := smokeRequest(t, a, http.MethodPost, "/api/v1/favorites/import", map[string]any{
		"items": []map[string]any{{"target_type": "GUIDE", "target_id": 1}},
	}, token, nil)
	if imp.code != http.StatusOK {
		t.Fatalf("import: %d %s", imp.code, imp.body)
	}
	list := smokeRequest(t, a, http.MethodGet, "/api/v1/favorites", nil, token, nil)
	if list.code != http.StatusOK {
		t.Fatalf("list: %d %s", list.code, list.body)
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

func TestSmoke_inquiryChat(t *testing.T) {
	a := newTestApp(t)
	guideToken, _ := registerUser(t, a, uniqueLogin("inq_g_"), true)
	profile := smokeRequest(t, a, http.MethodGet, "/api/v1/account/guide/profile", nil, guideToken, nil)
	if profile.code != http.StatusOK {
		t.Fatalf("guide profile: %d %s", profile.code, profile.body)
	}
	guide := decodeJSON[struct {
		ID int64 `json:"id"`
	}](t, profile.body)
	touristToken, _ := registerUser(t, a, uniqueLogin("inq_t_"), false)
	created := smokeRequest(t, a, http.MethodPost, "/api/v1/inquiries", map[string]any{
		"guide_id":       guide.ID,
		"party_size":     2,
		"language":       "uk",
		"preferred_date": time.Now().AddDate(0, 0, 7).Format("2006-01-02"),
		"notes":          "Чи є вільна дата?",
	}, touristToken, nil)
	if created.code != http.StatusCreated && created.code != http.StatusOK {
		t.Fatalf("create inquiry: %d %s", created.code, created.body)
	}
	inq := decodeJSON[struct {
		ID     int64  `json:"id"`
		Status string `json:"status"`
	}](t, created.body)
	if inq.ID <= 0 {
		t.Fatalf("expected inquiry id, got %s", created.body)
	}
	inbox := smokeRequest(t, a, http.MethodGet, "/api/v1/account/guide/inquiries?status=new", nil, guideToken, nil)
	if inbox.code != http.StatusOK {
		t.Fatalf("guide inbox: %d %s", inbox.code, inbox.body)
	}
	reply := smokeRequest(t, a, http.MethodPost, "/api/v1/inquiries/"+strconv.FormatInt(inq.ID, 10)+"/messages", map[string]any{
		"body": "Так, дата вільна.",
	}, guideToken, nil)
	if reply.code != http.StatusCreated {
		t.Fatalf("guide reply: %d %s", reply.code, reply.body)
	}
	msgs := smokeRequest(t, a, http.MethodGet, "/api/v1/inquiries/"+strconv.FormatInt(inq.ID, 10)+"/messages", nil, touristToken, nil)
	if msgs.code != http.StatusOK {
		t.Fatalf("tourist messages: %d %s", msgs.code, msgs.body)
	}
	decoded := decodeJSON[struct {
		Items []struct {
			AuthorRole string `json:"author_role"`
			Kind       string `json:"kind"`
		} `json:"items"`
	}](t, msgs.body)
	if len(decoded.Items) < 2 {
		t.Fatalf("expected system+notes+reply messages, got %s", msgs.body)
	}
	when := time.Now().AddDate(0, 0, 8).Truncate(time.Hour).UTC()
	book := smokeRequest(t, a, http.MethodPatch, "/api/v1/inquiries/"+strconv.FormatInt(inq.ID, 10), map[string]any{
		"status":       "pending",
		"scheduled_at": when.Format(time.RFC3339),
	}, guideToken, nil)
	if book.code != http.StatusOK {
		t.Fatalf("guide schedule: %d %s", book.code, book.body)
	}
	confirm := smokeRequest(t, a, http.MethodPatch, "/api/v1/inquiries/"+strconv.FormatInt(inq.ID, 10), map[string]any{
		"status": "booked",
	}, touristToken, nil)
	if confirm.code != http.StatusOK {
		t.Fatalf("tourist confirm: %d %s", confirm.code, confirm.body)
	}
}

func grantRole(t *testing.T, login, role string) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	conn, err := pgx.Connect(ctx, testConfig().DatabaseURL)
	if err != nil {
		t.Fatalf("grant role connect: %v", err)
	}
	defer conn.Close(ctx)
	tag, err := conn.Exec(ctx, `
		UPDATE users SET roles = array_append(roles, $2), updated_at=NOW()
		WHERE login=$1 AND NOT ($2 = ANY(roles)) AND deleted_at IS NULL`, login, role)
	if err != nil {
		t.Fatalf("grant role: %v", err)
	}
	if tag.RowsAffected() == 0 {
		t.Fatalf("grant role: no user %s", login)
	}
}

func TestSmoke_adminImpersonateGuide(t *testing.T) {
	a := newTestApp(t)
	adminLogin := uniqueLogin("imp_a_")
	adminToken, _ := registerUser(t, a, adminLogin, false)
	grantRole(t, adminLogin, domain.RoleAdmin)
	guideLogin := uniqueLogin("imp_g_")
	guideToken, _ := registerUser(t, a, guideLogin, true)
	put := smokeRequest(t, a, http.MethodPut, "/api/v1/account/guide/profile", map[string]any{
		"display_name": "Impersonated Guide",
	}, guideToken, nil)
	if put.code != http.StatusOK {
		t.Fatalf("guide profile: %d %s", put.code, put.body)
	}
	profile := decodeJSON[struct {
		ID int64 `json:"id"`
	}](t, put.body)
	if profile.ID == 0 {
		t.Fatalf("missing guide id: %s", put.body)
	}

	start := smokeRequest(t, a, http.MethodPost, "/api/v1/admin/guides/"+strconv.FormatInt(profile.ID, 10)+"/impersonate", map[string]any{}, adminToken, nil)
	if start.code != http.StatusOK {
		t.Fatalf("impersonate start: %d %s", start.code, start.body)
	}

	hdr := http.Header{}
	hdr.Set("X-Act-As-Guide-Id", strconv.FormatInt(profile.ID, 10))

	me := smokeRequestHeader(t, a, http.MethodGet, "/api/v1/account/me", nil, adminToken, nil, hdr)
	if me.code != http.StatusOK {
		t.Fatalf("me as guide: %d %s", me.code, me.body)
	}
	meBody := decodeJSON[struct {
		Login         string   `json:"login"`
		Roles         []string `json:"roles"`
		Impersonation struct {
			Active  bool  `json:"active"`
			GuideID int64 `json:"guide_id"`
		} `json:"impersonation"`
	}](t, me.body)
	hasGuide := false
	for _, role := range meBody.Roles {
		if role == "ROLE_GUIDE" {
			hasGuide = true
			break
		}
	}
	if meBody.Login != guideLogin || !meBody.Impersonation.Active || meBody.Impersonation.GuideID != profile.ID || !hasGuide {
		t.Fatalf("expected impersonated guide user, got %+v body=%s", meBody, me.body)
	}

	prof := smokeRequestHeader(t, a, http.MethodGet, "/api/v1/account/guide/profile", nil, adminToken, nil, hdr)
	if prof.code != http.StatusOK {
		t.Fatalf("guide profile as admin: %d %s", prof.code, prof.body)
	}
	exc := smokeRequestHeader(t, a, http.MethodGet, "/api/v1/account/guide/excursions", nil, adminToken, nil, hdr)
	if exc.code != http.StatusOK {
		t.Fatalf("guide excursions as admin: %d %s", exc.code, exc.body)
	}

	pw := smokeRequestHeader(t, a, http.MethodPut, "/api/v1/account/password", map[string]any{
		"current_password": "admin12345",
		"new_password":     "shouldnotwork1",
	}, adminToken, nil, hdr)
	if pw.code != http.StatusForbidden {
		t.Fatalf("expected 403 password while impersonating, got %d %s", pw.code, pw.body)
	}

	touristToken, _ := registerUser(t, a, uniqueLogin("imp_t_"), false)
	denied := smokeRequestHeader(t, a, http.MethodGet, "/api/v1/account/me", nil, touristToken, nil, hdr)
	if denied.code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-admin impersonation, got %d %s", denied.code, denied.body)
	}
}
