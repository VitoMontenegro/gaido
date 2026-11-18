package excursion

import (
	"strings"
	"unicode/utf8"

	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/sanitize"
)

// Мінімальні вимоги до публікації екскурсії (ТЗ, розділ 2).
const (
	MinTitleRunes        = 5
	MinDescriptionRunes  = 150
	MinPhotosForPublish  = 3
	MinMeetingPointRunes = 3
)

// MissingItem описує одну незаповнену вимогу публікації.
type MissingItem struct {
	Code     string `json:"code"`
	Step     string `json:"step"`
	Required bool   `json:"required"`
	Message  string `json:"message"`
}

func descriptionText(e *domain.Excursion) string {
	html := ""
	switch {
	case e.DescriptionHTML != nil && strings.TrimSpace(*e.DescriptionHTML) != "":
		html = *e.DescriptionHTML
	case strings.TrimSpace(e.BodyHTML) != "":
		html = e.BodyHTML
	default:
		html = e.Description
	}
	text := strings.ReplaceAll(sanitize.Text(html), " ", " ")
	return strings.TrimSpace(text)
}

func hasNonEmpty(items []string) bool {
	for _, it := range items {
		if strings.TrimSpace(it) != "" {
			return true
		}
	}
	return false
}

func photoCount(e *domain.Excursion) int {
	n := 0
	for _, g := range e.StructuredContent.Gallery {
		if strings.TrimSpace(g) != "" {
			n++
		}
	}
	if n == 0 && strings.TrimSpace(e.CoverImageURL) != "" {
		n = 1
	}
	return n
}

// ValidateForPublish — чиста функція: повертає список обовʼязкових пунктів,
// яких не вистачає для публікації. hasUpcomingDates — чи є хоча б одна відкрита майбутня дата.
func ValidateForPublish(e *domain.Excursion, hasUpcomingDates bool) []MissingItem {
	var out []MissingItem
	add := func(code, step, msg string) {
		out = append(out, MissingItem{Code: code, Step: step, Required: true, Message: msg})
	}
	if utf8.RuneCountInString(strings.TrimSpace(e.Title)) < MinTitleRunes {
		add("title", "about", "Додайте зрозумілу назву")
	}
	if e.CityID <= 0 {
		add("city", "about", "Оберіть місто")
	}
	if utf8.RuneCountInString(descriptionText(e)) < MinDescriptionRunes {
		add("description", "description", "Опишіть екскурсію щонайменше у 150 символах")
	}
	if e.PriceFrom <= 0 {
		add("price", "format", "Вкажіть ціну більше нуля")
	}
	if e.DurationMinutes <= 0 {
		add("duration", "format", "Вкажіть тривалість екскурсії")
	}
	if n := photoCount(e); n < MinPhotosForPublish {
		add("photos", "media", "Додайте щонайменше 3 фото")
	}
	if !hasNonEmpty(e.StructuredContent.RouteStops) {
		add("route", "route", "Додайте хоча б одну точку маршруту")
	}
	if !hasNonEmpty(e.IncludedItems) {
		add("terms", "terms", "Вкажіть, що входить у вартість")
	}
	if utf8.RuneCountInString(strings.TrimSpace(e.MeetingPoint)) < MinMeetingPointRunes {
		add("meeting_point", "route", "Вкажіть місце зустрічі")
	}
	if !hasUpcomingDates {
		add("dates", "dates", "Відкрийте хоча б одну дату в календарі")
	}
	return out
}
