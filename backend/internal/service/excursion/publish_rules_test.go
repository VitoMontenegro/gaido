package excursion

import (
	"strings"
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

func completeExcursion() *domain.Excursion {
	desc := "<p>" + strings.Repeat("Цікава екскурсія. ", 12) + "</p>"
	return &domain.Excursion{
		Title: "Прогулянка старим містом", CityID: 1, PriceFrom: 50, DurationMinutes: 120,
		MeetingPoint: "Біля фонтану", BodyHTML: desc,
		StructuredContent: domain.ExcursionStructuredContent{Gallery: []string{"a", "b", "c"}, RouteStops: []string{"Ратуша"}},
		IncludedItems: []string{"Гід"},
	}
}

func codes(items []MissingItem) map[string]bool {
	m := map[string]bool{}
	for _, i := range items {
		m[i.Code] = true
	}
	return m
}

func TestValidateForPublishComplete(t *testing.T) {
	if got := ValidateForPublish(completeExcursion(), true); len(got) != 0 {
		t.Fatalf("expected no missing items, got %+v", got)
	}
}

func TestValidateForPublishEmpty(t *testing.T) {
	got := codes(ValidateForPublish(&domain.Excursion{}, false))
	for _, c := range []string{"title", "city", "description", "price", "duration", "photos", "route", "terms", "meeting_point", "dates"} {
		if !got[c] {
			t.Errorf("expected missing %q", c)
		}
	}
}

func TestValidateForPublishRules(t *testing.T) {
	e := completeExcursion()
	e.StructuredContent.Gallery = []string{"a", "b"}
	e.PriceFrom = 0
	got := codes(ValidateForPublish(e, true))
	if !got["photos"] || !got["price"] || len(got) != 2 {
		t.Fatalf("unexpected: %v", got)
	}
	e = completeExcursion()
	e.BodyHTML = "<p>" + strings.Repeat("a", 149) + "</p>"
	if !codes(ValidateForPublish(e, true))["description"] {
		t.Fatal("149 chars must be too short")
	}
	e.BodyHTML = "<p>" + strings.Repeat("a", 150) + "</p>"
	if codes(ValidateForPublish(e, true))["description"] {
		t.Fatal("150 chars must pass")
	}
}
