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

	h := spaFileServer(dir)
	req := httptest.NewRequest(http.MethodGet, "/account/guide", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d", rec.Code)
	}
	if body := rec.Body.String(); body != "<html>ok</html>" {
		t.Fatalf("body: got %q", body)
	}
}
