package handlers

import (
	"context"
	"fmt"
	"html"
	"regexp"
	"strconv"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

type CrawlLink struct {
	Label string `json:"label"`
	Href  string `json:"href"`
}

type CrawlSection struct {
	Title      string      `json:"title"`
	Paragraphs []string    `json:"paragraphs"`
	Links      []CrawlLink `json:"links"`
}

type CrawlFAQ struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type CrawlBody struct {
	H1         string         `json:"h1"`
	Paragraphs []string       `json:"paragraphs"`
	Sections   []CrawlSection `json:"sections"`
	FAQ        []CrawlFAQ     `json:"faq"`
}

var htmlTagRe = regexp.MustCompile(`(?s)<[^>]*>`)

func headingFromTitle(title string) string {
	return strings.TrimSpace(strings.TrimSuffix(title, " — Gaido UA"))
}

func newCrawlBody(h1 string, paragraphs ...string) CrawlBody {
	return CrawlBody{H1: strings.TrimSpace(h1), Paragraphs: compactParagraphs(paragraphs)}
}

func (b CrawlBody) withSection(title string, paragraphs []string, links []CrawlLink) CrawlBody {
	title = strings.TrimSpace(title)
	paragraphs = compactParagraphs(paragraphs)
	if title == "" && len(paragraphs) == 0 && len(links) == 0 {
		return b
	}
	b.Sections = append(b.Sections, CrawlSection{Title: title, Paragraphs: paragraphs, Links: links})
	return b
}

func (b CrawlBody) withFAQ(items []faqItem) CrawlBody {
	for _, item := range items {
		q := strings.TrimSpace(item.question)
		a := strings.TrimSpace(item.answer)
		if q == "" || a == "" {
			continue
		}
		b.FAQ = append(b.FAQ, CrawlFAQ{Question: q, Answer: a})
	}
	return b
}

func (m *SpaPageMeta) withBody(body CrawlBody) *SpaPageMeta {
	if m == nil {
		return nil
	}
	if strings.TrimSpace(body.H1) == "" {
		body.H1 = headingFromTitle(m.Title)
	}
	if len(body.Paragraphs) == 0 && strings.TrimSpace(m.Description) != "" {
		body.Paragraphs = []string{strings.TrimSpace(m.Description)}
	}
	m.CrawlBody = body
	return m
}

func absURL(base, path string) string {
	base = strings.TrimRight(base, "/")
	path = strings.TrimSpace(path)
	if path == "" || path == "/" {
		return base + "/"
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return base + path
}

func crawlLink(label, href string) CrawlLink {
	return CrawlLink{Label: strings.TrimSpace(label), Href: strings.TrimSpace(href)}
}

func compactParagraphs(items []string) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item != "" {
			out = append(out, item)
		}
	}
	return out
}

func splitParagraphs(s string) []string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	parts := strings.Split(s, "\n")
	return compactParagraphs(parts)
}

func faqAnswerText(s string) string {
	s = htmlTagRe.ReplaceAllString(s, "")
	s = html.UnescapeString(s)
	return strings.Join(strings.Fields(s), " ")
}

func htmlParagraphs(s string) []string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "</p>", "\n")
	s = strings.ReplaceAll(s, "</div>", "\n")
	s = strings.ReplaceAll(s, "<br>", "\n")
	s = strings.ReplaceAll(s, "<br/>", "\n")
	s = strings.ReplaceAll(s, "<br />", "\n")
	s = htmlTagRe.ReplaceAllString(s, " ")
	s = html.UnescapeString(s)
	return splitParagraphs(s)
}

func cityCrawlLinks(base string, items []domain.ExcursionView) []CrawlLink {
	seen := map[string]struct{}{}
	out := make([]CrawlLink, 0)
	for _, e := range items {
		slug := strings.TrimSpace(e.CitySlug)
		name := strings.TrimSpace(e.CityName)
		if slug == "" || name == "" {
			continue
		}
		if _, ok := seen[slug]; ok {
			continue
		}
		seen[slug] = struct{}{}
		out = append(out, crawlLink(name, absURL(base, "/city/"+slug)))
	}
	return out
}

func excursionCrawlLinks(base string, items []domain.ExcursionView) []CrawlLink {
	out := make([]CrawlLink, 0, len(items))
	for _, e := range items {
		title := strings.TrimSpace(e.Title)
		if title == "" || e.Slug == "" {
			continue
		}
		out = append(out, crawlLink(title, absURL(base, "/excursion/"+e.Slug)))
		if len(out) >= 50 {
			break
		}
	}
	return out
}

func guideCrawlLinks(base string, items []domain.PublicGuideDTO) []CrawlLink {
	out := make([]CrawlLink, 0, len(items))
	for _, g := range items {
		name := strings.TrimSpace(g.DisplayName)
		if name == "" || g.Slug == "" {
			continue
		}
		out = append(out, crawlLink(name, absURL(base, "/guide/"+g.Slug)))
		if len(out) >= 50 {
			break
		}
	}
	return out
}

func guideProfileCrawlLinks(base string, items []domain.GuideProfile) []CrawlLink {
	out := make([]CrawlLink, 0, len(items))
	for _, g := range items {
		name := strings.TrimSpace(g.DisplayName)
		if name == "" || g.WebsiteSlug == "" {
			continue
		}
		out = append(out, crawlLink(name, absURL(base, "/guide/"+g.WebsiteSlug)))
	}
	return out
}

func countryGuideCrawlLinks(base string, items []countryGuideEntry) []CrawlLink {
	out := make([]CrawlLink, 0, len(items))
	for _, c := range items {
		if c.Name == "" || c.Slug == "" {
			continue
		}
		out = append(out, crawlLink(c.Name, absURL(base, "/countries/"+c.Slug)))
	}
	return out
}

func destinationCrawlLinks(base string, destinations []domain.DestinationGroup) []CrawlLink {
	out := make([]CrawlLink, 0)
	for _, group := range destinations {
		if group.CountrySlug != "" && group.CountryName != "" {
			out = append(out, crawlLink(group.CountryName, absURL(base, "/countries/"+group.CountrySlug)))
		}
		for _, city := range group.Cities {
			if city.Slug == "" || city.Name == "" {
				continue
			}
			out = append(out, crawlLink(city.Name, absURL(base, "/city/"+city.Slug)))
		}
	}
	return out
}

func articleCrawlLinks(base, prefix string, items []domain.ArticleListItem) []CrawlLink {
	out := make([]CrawlLink, 0, len(items))
	for _, a := range items {
		if a.Title == "" || a.Slug == "" {
			continue
		}
		out = append(out, crawlLink(a.Title, absURL(base, prefix+"/"+a.Slug)))
		if len(out) >= 50 {
			break
		}
	}
	return out
}

func rideCrawlLinks(base string, items []domain.TransportListing) []CrawlLink {
	out := make([]CrawlLink, 0, len(items))
	for _, item := range items {
		if item.ID <= 0 {
			continue
		}
		out = append(out, crawlLink(rideLabel(item), absURL(base, "/rides/"+strconv.FormatInt(item.ID, 10))))
		if len(out) >= 50 {
			break
		}
	}
	return out
}

func rideLabel(item domain.TransportListing) string {
	stops := item.Stops
	if len(stops) >= 2 {
		from := strings.TrimSpace(stops[0].CityName)
		to := strings.TrimSpace(stops[len(stops)-1].CityName)
		if from != "" && to != "" {
			return from + " → " + to
		}
	}
	if name := strings.TrimSpace(item.CompanyName); name != "" {
		return name
	}
	if name := strings.TrimSpace(item.ProviderName); name != "" {
		return name
	}
	return fmt.Sprintf("Рейс #%d", item.ID)
}

func carrierCrawlLinks(base string, items []domain.CarrierProfile) []CrawlLink {
	out := make([]CrawlLink, 0, len(items))
	for _, c := range items {
		name := strings.TrimSpace(c.DisplayName)
		if name == "" {
			name = strings.TrimSpace(c.BusinessName)
		}
		if name == "" || c.WebsiteSlug == "" {
			continue
		}
		out = append(out, crawlLink(name, absURL(base, "/carriers/"+c.WebsiteSlug)))
		if len(out) >= 50 {
			break
		}
	}
	return out
}

func cityFromRidesLinks(base string, items []domain.TransportListing) []CrawlLink {
	seen := map[string]struct{}{}
	out := make([]CrawlLink, 0)
	for _, item := range items {
		for _, stop := range item.Stops {
			if stop.CitySlug == "" || stop.CityName == "" {
				continue
			}
			if _, ok := seen[stop.CitySlug]; ok {
				continue
			}
			seen[stop.CitySlug] = struct{}{}
			out = append(out, crawlLink(stop.CityName, absURL(base, "/cities/"+stop.CitySlug)))
			if len(out) >= 50 {
				return out
			}
		}
	}
	return out
}

func faqFromHome(content domain.HomeContent) []faqItem {
	out := make([]faqItem, 0, len(content.FAQ))
	for _, item := range content.FAQ {
		if item.Question != "" && item.Answer != "" {
			out = append(out, faqItem{question: item.Question, answer: item.Answer})
		}
	}
	return out
}

func categoryTileLinks(base string, tiles []domain.HomeCategoryTile) []CrawlLink {
	out := make([]CrawlLink, 0, len(tiles))
	for _, tile := range tiles {
		if tile.Label == "" || tile.URL == "" {
			continue
		}
		out = append(out, crawlLink(tile.Label, absURL(base, tile.URL)))
	}
	return out
}

func legalPageBySlug(legal domain.LegalContent, slug string) (domain.LegalPage, bool) {
	switch slug {
	case "privacy":
		return legal.PrivacyPolicy, true
	case "site-rules":
		return legal.SiteRules, true
	case "placement-rules":
		return legal.PlacementRules, true
	default:
		return domain.LegalPage{}, false
	}
}

func audienceParagraphs(items []domain.AboutAudienceItem) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		line := strings.TrimSpace(item.Title)
		if item.Description != "" {
			if line != "" {
				line += ". "
			}
			line += strings.TrimSpace(item.Description)
		}
		if line != "" {
			out = append(out, line)
		}
	}
	return out
}

func (h *Handlers) countriesWithGuides(ctx context.Context) []countryGuideEntry {
	if h == nil || h.Geo == nil {
		return nil
	}
	rows, err := h.Geo.ListCountriesWithGuideCount(ctx)
	if err != nil {
		return nil
	}
	out := make([]countryGuideEntry, 0, len(rows))
	for _, c := range rows {
		if c.GuideCount > 0 {
			out = append(out, countryGuideEntry{Name: c.Name, Slug: c.Slug})
		}
	}
	return out
}

func (h *Handlers) legalPageMeta(ctx context.Context, base, defaultImage, slug string) *SpaPageMeta {
	page, ok := legalPageBySlug(h.LoadLegalContent(ctx), slug)
	if !ok {
		return &SpaPageMeta{
			Title:   pageTitleSuffix("Сторінку не знайдено"),
			NoIndex: true,
		}
	}
	title := strings.TrimSpace(page.Title)
	if title == "" {
		title = "Документ"
	}
	desc := title + " — правила та політика платформи Gaido"
	paras := htmlParagraphs(page.BodyHTML)
	if len(paras) == 0 {
		paras = []string{"Текст документа готується. Зверніться до адміністратора сайту."}
	}
	return (&SpaPageMeta{
		Title:       pageTitleSuffix(title),
		Description: desc,
		Canonical:   absURL(base, "/legal/"+slug),
		OgImage:     defaultImage,
		JsonLd:      h.simpleBreadcrumbJsonLd(base, title, "/legal/"+slug),
	}).withBody(newCrawlBody(title, paras...))
}

func sectionPage(host, path, publicBase, prefix, subdomain string) (ok bool, routePath, pageBase string) {
	path = strings.TrimSuffix(path, "/")
	if path == "" {
		path = "/"
	}
	publicBase = strings.TrimRight(publicBase, "/")
	if path == prefix || strings.HasPrefix(path, prefix+"/") {
		route := strings.TrimPrefix(path, prefix)
		if route == "" {
			route = "/"
		}
		return true, route, publicBase + prefix
	}
	if normalizeHost(host) == subdomain {
		return true, path, publicBase + prefix
	}
	return false, path, publicBase
}
