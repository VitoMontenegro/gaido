package handlers

import (
	"testing"

	"github.com/vitomonte/experts-tourister/internal/config"
)

func TestOriginAllowed(t *testing.T) {
	h := &Handlers{Cfg: config.Config{
		AppEnv:        "development",
		CORSOrigins:   []string{"http://localhost:5173"},
		StaticHostMap: map[string]string{"svit.gaido.top": "svit", "localhost": "portal"},
	}}
	if !h.originAllowed("http://localhost:5174") {
		t.Fatal("localhost should be allowed in dev")
	}
	if !h.originAllowed("https://svit.gaido.top") {
		t.Fatal("svit should be allowed")
	}
	if h.originAllowed("https://evil.example") {
		t.Fatal("unknown host must be rejected")
	}
}
