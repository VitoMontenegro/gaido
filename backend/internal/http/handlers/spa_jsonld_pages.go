package handlers

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

func portalHomeFAQ() []faqItem {
	return []faqItem{
		{question: portalFaqGuidesQ, answer: portalFaqGuidesA},
		{question: portalFaqSearchQ, answer: portalFaqSearchA},
		{question: portalFaqTransportQ, answer: portalFaqTransportA},
		{question: portalFaqServicesQ, answer: portalFaqServicesA},
		{question: portalFaqJoinQ, answer: portalFaqJoinA},
	}
}

func buildPortalHomeJSON(apex, guidesBase string, guides []domain.PublicGuideDTO, excursions []domain.ExcursionView, countries []countryGuideEntry) []string {
	apex = strings.TrimRight(apex, "/") + "/"
	search := strings.TrimRight(guidesBase, "/") + "/search?q={search_term_string}"
	blocks := []any{
		buildOrganizationJSON(apex),
		buildWebSiteSearchJSON(apex, search),
	}
	blocks = append(blocks, excursionListingBlocks(excursions, guidesBase, "Екскурсії українською на Gaido", seoPortalHomeDescription)...)
	if list := buildPublicGuideItemListJSON(guides, guidesBase, "Україномовні гіди"); list != nil {
		blocks = append(blocks, list)
	}
	if list := buildCountryGuideItemListJSON(countries, guidesBase); list != nil {
		blocks = append(blocks, list)
	}
	if faq := buildFaqPageJSON(portalHomeFAQ()); faq != nil {
		blocks = append(blocks, faq)
	}
	return appendJsonLd(nil, blocks...)
}

func (h *Handlers) portalHomePageJsonLd(ctx context.Context, apex, guidesBase string) []string {
	var guides []domain.PublicGuideDTO
	var featured []domain.ExcursionView
	if h.Featured != nil && h.Guides != nil {
		guides = h.ResolveFeaturedGuides(ctx, 4)
	}
	if h.Exc != nil {
		featured = h.ResolveLatestExcursions(ctx, 8)
	}
	var countries []countryGuideEntry
	if h.Geo != nil {
		rows, _ := h.Geo.ListCountriesWithGuideCount(ctx)
		for _, c := range rows {
			if c.GuideCount > 0 {
				countries = append(countries, countryGuideEntry{Name: c.Name, Slug: c.Slug})
			}
		}
	}
	return buildPortalHomeJSON(apex, guidesBase, guides, featured, countries)
}

func (h *Handlers) homePageJsonLd(ctx context.Context, base string, content domain.HomeContent) []string {
	featured := h.ResolveLatestExcursions(ctx, 8)
	if len(featured) == 0 {
		featured = h.ResolveFeaturedExcursions(ctx, 8)
	}

	desc := seoHomeDescription
	if custom := strings.TrimSpace(content.SEODescription); custom != "" && custom != legacyHomeSEODescription {
		desc = truncateDesc(custom, 160)
	}

	title := seoHomeTitle
	if custom := strings.TrimSpace(content.SEOTitle); custom != "" && custom != legacyHomeSEOTitle {
		title = custom
	}

	listName := "Екскурсії українською на Gaido"
	blocks := []any{
		buildGuidesOrganizationJSON(base, desc),
		buildWebSiteJSON(base),
	}
	blocks = append(blocks, excursionListingBlocks(featured, base, listName, desc)...)

	var guides []domain.PublicGuideDTO
	if h.Featured != nil && h.Guides != nil {
		guides = h.ResolveFeaturedGuides(ctx, 4)
	}
	if list := buildPublicGuideItemListJSON(guides, base, "Україномовні гіди"); list != nil {
		blocks = append(blocks, list)
	}

	var countries []countryGuideEntry
	if h.Geo != nil {
		rows, _ := h.Geo.ListCountriesWithGuideCount(ctx)
		for _, c := range rows {
			if c.GuideCount > 0 {
				countries = append(countries, countryGuideEntry{Name: c.Name, Slug: c.Slug})
			}
		}
	}
	if list := buildCountryGuideItemListJSON(countries, base); list != nil {
		blocks = append(blocks, list)
	}

	image := h.resolveSEOImage(content.SEOImageURL, h.publicBaseURL()+"/api/v1/media/public/d2b27d81f09874a08b4dc3293fe67f2e.webp")
	blocks = append(blocks, buildWebPageJSON(base, "/", title, desc, image))

	var faq []faqItem
	for _, item := range content.FAQ {
		if item.Question != "" && item.Answer != "" {
			faq = append(faq, faqItem{question: item.Question, answer: item.Answer})
		}
	}
	if faqPage := buildFaqPageJSON(faq); faqPage != nil {
		blocks = append(blocks, faqPage)
	}

	return appendJsonLd(nil, blocks...)
}

func (h *Handlers) countryPageJsonLd(ctx context.Context, c *postgres.Country, base string, page *domain.PlacePage, items []domain.ExcursionView) []string {
	if items == nil {
		items, _ = h.Exc.ListPublicEnriched(ctx, nil, c.Slug, "", nil, 50, 0)
	}
	priceLabel, coverKey := countryListingOffer(items)
	listName := seoCountryExcursionsHeading(c.Name)
	desc := seoCountryExcursionsDescription(c.Name, priceLabel)
	if page != nil && strings.TrimSpace(page.SEODescription) != "" {
		desc = strings.TrimSpace(page.SEODescription)
		if priceLabel != "" && !strings.Contains(desc, priceLabel) {
			desc = strings.TrimSpace(desc + " " + priceLabel)
		}
	}
	path := "/countries/" + c.Slug
	faq := placeFAQItems(page)
	if len(faq) == 0 {
		faq = countryExcursionFaq(c.Name)
	}

	image := ""
	if coverKey != "" {
		image = h.mediaPublicURL(coverKey)
	}
	var blocks []any
	if list := buildExcursionItemListJSON(items, base, listName); list != nil {
		blocks = append(blocks, list)
	}
	blocks = append(blocks,
		buildWebPageJSON(base, path, listName, desc, image),
		buildPlaceJSON(base, c.Name, path, ""),
		buildFaqPageJSON(faq),
		buildBreadcrumbJSON(base, [][2]string{
			{"Головна", base + "/"},
			{"Країни", base + "/countries"},
			{c.Name, base + path},
		}),
	)
	return appendJsonLd(nil, blocks...)
}

func (h *Handlers) cityPageJsonLd(ctx context.Context, city *postgres.City, base string, page *domain.PlacePage, items []domain.ExcursionView) []string {
	if items == nil && h.Exc != nil {
		cityID := city.ID
		items, _ = h.Exc.ListPublicEnriched(ctx, &cityID, "", "", nil, 50, 0)
	}

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
		{"Країни", base + "/countries"},
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
		{"Екскурсії", base + "/guides"},
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
			{"Екскурсії", base + "/guides"},
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
		{"Екскурсії", base + "/guides"},
		{g.DisplayName, url},
	}))
	return appendJsonLd(nil, blocks...)
}

func (h *Handlers) newsArticleJsonLd(a *domain.Article, base string) []string {
	url := base + "/news/" + a.Slug
	return appendJsonLd(nil,
		buildArticleJSON(a, base, url),
		buildBreadcrumbJSON(base, [][2]string{
			{"Головна", base + "/"},
			{"Новини", base + "/news"},
			{a.Title, url},
		}),
	)
}

func (h *Handlers) journalArticleJsonLd(a *domain.Article, base string) []string {
	url := base + "/journal/" + a.Slug
	return appendJsonLd(nil,
		buildArticleJSON(a, base, url),
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

func (h *Handlers) forumBoardJsonLd(base string, f *domain.Forum) []string {
	return appendJsonLd(nil, buildBreadcrumbJSON(base, [][2]string{
		{"Головна", base + "/"},
		{"Форуми", base + "/forums"},
		{f.Title, base + "/forums/" + f.Slug},
	}))
}

func (h *Handlers) forumTopicJsonLd(base string, t *domain.ForumTopic) []string {
	id := strconv.FormatInt(t.ID, 10)
	return appendJsonLd(nil, buildBreadcrumbJSON(base, [][2]string{
		{"Головна", base + "/"},
		{"Форуми", base + "/forums"},
		{t.ForumTitle, base + "/forums/" + t.ForumSlug},
		{t.Title, base + "/forums/" + t.ForumSlug + "/" + id},
	}))
}
