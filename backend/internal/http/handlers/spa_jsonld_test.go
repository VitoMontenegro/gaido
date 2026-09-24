package handlers

import (
	"strings"
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

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
