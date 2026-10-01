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
	want := "https://gaido-ua.com/api/v1/media/public/d2b27d81f09874a08b4dc3293fe67f2e.webp"
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
		Title:       "Екскурсії в Туреччині — Gaido UA",
		Description: "Екскурсії в Туреччині — ціни, гіди",
		Canonical:   "https://gaido-ua.com/svit/countries/turkey",
		OgImage:     "https://gaido-ua.com/api/v1/media/public/cover.webp",
	}

	got := patchIndexHTML(html, "gaido-ua.com", "/svit/countries/turkey", meta)
	for _, part := range []string{
		`<title data-rh="true">Екскурсії в Туреччині — Gaido UA</title>`,
		`rel="canonical" href="https://gaido-ua.com/svit/countries/turkey"`,
		`property="og:title" content="Екскурсії в Туреччині — Gaido UA"`,
		`property="og:image" content="https://gaido-ua.com/api/v1/media/public/cover.webp"`,
		`<h1>Екскурсії в Туреччині</h1><p>Екскурсії в Туреччині — ціни, гіди</p></article></div>`,
	} {
		if !strings.Contains(got, part) {
			t.Fatalf("expected %q in %q", part, got)
		}
	}
}

func TestPatchIndexHTML_jsonLd(t *testing.T) {
	html := `<!doctype html><html><head><title>Gaido</title></head><body></body></html>`
	meta := &PageMeta{
		Title: "Test — Gaido UA",
		JsonLd: []string{
			`{"@context":"https://schema.org","@type":"Product","name":"Test"}`,
		},
	}
	got := patchIndexHTML(html, "svit.gaido-ua.com", "", meta)
	if !strings.Contains(got, `<script type="application/ld+json">`) {
		t.Fatalf("expected json-ld script in %q", got)
	}
	if !strings.Contains(got, `"@type":"Product"`) {
		t.Fatalf("expected Product schema in %q", got)
	}
}
func TestPatchIndexHTML_noIndex(t *testing.T) {
	html := `<!doctype html><html><head><title>Gaido</title></head><body></body></html>`
	got := patchIndexHTML(html, "svit.gaido-ua.com", "", &PageMeta{NoIndex: true, Title: "Login — Gaido UA"})
	if !strings.Contains(got, `name="robots" content="noindex, nofollow"`) {
		t.Fatalf("expected noindex in %q", got)
	}
	if strings.Contains(got, "<article>") {
		t.Fatalf("noindex pages should keep an empty root, got %q", got)
	}
}

func TestPatchIndexHTML_crawlBodyOffscreen(t *testing.T) {
	html := `<!doctype html><html><head><title>Gaido</title></head><body><div id="root"></div></body></html>`
	meta := &PageMeta{
		Title:       "Україномовні гіди — Gaido UA",
		Description: "Каталог гідів",
		Canonical:   "https://gaido-ua.com/svit/",
		CrawlBody: CrawlBody{
			H1:         "Україномовні гіди та екскурсії за кордоном",
			Paragraphs: []string{"Каталог приватних гідів і екскурсій українською за кордоном"},
			Sections: []CrawlSection{{
				Title: "Популярні напрямки",
				Links: []CrawlLink{{Label: "Італія", Href: "https://gaido-ua.com/svit/guides/countries/italy"}},
			}},
			FAQ: []CrawlFAQ{{Question: "Як забронювати?", Answer: "Напишіть гіду."}},
		},
	}
	got := patchIndexHTML(html, "gaido-ua.com", "/svit/", meta)
	for _, part := range []string{
		`<article aria-hidden="true" style="position:absolute;width:1px;height:1px;`,
		`<h1>Україномовні гіди та екскурсії за кордоном</h1>`,
		`<h2>Популярні напрямки</h2>`,
		`href="https://gaido-ua.com/svit/guides/countries/italy"`,
		`<h2>Часті запитання</h2>`,
		`<h3>Як забронювати?</h3>`,
	} {
		if !strings.Contains(got, part) {
			t.Fatalf("expected %q in %q", part, got)
		}
	}
}

func TestPatchIndexHTML_replacesExistingDataRhTitle(t *testing.T) {
	html := `<!doctype html><html><head><title data-rh="true">Gaido</title></head><body></body></html>`
	got := patchIndexHTML(html, "svit.gaido-ua.com", "", &PageMeta{Title: "Головна — Gaido UA"})
	if strings.Count(got, "<title") != 1 {
		t.Fatalf("expected 1 title tag, got %q", got)
	}
	if !strings.Contains(got, `<title data-rh="true">Головна — Gaido UA</title>`) {
		t.Fatalf("expected replaced title in %q", got)
	}
}

func TestPatchIndexHTML_singleDescription(t *testing.T) {
	html := `<!doctype html><html><head><title>Gaido</title>
<meta name="description" content="старий" />
</head><body><div id="root"></div></body></html>`
	meta := &PageMeta{
		Title:       "Рим — Gaido UA",
		Description: "Екскурсії українською у Римі",
		Canonical:   "https://gaido-ua.com/svit/city/rome",
	}
	once := patchIndexHTML(html, "gaido-ua.com", "/svit/city/rome", meta)
	twice := patchIndexHTML(once, "gaido-ua.com", "/svit/city/rome", meta)
	if strings.Count(twice, `name="description"`) != 1 {
		t.Fatalf("expected 1 description, got %q", twice)
	}
	if strings.Count(twice, `property="og:description"`) != 1 {
		t.Fatalf("expected 1 og:description, got %q", twice)
	}
	if !strings.Contains(twice, `<meta data-rh="true" name="description"`) {
		t.Fatalf("description must be helmet-owned: %q", twice)
	}
	if strings.Count(twice, `hreflang="uk"`) != 1 || strings.Count(twice, `hreflang="x-default"`) != 1 {
		t.Fatalf("expected one hreflang pair, got %q", twice)
	}
}
