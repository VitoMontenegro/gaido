package handlers

import (
	"context"
	"strings"
	"testing"
	"unicode/utf8"

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
		{"localhost", "/", true},
		{"127.0.0.1", "/", true},
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
	if meta.CrawlBody.H1 == "" {
		t.Fatal("missing crawl h1")
	}
	if len(meta.CrawlBody.FAQ) == 0 {
		t.Fatal("missing crawl FAQ")
	}
	if strings.Contains(strings.Join(meta.CrawlBody.Paragraphs, " "), "width:1px") {
		t.Fatal("hidden crawl copy")
	}
}

func TestResolveSpaPageMeta_portalNews(t *testing.T) {
	h := &Handlers{Cfg: config.Config{PublicBaseURL: "https://gaido-ua.com"}}
	meta := h.ResolveSpaPageMeta(context.Background(), "gaido-ua.com", "/news")
	if meta == nil {
		t.Fatal("expected portal news meta")
	}
	if meta.Canonical != "https://gaido-ua.com/news" {
		t.Fatalf("canonical = %q", meta.Canonical)
	}
	if !strings.Contains(meta.Title, seoNewsHeading) {
		t.Fatalf("title = %q", meta.Title)
	}
	svit := h.ResolveSpaPageMeta(context.Background(), "svit.gaido-ua.com", "/news")
	if svit != nil {
		t.Fatalf("svit news meta = %#v, want nil", svit)
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

func TestTruncateDescWordBoundary(t *testing.T) {
	got := truncateDesc("Програма камерної екскурсії: Монако та Монте-Карло Тривалість: 4–5 годин. Формат: авто + піші прогулянки.", 40)
	if strings.Contains(got, "авто") {
		t.Fatalf("cut inside the tail: %q", got)
	}
	if strings.HasSuffix(got, " ") || strings.Contains(got, "  ") {
		t.Fatalf("messy cut: %q", got)
	}
	if utf8.RuneCountInString(got) > 40 {
		t.Fatalf("longer than limit: %q", got)
	}
}

func TestHomePageJsonLdIncludesRichSchema(t *testing.T) {
	h := &Handlers{}
	joined := strings.Join(h.homePageJsonLd(context.Background(), "https://gaido-ua.com/svit", domain.HomeContent{
		FAQ: []domain.HomeFAQ{{Question: "Як забронювати?", Answer: "Напишіть гіду."}},
	}), "")
	if !strings.Contains(joined, `"@type":"Organization"`) {
		t.Fatal("missing Organization")
	}
	if !strings.Contains(joined, `"@type":"WebSite"`) {
		t.Fatal("missing WebSite")
	}
	if !strings.Contains(joined, `"@type":"WebPage"`) {
		t.Fatal("missing WebPage")
	}
	if !strings.Contains(joined, `"@type":"FAQPage"`) {
		t.Fatal("missing FAQPage")
	}
}

func TestSeoCityDescriptionSkipsSameCountry(t *testing.T) {
	got := seoCityExcursionsDescription("Монако", "Монако")
	if strings.Contains(got, "Монако, Монако") {
		t.Fatalf("duplicated place: %q", got)
	}
	rome := seoCityExcursionsDescription("Рим", "Італія")
	if !strings.Contains(rome, "Італія") {
		t.Fatalf("country dropped: %q", rome)
	}
}

func TestExcursionProductJSONOmitsZeroPrice(t *testing.T) {
	e := &domain.ExcursionView{Excursion: domain.Excursion{Title: "Без ціни", Currency: "EUR"}}
	product := buildExcursionProductJSON(e, "https://gaido-ua.com/svit", "https://gaido-ua.com/svit/excursion/1", nil)
	if _, ok := product["offers"]; ok {
		t.Fatal("zero price must not be an offer")
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

func TestResolveSpaPageMeta_svitHomeCrawlBody(t *testing.T) {
	h := &Handlers{Cfg: config.Config{PublicBaseURL: "https://gaido-ua.com"}}
	meta := h.ResolveSpaPageMeta(context.Background(), "gaido-ua.com", "/svit")
	if meta == nil {
		t.Fatal("expected svit home meta")
	}
	if meta.Canonical != "https://gaido-ua.com/svit/" {
		t.Fatalf("canonical = %q", meta.Canonical)
	}
	if meta.CrawlBody.H1 == "" {
		t.Fatal("missing h1")
	}
	joined := strings.Join(meta.CrawlBody.Paragraphs, " ")
	if !strings.Contains(joined, "україномовних гідів") && !strings.Contains(strings.ToLower(joined), "гід") {
		t.Fatalf("missing seo text: %q", joined)
	}
	if len(meta.CrawlBody.FAQ) == 0 {
		t.Fatal("missing home FAQ")
	}
}

func TestResolveSpaPageMeta_transportHome(t *testing.T) {
	h := &Handlers{Cfg: config.Config{PublicBaseURL: "https://gaido-ua.com"}}
	meta := h.ResolveSpaPageMeta(context.Background(), "gaido-ua.com", "/vezu")
	if meta == nil {
		t.Fatal("expected vezu home meta")
	}
	if meta.Canonical != "https://gaido-ua.com/vezu/" {
		t.Fatalf("canonical = %q", meta.Canonical)
	}
	if !strings.Contains(meta.Title, seoTransportHomeTitle) {
		t.Fatalf("title = %q", meta.Title)
	}
	if meta.CrawlBody.H1 != seoTransportHomeTitle {
		t.Fatalf("h1 = %q", meta.CrawlBody.H1)
	}
	if len(meta.CrawlBody.FAQ) == 0 {
		t.Fatal("missing transport FAQ")
	}
}

func TestResolveSpaPageMeta_servicesHome(t *testing.T) {
	h := &Handlers{Cfg: config.Config{PublicBaseURL: "https://gaido-ua.com"}}
	meta := h.ResolveSpaPageMeta(context.Background(), "gaido-ua.com", "/servis")
	if meta == nil {
		t.Fatal("expected servis home meta")
	}
	if meta.Canonical != "https://gaido-ua.com/servis/" {
		t.Fatalf("canonical = %q", meta.Canonical)
	}
	if !strings.Contains(meta.Title, seoServicesHomeTitle) {
		t.Fatalf("title = %q", meta.Title)
	}
	if meta.CrawlBody.H1 != seoServicesHomeTitle {
		t.Fatalf("h1 = %q", meta.CrawlBody.H1)
	}
	if len(meta.CrawlBody.Paragraphs) == 0 {
		t.Fatal("missing services intro")
	}
}

func TestResolveSpaPageMeta_noIndexHasEmptyBody(t *testing.T) {
	h := &Handlers{Cfg: config.Config{PublicBaseURL: "https://gaido-ua.com"}}
	meta := h.ResolveSpaPageMeta(context.Background(), "gaido-ua.com", "/svit/login")
	if meta == nil || !meta.NoIndex {
		t.Fatalf("expected noindex login, got %#v", meta)
	}
	if meta.CrawlBody.H1 != "" || len(meta.CrawlBody.Paragraphs) != 0 {
		t.Fatalf("noindex must not carry crawl body: %#v", meta.CrawlBody)
	}
}

func TestFaqAnswerTextStripsLinks(t *testing.T) {
	got := faqAnswerText(`місто — <a href="/city/london">Лондон</a>.`)
	if got != "місто — Лондон." {
		t.Fatalf("text = %q", got)
	}
	raw := buildFaqPageJSON([]faqItem{{
		question: "Де?",
		answer:   `місто — <a href="/city/london">Лондон</a>.`,
	}})
	entities := raw["mainEntity"].([]map[string]any)
	text := entities[0]["acceptedAnswer"].(map[string]any)["text"]
	if text != "місто — Лондон." {
		t.Fatalf("schema text = %#v", text)
	}
}
