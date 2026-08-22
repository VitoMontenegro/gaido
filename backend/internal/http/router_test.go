package httpx

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

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
