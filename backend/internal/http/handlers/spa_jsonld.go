package handlers

import (
	"context"
	"encoding/json"
	"math"
	"strings"
	"time"

	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

var countrySlugToISO = map[string]string{
	"russia":         "RU",
	"turkey":         "TR",
	"italy":          "IT",
	"georgia":        "GE",
	"spain":          "ES",
	"united-kingdom": "GB",
	"united-states":  "US",
	"ireland":        "IE",
	"uae":            "AE",
	"south-korea":    "KR",
	"north-korea":    "KP",
	"czechia":        "CZ",
}

var languageRegion = map[string]string{
	"uk": "UA", "en": "US", "ru": "RU", "tr": "TR",
	"de": "DE", "fr": "FR", "es": "ES", "it": "IT", "pl": "PL",
}

func countryISOFromSlug(slug string) string {
	if slug == "" {
		return ""
	}
	slug = strings.ToLower(slug)
	if iso, ok := countrySlugToISO[slug]; ok {
		return iso
	}
	if len(slug) == 2 {
		return strings.ToUpper(slug)
	}
	return ""
}

func schemaLanguage(code string) string {
	lang := strings.ToLower(strings.TrimSpace(code))
	if lang == "" {
		lang = "uk"
	}
	region, ok := languageRegion[lang]
	if !ok {
		region = strings.ToUpper(lang)
	}
	return lang + "-" + region
}

func (h *Handlers) nearestExcursionSlot(ctx context.Context, e *domain.ExcursionView) *postgres.PublicDate {
	from := time.Now().UTC()
	to := from.AddDate(0, 6, 0)

	var dates []postgres.PublicDate
	var err error
	if e.Type == "GROUP" {
		dates, err = h.Calendar.ListUpcomingExcursionDates(ctx, e.ID, from, to)
	} else {
		dates, err = h.Calendar.ListUpcomingByGuide(ctx, e.GuideID, from, to)
	}
	if err != nil || len(dates) == 0 {
		return nil
	}
	return &dates[0]
}

func (h *Handlers) excursionDetailJsonLd(ctx context.Context, e *domain.ExcursionView, base string) []string {
	url := base + "/excursion/" + e.Slug
	var out []string

	if raw := marshalJSONLD(buildExcursionProductJSON(e, base, url)); raw != "" {
		out = append(out, raw)
	}
	if slot := h.nearestExcursionSlot(ctx, e); slot != nil {
		if raw := marshalJSONLD(buildExcursionEventJSON(e, base, url, slot.StartsAt, slot.EndsAt)); raw != "" {
			out = append(out, raw)
		}
	}
	if raw := marshalJSONLD(buildExcursionBreadcrumbJSON(e, base, url)); raw != "" {
		out = append(out, raw)
	}
	return out
}

func marshalJSONLD(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return ""
	}
	return string(b)
}

func buildExcursionProductJSON(e *domain.ExcursionView, base, url string) map[string]any {
	desc := truncateDesc(e.Description, 500)
	if desc == "" {
		desc = truncateDesc(e.Title, 500)
	}

	product := map[string]any{
		"@context": "https://schema.org",
		"@type":    "Product",
		"@id":      url + "#product",
		"name":     e.Title,
		"url":      url,
		"offers": map[string]any{
			"@type":         "Offer",
			"price":         e.PriceFrom,
			"priceCurrency": e.Currency,
			"availability":  "https://schema.org/InStock",
			"url":           url,
		},
	}
	if desc != "" {
		product["description"] = desc
	}
	if img := strings.TrimSpace(e.CoverImageURL); img != "" {
		product["image"] = []string{base + "/api/v1/media/public/" + img}
	}
	if e.GuideName != "" {
		product["brand"] = map[string]any{
			"@type": "Brand",
			"name":  e.GuideName,
		}
	}
	if e.RatingCount > 0 {
		product["aggregateRating"] = map[string]any{
			"@type":       "AggregateRating",
			"worstRating": 1,
			"bestRating":  5,
			"ratingValue": math.Round(e.RatingAvg*10) / 10,
			"reviewCount": e.RatingCount,
		}
	}
	return product
}

func buildExcursionEventJSON(e *domain.ExcursionView, base, url string, startsAt, endsAt time.Time) map[string]any {
	desc := truncateDesc(e.Description, 500)
	if desc == "" {
		desc = truncateDesc(e.Title, 500)
	}

	locality := e.CityName
	if locality == "" {
		locality = e.CountryName
	}
	countryCode := countryISOFromSlug(e.CountrySlug)

	locationName := locality
	if locationName == "" {
		locationName = e.CountryName
	}
	if locationName == "" {
		locationName = "Україна"
	}

	location := map[string]any{
		"@type": "Place",
		"name":  locationName,
	}
	address := map[string]any{"@type": "PostalAddress"}
	if mp := strings.TrimSpace(e.MeetingPoint); mp != "" {
		address["streetAddress"] = mp
	}
	if locality != "" {
		address["addressLocality"] = locality
	}
	if countryCode != "" {
		address["addressCountry"] = countryCode
	}
	if len(address) > 1 {
		location["address"] = address
	}

	performer := map[string]any{
		"@type": "PerformingGroup",
		"name":  "Гід-екскурсовод",
	}
	if e.GuideName != "" {
		performer = map[string]any{
			"@type": "Person",
			"name":  e.GuideName,
		}
		if e.GuideSlug != "" {
			performer["url"] = base + "/guide/" + e.GuideSlug
		}
	}

	event := map[string]any{
		"@context":            "https://schema.org",
		"@type":               "Event",
		"@id":                 url + "#event",
		"name":                e.Title,
		"startDate":           startsAt.UTC().Format(time.RFC3339),
		"endDate":             endsAt.UTC().Format(time.RFC3339),
		"url":                 url,
		"eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
		"eventStatus":         "https://schema.org/EventScheduled",
		"inLanguage":          schemaLanguage(e.Language),
		"organizer": map[string]any{
			"@type": "Organization",
			"name":  "Gaido",
			"url":   base + "/",
		},
		"performer": performer,
		"location":  location,
		"offers": map[string]any{
			"@type":         "Offer",
			"price":         e.PriceFrom,
			"priceCurrency": e.Currency,
			"availability":  "https://schema.org/InStock",
			"validFrom":     startsAt.UTC().Format(time.RFC3339),
			"url":           url,
		},
	}
	if desc != "" {
		event["description"] = desc
	}
	if img := strings.TrimSpace(e.CoverImageURL); img != "" {
		event["image"] = []string{base + "/api/v1/media/public/" + img}
	}
	return event
}

func buildExcursionBreadcrumbJSON(e *domain.ExcursionView, base, url string) map[string]any {
	type crumb struct {
		label string
		href  string
	}
	trail := []crumb{{"Головна", base + "/"}}
	trail = append(trail, crumb{"Екскурсії", base + "/search"})
	if e.CountryName != "" && e.CountrySlug != "" {
		trail = append(trail, crumb{e.CountryName, base + "/countries/" + e.CountrySlug})
	}
	if e.CityName != "" {
		href := url
		if e.CitySlug != "" {
			href = base + "/city/" + e.CitySlug
		}
		trail = append(trail, crumb{e.CityName, href})
	}
	trail = append(trail, crumb{e.Title, url})

	items := make([]map[string]any, len(trail))
	for i, c := range trail {
		items[i] = map[string]any{
			"@type":    "ListItem",
			"position": i + 1,
			"name":     c.label,
			"item":     c.href,
		}
	}
	return map[string]any{
		"@context":        "https://schema.org",
		"@type":           "BreadcrumbList",
		"itemListElement": items,
	}
}
