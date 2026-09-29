package handlers

import (
	"context"
	"strings"
	"testing"

	"github.com/vitomonte/experts-tourister/internal/config"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestExcursionSchemaImages_sectionBaseUsesApex(t *testing.T) {
	e := &domain.ExcursionView{}
	images := excursionSchemaImages(e, "https://gaido-ua.com/svit")
	want := "https://gaido-ua.com/api/v1/media/public/" + fallbackOgImageKey
	if len(images) != 1 || images[0] != want {
		t.Fatalf("images = %#v", images)
	}
}

func TestIsPortalHome(t *testing.T) {
	cases := []struct {
		host, path string
		want       bool
	}{
		{"gaido-ua.com", "/", true},
		{"www.gaido-ua.com", "/", true},
		{"gaido-ua.com", "", true},
		{"gaido-ua.com", "/svit", false},
		{"svit.gaido-ua.com", "/", false},
		{"localhost", "/", false},
	}
	for _, tc := range cases {
		if got := isPortalHome(tc.host, tc.path); got != tc.want {
			t.Fatalf("isPortalHome(%q, %q) = %v, want %v", tc.host, tc.path, got, tc.want)
		}
	}
}

func TestResolveSpaPageMeta_portalHome(t *testing.T) {
	h := &Handlers{Cfg: config.Config{PublicBaseURL: "https://gaido-ua.com"}}
	meta := h.ResolveSpaPageMeta(context.Background(), "gaido-ua.com", "/")
	if meta == nil {
		t.Fatal("expected portal home meta")
	}
	if meta.Canonical != "https://gaido-ua.com/" {
		t.Fatalf("canonical = %q", meta.Canonical)
	}
	if !strings.Contains(meta.Title, seoPortalHomeTitle) {
		t.Fatalf("title = %q", meta.Title)
	}
	joined := strings.Join(meta.JsonLd, "")
	if !strings.Contains(joined, `https://gaido-ua.com/svit/search?q={search_term_string}`) {
		t.Fatalf("missing SearchAction: %s", joined)
	}
	if !strings.Contains(joined, `"@type":"Organization"`) {
		t.Fatal("missing Organization")
	}
	if !strings.Contains(joined, `"@type":"FAQPage"`) {
		t.Fatal("missing FAQPage")
	}
	if !strings.Contains(joined, `"@type":"WebSite"`) {
		t.Fatal("missing WebSite")
	}
}

func TestSitemapHubLocations(t *testing.T) {
	got := sitemapHubLocations("https://gaido-ua.com")
	want := []string{
		"https://gaido-ua.com/",
		"https://gaido-ua.com/vezu/",
		"https://gaido-ua.com/servis/",
	}
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d: %#v", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("loc[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestResolveFeaturedExcursionsEmptyWithoutPlacements(t *testing.T) {
	h := &Handlers{}
	if got := h.ResolveFeaturedExcursions(context.Background(), 6); len(got) != 0 {
		t.Fatalf("featured = %#v", got)
	}
	if got := h.ResolveLatestExcursions(context.Background(), 8); len(got) != 0 {
		t.Fatalf("latest = %#v", got)
	}
}

func TestGuidesPage_stripsSvitPrefix(t *testing.T) {
	ok, path, base := guidesPage("gaido-ua.com", "/svit/guides/countries/spain/", "https://gaido-ua.com")
	if !ok || path != "/guides/countries/spain" || base != "https://gaido-ua.com/svit" {
		t.Fatalf("ok=%v path=%q base=%q", ok, path, base)
	}
}

func TestExcursionSchemaImagesFallsBack(t *testing.T) {
	e := &domain.ExcursionView{}
	images := excursionSchemaImages(e, "https://svit.gaido-ua.com")
	if len(images) != 1 || !strings.Contains(images[0], fallbackOgImageKey) {
		t.Fatalf("images = %#v", images)
	}
}

func TestExcursionProductJSONSingleAggregateRating(t *testing.T) {
	e := &domain.ExcursionView{
		Excursion: domain.Excursion{
			Title:    "Тейде",
			Slug:     "169",
			Currency: "EUR",
		},
		RatingAvg:   5,
		RatingCount: 1,
	}
	reviews := []domain.Review{{
		AuthorName: "Анастасія",
		Rating:     5,
		Text:       "Гарно",
		CreatedAt:  "2026-09-17T10:48:37Z",
	}}
	product := buildExcursionProductJSON(e, "https://svit.gaido-ua.com", "https://svit.gaido-ua.com/excursion/169", reviews)
	if _, ok := product["aggregateRating"].(map[string]any); !ok {
		t.Fatal("missing aggregateRating")
	}
	items, ok := product["review"].([]map[string]any)
	if !ok || len(items) != 1 {
		t.Fatalf("review = %#v", product["review"])
	}
	if _, dup := items[0]["aggregateRating"]; dup {
		t.Fatal("review must not carry aggregateRating")
	}
	if _, ok := items[0]["reviewRating"]; !ok {
		t.Fatal("missing reviewRating")
	}
}
