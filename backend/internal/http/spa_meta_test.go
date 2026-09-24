package httpx

import (
	"strings"
	"testing"
)

func TestPatchIndexSocialMeta_replacesLocalhost(t *testing.T) {
	html := `<!doctype html><html><head>
<meta property="og:image" content="http://localhost:5174/api/v1/media/public/d2b27d81f09874a08b4dc3293fe67f2e.webp" />
</head><body></body></html>`

	got := patchIndexSocialMeta(html, "svit.gaido-ua.com")
	want := "https://svit.gaido-ua.com/api/v1/media/public/d2b27d81f09874a08b4dc3293fe67f2e.webp"
	if !strings.Contains(got, want) {
		t.Fatalf("expected %q in %q", want, got)
	}
	if strings.Contains(got, "localhost") {
		t.Fatalf("localhost still present: %q", got)
	}
}

func TestPatchIndexHTML_pageMeta(t *testing.T) {
	html := `<!doctype html><html><head><title>Gaido</title></head><body><div id="root"></div></body></html>`
	meta := &PageMeta{
		Title:       "Екскурсії в Туреччині — Gaido",
		Description: "Екскурсії в Туреччині — ціни, гіди",
		Canonical:   "https://svit.gaido-ua.com/countries/turkey",
		OgImage:     "https://svit.gaido-ua.com/api/v1/media/public/cover.webp",
	}

	got := patchIndexHTML(html, "svit.gaido-ua.com", meta)
	for _, part := range []string{
		`<title data-rh="true">Екскурсії в Туреччині — Gaido</title>`,
		`rel="canonical" href="https://svit.gaido-ua.com/countries/turkey"`,
		`property="og:title" content="Екскурсії в Туреччині — Gaido"`,
		`property="og:image" content="https://svit.gaido-ua.com/api/v1/media/public/cover.webp"`,
		`<div id="root"><article style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0"><h1>Екскурсії в Туреччині</h1><p>Екскурсії в Туреччині — ціни, гіди</p></article></div>`,
	} {
		if !strings.Contains(got, part) {
			t.Fatalf("expected %q in %q", part, got)
		}
	}
}

func TestPatchIndexHTML_jsonLd(t *testing.T) {
	html := `<!doctype html><html><head><title>Gaido</title></head><body></body></html>`
	meta := &PageMeta{
		Title: "Test — Gaido",
		JsonLd: []string{
			`{"@context":"https://schema.org","@type":"Product","name":"Test"}`,
		},
	}
	got := patchIndexHTML(html, "svit.gaido-ua.com", meta)
	if !strings.Contains(got, `<script type="application/ld+json">`) {
		t.Fatalf("expected json-ld script in %q", got)
	}
	if !strings.Contains(got, `"@type":"Product"`) {
		t.Fatalf("expected Product schema in %q", got)
	}
}
func TestPatchIndexHTML_noIndex(t *testing.T) {
	html := `<!doctype html><html><head><title>Gaido</title></head><body></body></html>`
	got := patchIndexHTML(html, "svit.gaido-ua.com", &PageMeta{NoIndex: true, Title: "Login — Gaido"})
	if !strings.Contains(got, `name="robots" content="noindex, nofollow"`) {
		t.Fatalf("expected noindex in %q", got)
	}
	if strings.Contains(got, "<article>") {
		t.Fatalf("noindex pages should keep an empty root, got %q", got)
	}
}

func TestPatchIndexHTML_replacesExistingDataRhTitle(t *testing.T) {
	html := `<!doctype html><html><head><title data-rh="true">Gaido</title></head><body></body></html>`
	got := patchIndexHTML(html, "svit.gaido-ua.com", &PageMeta{Title: "Головна — Gaido"})
	if strings.Count(got, "<title") != 1 {
		t.Fatalf("expected 1 title tag, got %q", got)
	}
	if !strings.Contains(got, `<title data-rh="true">Головна — Gaido</title>`) {
		t.Fatalf("expected replaced title in %q", got)
	}
}
