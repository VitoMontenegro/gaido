package app

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

const (
	keyHomeContent   = "home_content"
	keyFooterContent = "footer_content"
)

func defaultHomeContent() domain.HomeContent {
	return domain.HomeContent{
		HeroTitle:    "Знайди свій спосіб мандрувати",
		HeroSubtitle: "Авторські маршрути від місцевих гідів — обирайте програму та звʼязуйтеся напряму",
		CategoryTiles: []domain.HomeCategoryTile{
			{Label: "Пошук", URL: "/search", ImageURL: "/images/home/search.jpg"},
			{Label: "Карта", URL: "/map", ImageURL: "/images/home/map.jpg"},
			{Label: "Гіди", URL: "/guides", ImageURL: "/images/home/guides.jpg"},
			{Label: "Журнал", URL: "/journal", ImageURL: "/images/home/journal.jpg"},
		},
		AboutImageURL: "/images/home/about.jpg",
		Cta: domain.HomeCta{
			Title:          "Зʼявились питання?",
			Text:           "Звʼяжіться з нами — відповімо протягом 60 хвилин у робочий час",
			Schedule:       "Пн–Нд 09:00 – 18:00",
			PrimaryLabel:   "Знайти екскурсію",
			PrimaryURL:     "/search",
			SecondaryLabel: "Стати гідом",
			SecondaryURL:   "/register",
		},
		Stats: []domain.HomeStat{
			{Value: "2 млн+", Label: "мандрівників"},
			{Value: "5000+", Label: "гідів"},
			{Value: "800+", Label: "міст"},
		},
		Benefits: []domain.HomeBenefit{
			{Title: "Прямий контакт", Text: "Зв'язок з гідом без посередників"},
			{Title: "Авторські маршрути", Text: "Живі історії від місцевих"},
		},
		FAQ: []domain.HomeFAQ{
			{Question: "Як забронювати?", Answer: "Напишіть гіду через контакти в профілі."},
		},
	}
}

func mergeHomeContent(stored domain.HomeContent) domain.HomeContent {
	def := defaultHomeContent()
	if stored.HeroTitle == "" {
		stored.HeroTitle = def.HeroTitle
	}
	if stored.HeroSubtitle == "" {
		stored.HeroSubtitle = def.HeroSubtitle
	}
	if len(stored.CategoryTiles) == 0 {
		stored.CategoryTiles = def.CategoryTiles
	} else {
		hasJournal := false
		for _, tile := range stored.CategoryTiles {
			if tile.URL == "/journal" {
				hasJournal = true
				break
			}
		}
		if !hasJournal {
			stored.CategoryTiles = append(stored.CategoryTiles, domain.HomeCategoryTile{
				Label: "Журнал", URL: "/journal", ImageURL: "/images/home/journal.jpg",
			})
		}
	}
	if stored.AboutImageURL == "" {
		stored.AboutImageURL = def.AboutImageURL
	}
	if stored.Cta.Title == "" {
		stored.Cta = def.Cta
	}
	if len(stored.Stats) == 0 {
		stored.Stats = def.Stats
	}
	if len(stored.Benefits) == 0 {
		stored.Benefits = def.Benefits
	}
	if len(stored.FAQ) == 0 {
		stored.FAQ = def.FAQ
	}
	return stored
}

func defaultFooterContent() domain.FooterContent {
	return domain.FooterContent{
		Phone:       "+380 44 000 00 00",
		Email:       "hello@gaido.example",
		Description: "Каталог гідів та авторських екскурсій. Прямий контакт без посередників.",
		Copyright:   "Gaido",
	}
}

func (a *App) loadHomeContent(ctx context.Context) domain.HomeContent {
	var c domain.HomeContent
	if err := a.settings.GetJSON(ctx, keyHomeContent, &c); err != nil {
		return defaultHomeContent()
	}
	return mergeHomeContent(c)
}

func (a *App) loadFooterContent(ctx context.Context) domain.FooterContent {
	var c domain.FooterContent
	if err := a.settings.GetJSON(ctx, keyFooterContent, &c); err != nil {
		return defaultFooterContent()
	}
	return c
}

func (a *App) getSite(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	content := a.loadHomeContent(ctx)
	footer := a.loadFooterContent(ctx)

	featuredGuides := a.resolveFeaturedGuides(ctx, 4)
	featuredExcursions := a.resolveFeaturedExcursions(ctx, 6)
	destinations := a.resolvePopularDestinations(ctx, content.PopularCitySlugs)

	response.JSON(w, r, 200, domain.SitePayload{
		Home: domain.SiteHomePayload{
			Content:             content,
			FeaturedGuides:      featuredGuides,
			FeaturedExcursions:  featuredExcursions,
			PopularDestinations: destinations,
		},
		Footer: footer,
	})
}

func (a *App) resolveFeaturedGuides(ctx context.Context, limit int) []domain.PublicGuideDTO {
	out := make([]domain.PublicGuideDTO, 0, limit)
	seen := map[int64]bool{}
	var touchIDs []int64

	placements, _ := a.featured.ListActiveBySlotType(ctx, domain.FeaturedSlotGuide, limit)
	for _, p := range placements {
		if len(out) >= limit {
			break
		}
		g, _ := a.guides.GetByID(ctx, p.GuideID)
		if g == nil || g.Status != domain.GuideStatusActive || seen[g.ID] {
			continue
		}
		seen[g.ID] = true
		touchIDs = append(touchIDs, g.ID)
		out = append(out, a.publicGuideDTO(ctx, g))
	}

	if len(out) < limit {
		exclude := make([]int64, 0, len(seen))
		for id := range seen {
			exclude = append(exclude, id)
		}
		randomGuides, _ := a.guides.ListPublicRandom(ctx, limit-len(out), exclude)
		for i := range randomGuides {
			g := &randomGuides[i]
			if seen[g.ID] {
				continue
			}
			seen[g.ID] = true
			touchIDs = append(touchIDs, g.ID)
			out = append(out, a.publicGuideDTO(ctx, g))
			if len(out) >= limit {
				break
			}
		}
	}

	_ = a.guides.TouchShown(ctx, touchIDs)
	return out
}

func (a *App) resolveFeaturedExcursions(ctx context.Context, limit int) []domain.ExcursionView {
	out := make([]domain.ExcursionView, 0, limit)
	seen := map[int64]bool{}

	placements, _ := a.featured.ListActiveBySlotType(ctx, domain.FeaturedSlotExcursion, limit)
	for _, p := range placements {
		if len(out) >= limit || p.ExcursionID == nil {
			continue
		}
		v, _ := a.exc.GetViewByID(ctx, *p.ExcursionID)
		if v == nil || seen[v.ID] {
			continue
		}
		seen[v.ID] = true
		out = append(out, *v)
	}

	if len(out) < limit {
		exclude := make([]int64, 0, len(seen))
		for id := range seen {
			exclude = append(exclude, id)
		}
		randomItems, _ := a.exc.ListPublicEnrichedRandom(ctx, limit-len(out), exclude)
		for i := range randomItems {
			if seen[randomItems[i].ID] {
				continue
			}
			seen[randomItems[i].ID] = true
			out = append(out, randomItems[i])
			if len(out) >= limit {
				break
			}
		}
	}

	return out
}

func (a *App) resolvePopularDestinations(ctx context.Context, citySlugs []string) []domain.DestinationGroup {
	points, err := a.geo.ListMapPoints(ctx)
	if err != nil || len(points) == 0 {
		return nil
	}
	if len(citySlugs) > 0 {
		withExcursions := make(map[string]bool, len(points))
		for _, p := range points {
			withExcursions[p.Slug] = true
		}
		filtered := make([]string, 0, len(citySlugs))
		for _, slug := range citySlugs {
			if withExcursions[slug] {
				filtered = append(filtered, slug)
			}
		}
		if len(filtered) == 0 {
			return nil
		}
		return a.destinationsFromCitySlugs(ctx, filtered)
	}
	groups := map[string]*domain.DestinationGroup{}
	order := []string{}
	for _, p := range points {
		g, ok := groups[p.CountrySlug]
		if !ok {
			g = &domain.DestinationGroup{CountrySlug: p.CountrySlug, CountryName: p.CountryName}
			groups[p.CountrySlug] = g
			order = append(order, p.CountrySlug)
		}
		g.Cities = append(g.Cities, domain.DestinationCity{Slug: p.Slug, Name: p.Name})
	}
	out := make([]domain.DestinationGroup, 0, 8)
	for i, key := range order {
		if i >= 8 {
			break
		}
		out = append(out, *groups[key])
	}
	return out
}

func (a *App) destinationsFromCitySlugs(ctx context.Context, slugs []string) []domain.DestinationGroup {
	groups := map[string]*domain.DestinationGroup{}
	order := []string{}
	for _, slug := range slugs {
		city, err := a.geo.GetCityBySlug(ctx, slug)
		if err != nil || city == nil {
			continue
		}
		key := city.CountrySlug
		g, ok := groups[key]
		if !ok {
			country, _ := a.geo.GetCountryBySlug(ctx, key)
			name := key
			if country != nil {
				name = country.Name
			}
			g = &domain.DestinationGroup{CountrySlug: key, CountryName: name}
			groups[key] = g
			order = append(order, key)
		}
		g.Cities = append(g.Cities, domain.DestinationCity{Slug: city.Slug, Name: city.Name})
	}
	out := make([]domain.DestinationGroup, 0, len(order))
	for _, key := range order {
		out = append(out, *groups[key])
	}
	return out
}

func (a *App) adminGetSiteContent(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, r, 200, map[string]any{
		"home":   a.loadHomeContent(r.Context()),
		"footer": a.loadFooterContent(r.Context()),
	})
}

func (a *App) adminSetSiteContent(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Home   domain.HomeContent   `json:"home"`
		Footer domain.FooterContent `json:"footer"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	ctx := r.Context()
	if err := a.settings.SetJSON(ctx, keyHomeContent, req.Home); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if err := a.settings.SetJSON(ctx, keyFooterContent, req.Footer); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := userIDFromCtx(ctx)
	_ = a.audit.Log(ctx, &actor, "SITE_CONTENT_UPDATE", "site_settings", nil, keyHomeContent, "updated", r.RemoteAddr, r.UserAgent())
	a.adminGetSiteContent(w, r)
}
