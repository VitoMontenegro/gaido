package httpx

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/http/handlers"
)

func TestLegacySectionRedirect_preservesPathAndQuery(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/guides/countries/spain?q=1", nil)
	req.Host = "svit.gaido-ua.com"
	rec := httptest.NewRecorder()
	if !legacySectionRedirect(rec, req) {
		t.Fatal("expected redirect")
	}
	if rec.Code != http.StatusMovedPermanently {
		t.Fatalf("status: got %d", rec.Code)
	}
	if got := rec.Header().Get("Location"); got != "https://gaido-ua.com/svit/guides/countries/spain?q=1" {
		t.Fatalf("location: got %q", got)
	}
}

func TestLegacySectionRedirect_sitemapStaysOnApex(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/sitemap.xml", nil)
	req.Host = "servis.gaido-ua.com"
	rec := httptest.NewRecorder()
	if !legacySectionRedirect(rec, req) {
		t.Fatal("expected redirect")
	}
	if got := rec.Header().Get("Location"); got != "https://gaido-ua.com/sitemap.xml" {
		t.Fatalf("location: got %q", got)
	}
}

func TestLegacySectionRedirect_keepsExistingPrefix(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/svit/city/monaco", nil)
	req.Host = "svit.gaido-ua.com"
	rec := httptest.NewRecorder()
	if !legacySectionRedirect(rec, req) {
		t.Fatal("expected redirect")
	}
	if got := rec.Header().Get("Location"); got != "https://gaido-ua.com/svit/city/monaco" {
		t.Fatalf("location: got %q", got)
	}
}

func TestSectionTrailingSlashRedirect(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/svit", nil)
	req.Host = "gaido-ua.com"
	rec := httptest.NewRecorder()
	if !sectionTrailingSlashRedirect(rec, req) {
		t.Fatal("expected redirect")
	}
	if rec.Code != http.StatusMovedPermanently {
		t.Fatalf("status: got %d", rec.Code)
	}
	if got := rec.Header().Get("Location"); got != "https://gaido-ua.com/svit/" {
		t.Fatalf("location: got %q", got)
	}
}

func TestCollapsedSectionRedirect_doubledSvit(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/svit/svit/city/monaco?q=1", nil)
	req.Host = "gaido-ua.com"
	rec := httptest.NewRecorder()
	if !collapsedSectionRedirect(rec, req) {
		t.Fatal("expected redirect")
	}
	if rec.Code != http.StatusMovedPermanently {
		t.Fatalf("status: got %d", rec.Code)
	}
	if got := rec.Header().Get("Location"); got != "https://gaido-ua.com/svit/city/monaco?q=1" {
		t.Fatalf("location: got %q", got)
	}
}

func TestLegacySectionRedirect_skipsAPI(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	req.Host = "vezu.gaido-ua.com"
	rec := httptest.NewRecorder()
	if legacySectionRedirect(rec, req) {
		t.Fatal("api must stay on the old host")
	}
}

func TestRobotsTxt_getAndHead(t *testing.T) {
	h := &handlers.Handlers{Cfg: config.Config{PublicBaseURL: "https://gaido-ua.com"}}
	r := NewRouter(config.Config{CORSOrigins: []string{"https://gaido-ua.com"}}, slog.New(slog.NewTextHandler(io.Discard, nil)), h)
	for _, method := range []string{http.MethodGet, http.MethodHead} {
		req := httptest.NewRequest(method, "/robots.txt", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s /robots.txt status %d", method, rec.Code)
		}
		if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/plain") {
			t.Fatalf("%s content-type %q", method, ct)
		}
		if rec.Header().Get("Cache-Control") != "public, max-age=300" {
			t.Fatalf("%s cache-control %q", method, rec.Header().Get("Cache-Control"))
		}
		if method == http.MethodGet {
			body := rec.Body.String()
			if !strings.Contains(body, "User-agent: *") || !strings.Contains(body, "Sitemap: https://gaido-ua.com/sitemap.xml") {
				t.Fatalf("robots body: %s", body)
			}
		}
	}
}
