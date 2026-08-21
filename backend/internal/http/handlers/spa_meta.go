package handlers

import (
	"context"
	"fmt"
	"html"
	"strings"

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
	if len(s) <= max {
		return s
	}
	return s[:max]
}

func (h *Handlers) mediaPublicURL(key string) string {
	key = strings.TrimSpace(key)
	if key == "" {
		return ""
	}
	return h.publicBaseURL() + "/api/v1/media/public/" + key
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
		desc := truncateDesc(content.HeroSubtitle, 160)
		if desc == "" {
			desc = "Гіди та екскурсії для українців за кордоном"
		}
		return &SpaPageMeta{
			Title:       pageTitleSuffix("Гіди та екскурсії"),
			Description: desc,
			Canonical:   base + "/",
			OgImage:     defaultImage,
			JsonLd:      h.homePageJsonLd(ctx, base, content),
		}
	case path == "/search":
		return &SpaPageMeta{
			Title:       pageTitleSuffix("Пошук"),
			Description: "Знайдіть екскурсію за містом, темою, назвою або датою",
			Canonical:   base + "/search",
			OgImage:     defaultImage,
			JsonLd:      h.searchPageJsonLd(base),
		}
	case path == "/map":
		return &SpaPageMeta{
			Title:       pageTitleSuffix("Карта"),
			Description: "Міста з опублікованими екскурсіями — оберіть на карті або в списку",
			Canonical:   base + "/map",
			OgImage:     defaultImage,
			JsonLd:      h.simpleBreadcrumbJsonLd(base, "Карта", "/map"),
		}
	case path == "/guides":
		return &SpaPageMeta{
			Title:       pageTitleSuffix("Гіди"),
			Description: "Оберіть країну — побачите місцевих експертів із авторськими маршрутами",
			Canonical:   base + "/guides",
			OgImage:     defaultImage,
			JsonLd:      h.guidesListPageJsonLd(ctx, base),
		}
	case path == "/journal":
		return &SpaPageMeta{
			Title:       pageTitleSuffix("Журнал"),
			Description: "Статті про подорожі, міста та екскурсії для українців за кордоном",
			Canonical:   base + "/journal",
			OgImage:     defaultImage,
			JsonLd:      h.simpleBreadcrumbJsonLd(base, "Журнал", "/journal"),
		}
	case path == "/about":
		return &SpaPageMeta{
			Title:       pageTitleSuffix("Про Gaido"),
			Description: "Інформаційна платформа для українців за кордоном — гіди, екскурсії та сервіси",
			Canonical:   base + "/about",
			OgImage:     defaultImage,
			JsonLd:      h.simpleBreadcrumbJsonLd(base, "Про Gaido", "/about"),
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
			title = pageTitleSuffix(fmt.Sprintf("%s — екскурсія в %s", e.Title, e.CityName))
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
		desc := truncateDesc(g.About, 160)
		if desc == "" {
			desc = "Профіль гіда " + g.DisplayName
		}
		img := defaultImage
		if g.AvatarURL != "" {
			img = h.mediaPublicURL(g.AvatarURL)
		}
		return &SpaPageMeta{
			Title:       pageTitleSuffix(g.DisplayName),
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
		return &SpaPageMeta{
			Title:       pageTitleSuffix(fmt.Sprintf("Екскурсії в %s", c.Name)),
			Description: truncateDesc(fmt.Sprintf("Екскурсії в %s — ціни, гіди, авторські маршрути для українців", c.Name), 160),
			Canonical:   base + "/countries/" + c.Slug,
			OgImage:     defaultImage,
			JsonLd:      h.countryPageJsonLd(ctx, c, base),
		}

	case "city":
		if len(parts) != 2 {
			return nil
		}
		city, err := h.Geo.GetCityBySlug(ctx, parts[1])
		if err != nil || city == nil {
			return nil
		}
		return &SpaPageMeta{
			Title:       pageTitleSuffix(fmt.Sprintf("Екскурсії в %s", city.Name)),
			Description: truncateDesc(fmt.Sprintf("Гіди та авторські екскурсії в %s — бронювання напряму з гідом", city.Name), 160),
			Canonical:   base + "/city/" + city.Slug,
			OgImage:     defaultImage,
			JsonLd:      h.cityPageJsonLd(ctx, city, base),
		}

	case "guides":
		if len(parts) == 3 && parts[1] == "countries" {
			c, err := h.Geo.GetCountryBySlug(ctx, parts[2])
			if err != nil || c == nil {
				return nil
			}
			return &SpaPageMeta{
				Title:       pageTitleSuffix(fmt.Sprintf("Гіди в %s", c.Name)),
				Description: truncateDesc(fmt.Sprintf("Місцеві гіди в %s — авторські маршрути українською", c.Name), 160),
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
			Title:       pageTitleSuffix("Українці в " + name),
			Description: truncateDesc("Українські послуги та ресурси в "+name+" та поруч.", 160),
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
	return h == "svit.gaido.top" || h == "localhost" || strings.HasPrefix(h, "127.0.0.1")
}

// HTMLEscapeAttr escapes text for HTML attribute values.
func HTMLEscapeAttr(s string) string {
	return html.EscapeString(s)
}
