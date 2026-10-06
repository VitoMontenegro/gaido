package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
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
