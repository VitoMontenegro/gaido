package handlers

import (
	"context"
	"fmt"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

func (h *Handlers) homePageJsonLd(ctx context.Context, base string, content domain.HomeContent) []string {
	featured := h.ResolveFeaturedExcursions(ctx, 6)
	desc := strings.TrimSpace(content.SEODescription)
	if desc == "" {
		desc = content.HeroSubtitle
	}
	if desc == "" {
		desc = seoHomeDescription
	}

	var faq []faqItem
	for _, item := range content.FAQ {
		if item.Question != "" && item.Answer != "" {
			faq = append(faq, faqItem{question: item.Question, answer: item.Answer})
		}
	}

	blocks := []any{buildWebSiteJSON(base)}
	blocks = append(blocks, excursionListingBlocks(featured, base, "Нові маршрути Gaido", desc)...)
	if faqPage := buildFaqPageJSON(faq); faqPage != nil {
		blocks = append(blocks, faqPage)
	}
	return appendJsonLd(nil, blocks...)
}

func (h *Handlers) countryPageJsonLd(ctx context.Context, c *postgres.Country, base string, page *domain.PlacePage) []string {
	items, _ := h.Exc.ListPublicEnriched(ctx, nil, c.Slug, "", nil, 50, 0)
	listName := seoCountryExcursionsHeading(c.Name)
	desc := seoCountryExcursionsDescription(c.Name)
	if page != nil && strings.TrimSpace(page.SEODescription) != "" {
		desc = page.SEODescription
	}
	path := "/countries/" + c.Slug
	faq := placeFAQItems(page)
	if len(faq) == 0 {
		faq = countryExcursionFaq(c.Name)
	}

	blocks := excursionListingBlocks(items, base, listName, desc)
	blocks = append(blocks,
		buildPlaceJSON(base, c.Name, path, ""),
		buildFaqPageJSON(faq),
		buildBreadcrumbJSON(base, [][2]string{
			{"Головна", base + "/"},
			{"Екскурсії", base + "/search"},
			{c.Name, base + path},
		}),
	)
	return appendJsonLd(nil, blocks...)
}

func (h *Handlers) cityPageJsonLd(ctx context.Context, city *postgres.City, base string, page *domain.PlacePage) []string {
	cityID := city.ID
	items, _ := h.Exc.ListPublicEnriched(ctx, &cityID, "", "", nil, 50, 0)

	countryName := ""
	if country, err := h.Geo.GetCountryBySlug(ctx, city.CountrySlug); err == nil && country != nil {
		countryName = country.Name
	}

	listName := seoCityExcursionsHeading(city.Name)
	desc := seoCityExcursionsDescription(city.Name, countryName)
	if page != nil && strings.TrimSpace(page.SEODescription) != "" {
		desc = page.SEODescription
	}
	path := "/city/" + city.Slug
	faq := placeFAQItems(page)
	if len(faq) == 0 {
		faq = cityExcursionFaq(city.Name, countryName)
	}

	crumbs := [][2]string{
		{"Головна", base + "/"},
		{"Екскурсії", base + "/search"},
	}
	if countryName != "" && city.CountrySlug != "" {
		crumbs = append(crumbs, [2]string{countryName, base + "/countries/" + city.CountrySlug})
	}
	crumbs = append(crumbs, [2]string{city.Name, base + path})

	blocks := excursionListingBlocks(items, base, listName, desc)
	blocks = append(blocks,
		buildPlaceJSON(base, city.Name, path, countryName),
		buildFaqPageJSON(faq),
		buildBreadcrumbJSON(base, crumbs),
	)
	return appendJsonLd(nil, blocks...)
}

func (h *Handlers) searchPageJsonLd(base string) []string {
	return appendJsonLd(nil,
		buildWebSiteJSON(base),
		buildBreadcrumbJSON(base, [][2]string{
			{"Головна", base + "/"},
			{"Пошук", base + "/search"},
		}),
	)
}

func (h *Handlers) guidesListPageJsonLd(ctx context.Context, base string) []string {
	countries, _ := h.Geo.ListCountriesWithGuideCount(ctx)
	entries := make([]countryGuideEntry, 0, len(countries))
	for _, c := range countries {
		if c.GuideCount > 0 {
			entries = append(entries, countryGuideEntry{Name: c.Name, Slug: c.Slug})
		}
	}

	var blocks []any
	if list := buildCountryGuideItemListJSON(entries, base); list != nil {
		blocks = append(blocks, list)
	}
	blocks = append(blocks, buildBreadcrumbJSON(base, [][2]string{
		{"Головна", base + "/"},
		{"Гіди", base + "/guides"},
	}))
	return appendJsonLd(nil, blocks...)
}

func (h *Handlers) guidesCountryPageJsonLd(ctx context.Context, c *postgres.Country, base string) []string {
	var countryID int64 = c.ID
	guides, _ := h.Guides.ListPublic(ctx, nil, &countryID, "", 50, 0)
	path := "/guides/countries/" + c.Slug

	var blocks []any
	if list := buildGuideItemListJSON(guides, base, seoGuidesCountryHeading(c.Name)); list != nil {
		blocks = append(blocks, list)
	}
	blocks = append(blocks,
		buildPlaceJSON(base, c.Name, path, ""),
		buildBreadcrumbJSON(base, [][2]string{
			{"Головна", base + "/"},
			{"Гіди", base + "/guides"},
			{c.Name, base + path},
		}),
	)
	return appendJsonLd(nil, blocks...)
}

func (h *Handlers) guidePageJsonLd(ctx context.Context, g *domain.GuideProfile, base string) []string {
	excursions, _ := h.Exc.ListPublishedByGuide(ctx, g.ID)
	url := base + "/guide/" + g.WebsiteSlug

	var blocks []any
	blocks = append(blocks, buildPersonJSON(g, base))
	if list := buildExcursionItemListJSON(excursions, base, fmt.Sprintf("Екскурсії %s", g.DisplayName)); list != nil {
		blocks = append(blocks, list)
	}
	blocks = append(blocks, buildBreadcrumbJSON(base, [][2]string{
		{"Головна", base + "/"},
		{"Гіди", base + "/guides"},
		{g.DisplayName, url},
	}))
	return appendJsonLd(nil, blocks...)
}

func (h *Handlers) journalArticleJsonLd(a *domain.Article, base string) []string {
	url := base + "/journal/" + a.Slug
	return appendJsonLd(nil,
		buildArticleJSON(a, base),
		buildBreadcrumbJSON(base, [][2]string{
			{"Головна", base + "/"},
			{"Журнал", base + "/journal"},
			{a.Title, url},
		}),
	)
}

func (h *Handlers) simpleBreadcrumbJsonLd(base, label, path string) []string {
	return appendJsonLd(nil, buildBreadcrumbJSON(base, [][2]string{
		{"Головна", base + "/"},
		{label, base + path},
	}))
}
