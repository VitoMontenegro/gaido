package handlers

import (
	"context"
	"fmt"
	"html"
	"strings"
	"unicode/utf8"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

func (h *Handlers) publicBaseURL() string {
	base := strings.TrimRight(h.Cfg.PublicBaseURL, "/")
	if base == "" {
		base = "http://localhost:5173"
	}
	return base
}

// SpaPageMeta — page-specific HTML head for SPA crawlers (injected before JS).
type SpaPageMeta struct {
	Title       string
	Description string
	Canonical   string
	OgImage     string
	NoIndex     bool
	JsonLd      []string
}

func pageTitleSuffix(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "Gaido"
	}
	return name + " — Gaido"
}

func truncateDesc(s string, max int) string {
	s = strings.Join(strings.Fields(strings.TrimSpace(s)), " ")
	if max <= 0 || len(s) <= max {
		return s
	}
	cut := s[:max]
	for len(cut) > 0 && !utf8.ValidString(cut) {
		cut = cut[:len(cut)-1]
	}
	return strings.TrimSpace(cut)
}

func (h *Handlers) mediaPublicURL(key string) string {
	key = strings.TrimSpace(key)
	if key == "" {
		return ""
	}
	return h.publicBaseURL() + "/api/v1/media/public/" + key
}

func (h *Handlers) resolveSEOImage(img, fallback string) string {
	img = strings.TrimSpace(img)
	if img == "" {
		return fallback
	}
	switch {
	case strings.HasPrefix(img, "http://"), strings.HasPrefix(img, "https://"):
		return img
	case strings.HasPrefix(img, "/"):
		return h.publicBaseURL() + img
	default:
		return h.mediaPublicURL(img)
	}
}

func (h *Handlers) ResolveSpaPageMeta(ctx context.Context, host, path string) *SpaPageMeta {
	if !isGuidesHost(host) {
		return nil
	}

	path = strings.TrimSuffix(path, "/")
	if path == "" {
		path = "/"
	}

	base := h.publicBaseURL()
	defaultImage := base + "/api/v1/media/public/d2b27d81f09874a08b4dc3293fe67f2e.webp"

	switch {
	case path == "/":
		content := h.LoadHomeContent(ctx)
		title := strings.TrimSpace(content.SEOTitle)
		if title == "" || title == legacyHomeSEOTitle {
			title = seoHomeTitle
		}
		desc := truncateDesc(content.SEODescription, 160)
		if desc == "" || desc == legacyHomeSEODescription {
			desc = truncateDesc(content.HeroSubtitle, 160)
		}
		if desc == "" || desc == legacyHomeSEODescription {
			desc = seoHomeDescription
		}
		return &SpaPageMeta{
			Title:       pageTitleSuffix(title),
			Description: desc,
			Canonical:   base + "/",
			OgImage:     h.resolveSEOImage(content.SEOImageURL, defaultImage),
			JsonLd:      h.homePageJsonLd(ctx, base, content),
		}
	case path == "/search":
		return &SpaPageMeta{
			Title:       pageTitleSuffix(seoSearchHeading),
			Description: seoSearchDescription,
			Canonical:   base + "/search",
			OgImage:     defaultImage,
			JsonLd:      h.searchPageJsonLd(base),
		}
	case path == "/map":
		return &SpaPageMeta{
			Title:       pageTitleSuffix(seoMapHeading),
			Description: seoMapDescription,
			Canonical:   base + "/map",
			OgImage:     defaultImage,
			JsonLd:      h.simpleBreadcrumbJsonLd(base, "Карта", "/map"),
		}
	case path == "/guides":
		return &SpaPageMeta{
			Title:       pageTitleSuffix(seoGuidesListHeading),
			Description: seoGuidesListDescription,
			Canonical:   base + "/guides",
			OgImage:     defaultImage,
			JsonLd:      h.guidesListPageJsonLd(ctx, base),
		}
	case path == "/journal":
		return &SpaPageMeta{
			Title:       pageTitleSuffix(seoJournalHeading),
			Description: seoJournalDescription,
			Canonical:   base + "/journal",
			OgImage:     defaultImage,
			JsonLd:      h.simpleBreadcrumbJsonLd(base, "Журнал", "/journal"),
		}
	case path == "/about":
		about := h.LoadAboutContent(ctx)
		title := about.HeroEyebrow
		if title == "" {
			title = "Про Gaido"
		}
		desc := about.HeroLead
		if desc == "" {
			desc = seoAboutFallbackDescription
		}
		return &SpaPageMeta{
			Title:       pageTitleSuffix(title),
			Description: desc,
			Canonical:   base + "/about",
			OgImage:     defaultImage,
			JsonLd:      h.simpleBreadcrumbJsonLd(base, title, "/about"),
		}
	case path == "/favorites":
		return &SpaPageMeta{
			Title:       pageTitleSuffix("Обране"),
			Description: "Збережені екскурсії та гіди",
			Canonical:   base + "/favorites",
			OgImage:     defaultImage,
			NoIndex:     true,
		}
	}

	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 {
		return nil
	}

	switch parts[0] {
	case "excursion":
		if len(parts) != 2 {
			return nil
		}
		e, err := h.Exc.GetViewBySlug(ctx, parts[1])
		if err != nil || e == nil || e.Status != domain.ExcursionPublished {
			return nil
		}
		desc := truncateDesc(e.Description, 160)
		if desc == "" {
			desc = truncateDesc(e.Title, 160)
		}
		img := defaultImage
		if e.CoverImageURL != "" {
			img = h.mediaPublicURL(e.CoverImageURL)
		}
		title := pageTitleSuffix(e.Title)
		if e.CityName != "" {
			title = pageTitleSuffix(fmt.Sprintf("%s — екскурсія %s", e.Title, ukInLocative(e.CityName)))
		}
		return &SpaPageMeta{
			Title:       title,
			Description: desc,
			Canonical:   base + "/excursion/" + e.Slug,
			OgImage:     img,
			JsonLd:      h.excursionDetailJsonLd(ctx, e, base),
		}

	case "guide":
		if len(parts) != 2 {
			return nil
		}
		g, err := h.Guides.GetBySlug(ctx, parts[1])
		if err != nil || g == nil || g.Status != domain.GuideStatusActive {
			return nil
		}
		cityName := ""
		if names, err := h.Guides.ListPreviewCityNamesByGuideIDs(ctx, []int64{g.ID}); err == nil {
			if list := names[g.ID]; len(list) > 0 {
				cityName = list[0]
			}
		}
		heading := seoGuideHeading(g.DisplayName, cityName)
		desc := truncateDesc(domain.PublicGuideAbout(g.About), 160)
		if desc == "" {
			desc = heading
		}
		img := defaultImage
		if g.AvatarURL != "" {
			img = h.mediaPublicURL(g.AvatarURL)
		}
		return &SpaPageMeta{
			Title:       pageTitleSuffix(heading),
			Description: desc,
			Canonical:   base + "/guide/" + g.WebsiteSlug,
			OgImage:     img,
			JsonLd:      h.guidePageJsonLd(ctx, g, base),
		}

	case "countries":
		if len(parts) != 2 {
			return nil
		}
		c, err := h.Geo.GetCountryBySlug(ctx, parts[1])
		if err != nil || c == nil {
			return nil
		}
		var page *domain.PlacePage
		if h.PlacePages != nil {
			page, _ = h.PlacePages.GetBySlug(ctx, domain.PlaceTypeCountry, c.Slug)
		}
		meta := &SpaPageMeta{
			Title:       pageTitleSuffix(seoCountryExcursionsHeading(c.Name)),
			Description: truncateDesc(seoCountryExcursionsDescription(c.Name), 160),
			Canonical:   base + "/countries/" + c.Slug,
			OgImage:     defaultImage,
			JsonLd:      h.countryPageJsonLd(ctx, c, base, page),
		}
		h.applyPlacePageMeta(meta, page, defaultImage)
		return meta

	case "city":
		if len(parts) != 2 {
			return nil
		}
		city, err := h.Geo.GetCityBySlug(ctx, parts[1])
		if err != nil || city == nil {
			return nil
		}
		var page *domain.PlacePage
		if h.PlacePages != nil {
			page, _ = h.PlacePages.GetBySlug(ctx, domain.PlaceTypeCity, city.Slug)
		}
		countryName := ""
		if country, err := h.Geo.GetCountryBySlug(ctx, city.CountrySlug); err == nil && country != nil {
			countryName = country.Name
		}
		meta := &SpaPageMeta{
			Title:       pageTitleSuffix(seoCityExcursionsHeading(city.Name)),
			Description: truncateDesc(seoCityExcursionsDescription(city.Name, countryName), 160),
			Canonical:   base + "/city/" + city.Slug,
			OgImage:     defaultImage,
			JsonLd:      h.cityPageJsonLd(ctx, city, base, page),
		}
		h.applyPlacePageMeta(meta, page, defaultImage)
		return meta

	case "guides":
		if len(parts) == 3 && parts[1] == "countries" {
			c, err := h.Geo.GetCountryBySlug(ctx, parts[2])
			if err != nil || c == nil {
				return nil
			}
			return &SpaPageMeta{
				Title:       pageTitleSuffix(seoGuidesCountryHeading(c.Name)),
				Description: truncateDesc(seoGuidesCountryDescription(c.Name), 160),
				Canonical:   base + "/guides/countries/" + c.Slug,
				OgImage:     defaultImage,
				JsonLd:      h.guidesCountryPageJsonLd(ctx, c, base),
			}
		}

	case "journal":
		if len(parts) != 2 {
			return nil
		}
		a, err := h.Articles.GetPublishedBySlug(ctx, parts[1])
		if err != nil || a == nil {
			return nil
		}
		desc := truncateDesc(a.Excerpt, 160)
		if desc == "" {
			desc = truncateDesc(a.Title, 160)
		}
		img := defaultImage
		if a.CoverImageURL != "" {
			img = h.mediaPublicURL(a.CoverImageURL)
		}
		return &SpaPageMeta{
			Title:       pageTitleSuffix(a.Title),
			Description: desc,
			Canonical:   base + "/journal/" + a.Slug,
			OgImage:     img,
			JsonLd:      h.journalArticleJsonLd(a, base),
		}

	case "ukrainians-in":
		if len(parts) != 2 {
			return nil
		}
		city, err := h.Geo.GetCityBySlug(ctx, parts[1])
		name := parts[1]
		if err == nil && city != nil {
			name = city.Name
		}
		return &SpaPageMeta{
			Title:       pageTitleSuffix("Українці " + ukInLocative(name)),
			Description: truncateDesc("Українські послуги та ресурси "+ukInLocative(name)+" та поруч.", 160),
			Canonical:   base + "/ukrainians-in/" + parts[1],
			NoIndex:     true,
		}

	case "login", "register", "account", "admin", "moderator", "downloads":
		return &SpaPageMeta{
			Title:   pageTitleSuffix(""),
			NoIndex: true,
		}
	}

	return nil
}

func isGuidesHost(host string) bool {
	h := strings.ToLower(strings.TrimSpace(host))
	if i := strings.LastIndex(h, ":"); i != -1 && !strings.HasPrefix(h, "[") {
		h = h[:i]
	}
	h = strings.TrimSuffix(h, ".")
	return h == "svit.gaido-ua.com" || h == "localhost" || strings.HasPrefix(h, "127.0.0.1")
}

// HTMLEscapeAttr escapes text for HTML attribute values.
func HTMLEscapeAttr(s string) string {
	return html.EscapeString(s)
}
