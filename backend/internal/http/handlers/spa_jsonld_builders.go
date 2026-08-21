package handlers

import (
	"math"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

type faqItem struct {
	question string
	answer   string
}

func appendJsonLd(out []string, blocks ...any) []string {
	for _, b := range blocks {
		if b == nil {
			continue
		}
		if s := marshalJSONLD(b); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func buildWebSiteJSON(base string) map[string]any {
	return map[string]any{
		"@context": "https://schema.org",
		"@type":    "WebSite",
		"name":     "Gaido",
		"url":      base + "/",
		"potentialAction": map[string]any{
			"@type": "SearchAction",
			"target": map[string]any{
				"@type":       "EntryPoint",
				"urlTemplate": base + "/search?q={search_term_string}",
			},
			"query-input": "required name=search_term_string",
		},
	}
}

func buildFaqPageJSON(items []faqItem) map[string]any {
	if len(items) == 0 {
		return nil
	}
	entities := make([]map[string]any, len(items))
	for i, item := range items {
		entities[i] = map[string]any{
			"@type": "Question",
			"name":  item.question,
			"acceptedAnswer": map[string]any{
				"@type": "Answer",
				"text":  item.answer,
			},
		}
	}
	return map[string]any{
		"@context":   "https://schema.org",
		"@type":      "FAQPage",
		"mainEntity": entities,
	}
}

func countryExcursionFaq(countryName string) []faqItem {
	return []faqItem{
		{
			question: "Як знайти екскурсію в " + countryName + "?",
			answer:   "Оберіть екскурсію в каталозі, перегляньте опис і дати, потім напишіть гіду напряму — він підтвердить час і деталі.",
		},
		{
			question: "Чи можна бронювати українською?",
			answer:   "Так. Більшість гідів на Gaido проводять екскурсії українською або англійською — мова вказана в описі.",
		},
		{
			question: "Як оплатити?",
			answer:   "Оплата узгоджується з гідом напряму — платформа допомагає знайти екскурсію та звʼязатися з автором маршруту.",
		},
	}
}

func cityExcursionFaq(cityName, countryName string) []faqItem {
	place := cityName
	if countryName != "" {
		place = cityName + " (" + countryName + ")"
	}
	return []faqItem{
		{
			question: "Які екскурсії є в " + place + "?",
			answer:   "У каталозі — групові та індивідуальні тури: пішохідні прогулянки, оглядові маршрути та тематичні екскурсії від місцевих гідів.",
		},
		{
			question: "Як обрати дату?",
			answer:   "На сторінці екскурсії перегляньте календар доступних дат або напишіть гіду — для індивідуальних турів час погоджується окремо.",
		},
		{
			question: "Чи є відгуки?",
			answer:   "Так. На сторінках гідів і екскурсій — відгуки мандрівників після проведених турів.",
		},
	}
}

func buildBreadcrumbJSON(base string, crumbs [][2]string) map[string]any {
	if len(crumbs) == 0 {
		return nil
	}
	items := make([]map[string]any, len(crumbs))
	for i, c := range crumbs {
		items[i] = map[string]any{
			"@type":    "ListItem",
			"position": i + 1,
			"name":     c[0],
			"item":     c[1],
		}
	}
	return map[string]any{
		"@context":        "https://schema.org",
		"@type":           "BreadcrumbList",
		"itemListElement": items,
	}
}

func buildPlaceJSON(base, name, path, countryName string) map[string]any {
	place := map[string]any{
		"@context": "https://schema.org",
		"@type":    "Place",
		"name":     name,
		"url":      base + path,
	}
	if countryName != "" {
		place["containedInPlace"] = map[string]any{
			"@type": "Country",
			"name":  countryName,
		}
	}
	return place
}

func buildExcursionItemListJSON(items []domain.ExcursionView, base, listName string) map[string]any {
	if len(items) == 0 {
		return nil
	}
	limit := len(items)
	if limit > 50 {
		limit = 50
	}
	elements := make([]map[string]any, limit)
	for i := 0; i < limit; i++ {
		e := items[i]
		elements[i] = map[string]any{
			"@type":    "ListItem",
			"position": i + 1,
			"url":      base + "/excursion/" + e.Slug,
			"name":     e.Title,
		}
	}
	return map[string]any{
		"@context":        "https://schema.org",
		"@type":           "ItemList",
		"name":            listName,
		"numberOfItems":   limit,
		"itemListElement": elements,
	}
}

func buildExcursionAggregateProductJSON(items []domain.ExcursionView, base, name, description string) map[string]any {
	if len(items) == 0 {
		return nil
	}
	prices := make([]float64, 0, len(items))
	currency := "EUR"
	var images []string
	var totalReviews int
	var weightedRating float64

	for _, e := range items {
		if e.PriceFrom > 0 {
			prices = append(prices, e.PriceFrom)
		}
		if e.Currency != "" {
			currency = e.Currency
		}
		if img := strings.TrimSpace(e.CoverImageURL); img != "" && len(images) < 8 {
			images = append(images, base+"/api/v1/media/public/"+img)
		}
		if e.RatingCount > 0 {
			totalReviews += e.RatingCount
			weightedRating += e.RatingAvg * float64(e.RatingCount)
		}
	}

	product := map[string]any{
		"@context": "https://schema.org",
		"@type":    "Product",
		"name":     name,
		"offers": map[string]any{
			"@type":        "AggregateOffer",
			"priceCurrency": currency,
			"offerCount":   len(items),
			"availability": "https://schema.org/InStock",
		},
	}
	if description != "" {
		product["description"] = description
	}
	if len(prices) > 0 {
		minP, maxP := prices[0], prices[0]
		for _, p := range prices[1:] {
			if p < minP {
				minP = p
			}
			if p > maxP {
				maxP = p
			}
		}
		offers := product["offers"].(map[string]any)
		offers["lowPrice"] = minP
		offers["highPrice"] = maxP
	}
	if len(images) > 0 {
		product["image"] = images
	}
	if totalReviews > 0 {
		product["aggregateRating"] = map[string]any{
			"@type":       "AggregateRating",
			"worstRating": 1,
			"bestRating":  5,
			"ratingValue": math.Round(weightedRating/float64(totalReviews)*10) / 10,
			"reviewCount": totalReviews,
		}
	}
	return product
}

func buildGuideItemListJSON(guides []domain.GuideProfile, base, listName string) map[string]any {
	if len(guides) == 0 {
		return nil
	}
	limit := len(guides)
	if limit > 50 {
		limit = 50
	}
	elements := make([]map[string]any, limit)
	for i := 0; i < limit; i++ {
		g := guides[i]
		elements[i] = map[string]any{
			"@type":    "ListItem",
			"position": i + 1,
			"name":     g.DisplayName,
			"url":      base + "/guide/" + g.WebsiteSlug,
		}
	}
	return map[string]any{
		"@context":        "https://schema.org",
		"@type":           "ItemList",
		"name":            listName,
		"numberOfItems":   limit,
		"itemListElement": elements,
	}
}

type countryGuideEntry struct {
	Name string
	Slug string
}

func buildCountryGuideItemListJSON(countries []countryGuideEntry, base string) map[string]any {
	if len(countries) == 0 {
		return nil
	}
	elements := make([]map[string]any, len(countries))
	for i, c := range countries {
		elements[i] = map[string]any{
			"@type":    "ListItem",
			"position": i + 1,
			"name":     c.Name,
			"url":      base + "/guides/countries/" + c.Slug,
		}
	}
	return map[string]any{
		"@context":        "https://schema.org",
		"@type":           "ItemList",
		"name":            "Гіди за країнами",
		"numberOfItems":   len(countries),
		"itemListElement": elements,
	}
}

func buildPersonJSON(g *domain.GuideProfile, base string) map[string]any {
	url := base + "/guide/" + g.WebsiteSlug
	person := map[string]any{
		"@context":    "https://schema.org",
		"@type":       "Person",
		"name":        g.DisplayName,
		"url":         url,
		"description": truncateDesc(g.About, 500),
	}
	if img := strings.TrimSpace(g.AvatarURL); img != "" {
		person["image"] = base + "/api/v1/media/public/" + img
	}
	if g.RatingCount > 0 {
		person["aggregateRating"] = map[string]any{
			"@type":       "AggregateRating",
			"worstRating": 1,
			"bestRating":  5,
			"ratingValue": g.RatingAvg,
			"reviewCount": g.RatingCount,
		}
	}
	return person
}

func buildArticleJSON(a *domain.Article, base string) map[string]any {
	url := base + "/journal/" + a.Slug
	article := map[string]any{
		"@context":    "https://schema.org",
		"@type":       "Article",
		"headline":    a.Title,
		"description": truncateDesc(a.Excerpt, 500),
		"url":         url,
		"publisher": map[string]any{
			"@type": "Organization",
			"name":  "Gaido",
		},
	}
	if a.Excerpt == "" {
		article["description"] = truncateDesc(a.Title, 500)
	}
	if img := strings.TrimSpace(a.CoverImageURL); img != "" {
		article["image"] = base + "/api/v1/media/public/" + img
	}
	if a.PublishedAt != nil {
		article["datePublished"] = a.PublishedAt.UTC().Format("2006-01-02T15:04:05Z07:00")
	}
	return article
}

func excursionListingBlocks(items []domain.ExcursionView, base, name, description string) []any {
	var blocks []any
	if list := buildExcursionItemListJSON(items, base, name); list != nil {
		blocks = append(blocks, list)
	}
	if prod := buildExcursionAggregateProductJSON(items, base, name, description); prod != nil {
		blocks = append(blocks, prod)
	}
	return blocks
}
