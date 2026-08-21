package httpx

import (
	"strings"
	"testing"
)

func TestPatchIndexSocialMeta_replacesLocalhost(t *testing.T) {
	html := `<!doctype html><html><head>
<meta property="og:image" content="http://localhost:5174/api/v1/media/public/d2b27d81f09874a08b4dc3293fe67f2e.webp" />
</head><body></body></html>`

	got := patchIndexSocialMeta(html, "svit.gaido.top")
	want := "https://svit.gaido.top/api/v1/media/public/d2b27d81f09874a08b4dc3293fe67f2e.webp"
	if !strings.Contains(got, want) {
		t.Fatalf("expected %q in %q", want, got)
	}
	if strings.Contains(got, "localhost") {
		t.Fatalf("localhost still present: %q", got)
	}
}

func TestPatchIndexSocialMeta_injectsWhenMissing(t *testing.T) {
	html := `<!doctype html><html><head><title>Gaido</title></head><body></body></html>`

	got := patchIndexSocialMeta(html, "gaido.top")
	for _, part := range []string{
		`property="og:title"`,
		`property="og:image" content="https://gaido.top/api/v1/media/public/d2b27d81f09874a08b4dc3293fe67f2e.webp"`,
		`name="twitter:card"`,
	} {
		if !strings.Contains(got, part) {
			t.Fatalf("expected %q in %q", part, got)
		}
	}
}
