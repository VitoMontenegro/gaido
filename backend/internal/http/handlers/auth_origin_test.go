package handlers

import (
	"testing"

	"github.com/vitomonte/experts-tourister/internal/config"
)

func TestOriginAllowed(t *testing.T) {
	h := &Handlers{Cfg: config.Config{
		AppEnv:        "development",
		CORSOrigins:   []string{"http://localhost:5173"},
		StaticHostMap: map[string]string{"svit.gaido-ua.com": "svit", "localhost": "portal"},
	}}
	if !h.originAllowed("http://localhost:5174") {
		t.Fatal("localhost should be allowed in dev")
	}
	if !h.originAllowed("https://svit.gaido-ua.com") {
		t.Fatal("svit should be allowed")
	}
	if h.originAllowed("https://evil.example") {
		t.Fatal("unknown host must be rejected")
	}
}

func TestNormalizeAllowedOrigin_keepsSection(t *testing.T) {
	h := &Handlers{Cfg: config.Config{
		AppEnv:        "production",
		StaticHostMap: map[string]string{"gaido-ua.com": "portal"},
	}}
	got, ok := h.normalizeAllowedOrigin("https://gaido-ua.com/svit/register")
	if !ok || got != "https://gaido-ua.com/svit" {
		t.Fatalf("got %q ok=%v", got, ok)
	}
	if api := authAPIBase(got); api != "https://gaido-ua.com" {
		t.Fatalf("api base %q", api)
	}
}
