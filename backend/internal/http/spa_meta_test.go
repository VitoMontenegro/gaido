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

func TestPatchIndexHTML_pageMeta(t *testing.T) {
	html := `<!doctype html><html><head><title>Gaido</title></head><body></body></html>`
	meta := &PageMeta{
		Title:       "Екскурсії в Туреччині — Gaido",
		Description: "Екскурсії в Туреччині — ціни, гіди",
		Canonical:   "https://svit.gaido.top/countries/turkey",
		OgImage:     "https://svit.gaido.top/api/v1/media/public/cover.webp",
	}

	got := patchIndexHTML(html, "svit.gaido.top", meta)
	for _, part := range []string{
		"<title>Екскурсії в Туреччині — Gaido</title>",
		`rel="canonical" href="https://svit.gaido.top/countries/turkey"`,
		`property="og:title" content="Екскурсії в Туреччині — Gaido"`,
		`property="og:image" content="https://svit.gaido.top/api/v1/media/public/cover.webp"`,
	} {
		if !strings.Contains(got, part) {
			t.Fatalf("expected %q in %q", part, got)
		}
	}
}

func TestPatchIndexHTML_noIndex(t *testing.T) {
	html := `<!doctype html><html><head><title>Gaido</title></head><body></body></html>`
	got := patchIndexHTML(html, "svit.gaido.top", &PageMeta{NoIndex: true, Title: "Login — Gaido"})
	if !strings.Contains(got, `name="robots" content="noindex, nofollow"`) {
		t.Fatalf("expected noindex in %q", got)
	}
}
