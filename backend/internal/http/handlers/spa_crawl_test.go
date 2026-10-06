package handlers

import (
	"strings"
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestExcursionCrawlParagraphsIncludesFacts(t *testing.T) {
	e := &domain.ExcursionView{
		Excursion: domain.Excursion{
			Title:           "Колізей",
			Description:     "Прогулянка історичним центром Рима з розповіддю про форум і пагорби.",
			Type:            "INDIVIDUAL",
			PriceFrom:       80,
			Currency:        "EUR",
			DurationMinutes: 180,
			Language:        "uk",
			MeetingPoint:    "біля Колізею",
			IncludedItems:   []string{"гід"},
			StructuredContent: domain.ExcursionStructuredContent{
				RouteStops: []string{"Колізей", "Форум"},
			},
		},
		CityName:    "Рим",
		CountryName: "Італія",
	}
	text := strings.Join(excursionCrawlParagraphs(e), " ")
	for _, want := range []string{"Рим", "індивідуальна", "3 години", "80 EUR", "українська", "біля Колізею", "Прогулянка"} {
		if !strings.Contains(text, want) {
			t.Fatalf("missing %q in %q", want, text)
		}
	}
	route := excursionRouteParagraphs(e)
	if len(route) != 2 || route[0] != "Колізей" {
		t.Fatalf("route = %#v", route)
	}
}

func TestGuideCrawlParagraphsListsExcursions(t *testing.T) {
	g := &domain.GuideProfile{
		DisplayName: "Олена",
		GuideType:   domain.GuideTypeGuide,
		About:       "Живу в Римі і проводжу авторські маршрути.",
	}
	text := strings.Join(guideCrawlParagraphs(g, "Рим", []domain.ExcursionView{{
		Excursion: domain.Excursion{Title: "Ватикан"},
	}}), " ")
	for _, want := range []string{"Олена", "Рим", "гід", "Ватикан"} {
		if !strings.Contains(text, want) {
			t.Fatalf("missing %q in %q", want, text)
		}
	}
}
