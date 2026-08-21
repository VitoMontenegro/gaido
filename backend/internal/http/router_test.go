package httpx

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestSpaFileServer_servesIndexForUnknownRoute(t *testing.T) {
	dir := t.TempDir()
	index := filepath.Join(dir, "index.html")
	if err := os.WriteFile(index, []byte("<html>ok</html>"), 0o644); err != nil {
		t.Fatal(err)
	}

	h := spaFileServer(dir, nil)
	req := httptest.NewRequest(http.MethodGet, "/account/guide", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d", rec.Code)
	}
	if body := rec.Body.String(); body != "<html>ok</html>" {
		t.Fatalf("body: got %q", body)
	}
	cc := rec.Header().Get("Cache-Control")
	if cc != "no-cache, no-store, must-revalidate" {
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
	req := httptest.NewRequest(http.MethodGet, "/assets/GuidePage-abc.js", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d", rec.Code)
	}
	cc := rec.Header().Get("Cache-Control")
	if cc != "public, max-age=31536000, immutable" {
		t.Fatalf("cache-control: got %q", cc)
	}
}
