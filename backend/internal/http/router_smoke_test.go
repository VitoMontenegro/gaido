package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"log/slog"

	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/http/handlers"
	"github.com/vitomonte/experts-tourister/internal/rbac"
)

func TestMarketplaceRoutesExist(t *testing.T) {
	enforcer, err := rbac.New()
	if err != nil {
		t.Fatalf("rbac: %v", err)
	}
	router := NewRouter(config.Config{StaticDir: t.TempDir()}, slog.Default(), &handlers.Handlers{Enforcer: enforcer})

	cases := []struct{ method, path string }{
		{"GET", "/api/v1/admin/providers"},
		{"GET", "/api/v1/admin/offerings"},
		{"GET", "/api/v1/admin/complaints"},
		{"GET", "/api/v1/moderator/providers"},
		{"GET", "/api/v1/moderator/offerings"},
		{"GET", "/api/v1/moderator/complaints"},
		{"POST", "/api/v1/account/geo/cities"},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code == http.StatusNotFound {
			t.Errorf("%s %s not registered", tc.method, tc.path)
		}
	}
}
