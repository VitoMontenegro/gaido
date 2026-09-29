package httpx

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/http/cacheheaders"
)

func TestSpaFileServer_servesIndexForUnknownRoute(t *testing.T) {
	dir := t.TempDir()
	index := filepath.Join(dir, "index.html")
	if err := os.WriteFile(index, []byte("<html>ok</html>"), 0o644); err != nil {
		t.Fatal(err)
	}

	h := spaFileServer(dir, nil)
	req := httptest.NewRequest("GET", "/account/guide", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != 200 {
		t.Fatalf("status: got %d", rec.Code)
	}
	if body := rec.Body.String(); body != "<html>ok</html>" {
		t.Fatalf("body: got %q", body)
	}
	cc := rec.Header().Get("Cache-Control")
	if cc != cacheheaders.HTML {
		t.Fatalf("cache-control: got %q", cc)
	}
}

func TestSpaFileServer_assetsAreImmutable(t *testing.T) {
	dir := t.TempDir()
	assetsDir := filepath.Join(dir, "assets")
	if err := os.Mkdir(assetsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	chunk := filepath.Join(assetsDir, "GuidePage-abc.js")
	if err := os.WriteFile(chunk, []byte("export{}"), 0o644); err != nil {
		t.Fatal(err)
	}

	h := spaFileServer(dir, nil)
	req := httptest.NewRequest("GET", "/assets/GuidePage-abc.js", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != 200 {
		t.Fatalf("status: got %d", rec.Code)
	}
	cc := rec.Header().Get("Cache-Control")
	if cc != cacheheaders.Immutable {
		t.Fatalf("cache-control: got %q", cc)
	}
}

func TestSpaFileServer_staticImagesAreImmutable(t *testing.T) {
	dir := t.TempDir()
	imagesDir := filepath.Join(dir, "images", "home")
	if err := os.MkdirAll(imagesDir, 0o755); err != nil {
		t.Fatal(err)
	}
	img := filepath.Join(imagesDir, "hero.jpg")
	if err := os.WriteFile(img, []byte("jpeg"), 0o644); err != nil {
		t.Fatal(err)
	}

	h := spaFileServer(dir, nil)
	req := httptest.NewRequest("GET", "/images/home/hero.jpg", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != 200 {
		t.Fatalf("status: got %d", rec.Code)
	}
	cc := rec.Header().Get("Cache-Control")
	if cc != cacheheaders.Immutable {
		t.Fatalf("cache-control: got %q", cc)
	}
}

func TestSpaFileServer_fontsAreImmutable(t *testing.T) {
	dir := t.TempDir()
	fontsDir := filepath.Join(dir, "fonts")
	if err := os.Mkdir(fontsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	font := filepath.Join(fontsDir, "font.woff2")
	if err := os.WriteFile(font, []byte("woff2"), 0o644); err != nil {
		t.Fatal(err)
	}

	h := spaFileServer(dir, nil)
	req := httptest.NewRequest("GET", "/fonts/font.woff2", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != 200 {
		t.Fatalf("status: got %d", rec.Code)
	}
	cc := rec.Header().Get("Cache-Control")
	if cc != cacheheaders.Immutable {
		t.Fatalf("cache-control: got %q", cc)
	}
}

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

func TestLegacySectionRedirect_skipsAPI(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	req.Host = "vezu.gaido-ua.com"
	rec := httptest.NewRecorder()
	if legacySectionRedirect(rec, req) {
		t.Fatal("api must stay on the old host")
	}
}

func TestSpaLocation_servesSectionAssetAndIndex(t *testing.T) {
	root := t.TempDir()
	assetDir := filepath.Join(root, "svit", "assets")
	if err := os.MkdirAll(assetDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(assetDir, "app.js"), []byte("ok"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "svit", "index.html"), []byte("<html>svit</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{StaticRoot: root}

	dist, filePath := spaLocation("gaido-ua.com", "/svit/assets/app.js", cfg)
	if dist != filepath.Join(root, "svit") || filePath != "/assets/app.js" {
		t.Fatalf("asset location: dist=%s file=%s", dist, filePath)
	}
	rec := httptest.NewRecorder()
	spaFileServerPaths(dist, nil, filePath).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/svit/assets/app.js", nil))
	if rec.Code != 200 || rec.Body.String() != "ok" {
		t.Fatalf("asset: %d %q", rec.Code, rec.Body.String())
	}

	dist, filePath = spaLocation("gaido-ua.com", "/svit/guides/countries/spain", cfg)
	rec = httptest.NewRecorder()
	spaFileServerPaths(dist, nil, filePath).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/svit/guides/countries/spain", nil))
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "svit") {
		t.Fatalf("index: %d %q", rec.Code, rec.Body.String())
	}
}
