package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) LoadHomeContent(ctx context.Context) domain.HomeContent {
	var c domain.HomeContent
	if err := h.Settings.GetJSON(ctx, keyHomeContent, &c); err != nil {
		return defaultHomeContent()
	}
	return mergeHomeContent(c)
}
func (h *Handlers) LoadFooterContent(ctx context.Context) domain.FooterContent {
	var c domain.FooterContent
	if err := h.Settings.GetJSON(ctx, keyFooterContent, &c); err != nil {
		return defaultFooterContent()
	}
	return c
}
func (h *Handlers) GetSite(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	content := h.LoadHomeContent(ctx)
	footer := h.LoadFooterContent(ctx)

	featuredGuides := h.ResolveFeaturedGuides(ctx, 4)
	featuredExcursions := h.ResolveFeaturedExcursions(ctx, 6)
	destinations := h.ResolvePopularDestinations(ctx, content.PopularCitySlugs)

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
func (h *Handlers) ResolveFeaturedGuides(ctx context.Context, limit int) []domain.PublicGuideDTO {
	out := make([]domain.PublicGuideDTO, 0, limit)
	seen := map[int64]bool{}
	var touchIDs []int64

	placements, _ := h.Featured.ListActiveBySlotType(ctx, domain.FeaturedSlotGuide, limit)
	for _, p := range placements {
		if len(out) >= limit {
			break
		}
		g, _ := h.Guides.GetByID(ctx, p.GuideID)
		if g == nil || g.Status != domain.GuideStatusActive || seen[g.ID] {
			continue
		}
		seen[g.ID] = true
		touchIDs = append(touchIDs, g.ID)
		out = append(out, h.publicGuideDTO(ctx, g))
	}

	if len(out) < limit {
		exclude := make([]int64, 0, len(seen))
		for id := range seen {
			exclude = append(exclude, id)
		}
		randomGuides, _ := h.Guides.ListPublicRandom(ctx, limit-len(out), exclude)
		for i := range randomGuides {
			g := &randomGuides[i]
			if seen[g.ID] {
				continue
			}
			seen[g.ID] = true
			touchIDs = append(touchIDs, g.ID)
			out = append(out, h.publicGuideDTO(ctx, g))
			if len(out) >= limit {
				break
			}
		}
	}

	_ = h.Guides.TouchShown(ctx, touchIDs)
	return out
}
func (h *Handlers) ResolvePopularDestinations(ctx context.Context, citySlugs []string) []domain.DestinationGroup {
	points, err := h.Geo.ListMapPoints(ctx)
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
		return h.DestinationsFromCitySlugs(ctx, filtered)
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
func (h *Handlers) DestinationsFromCitySlugs(ctx context.Context, slugs []string) []domain.DestinationGroup {
	groups := map[string]*domain.DestinationGroup{}
	order := []string{}
	for _, slug := range slugs {
		city, err := h.Geo.GetCityBySlug(ctx, slug)
		if err != nil || city == nil {
			continue
		}
		key := city.CountrySlug
		g, ok := groups[key]
		if !ok {
			country, _ := h.Geo.GetCountryBySlug(ctx, key)
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
func (h *Handlers) AdminGetSiteContent(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, r, 200, map[string]any{
		"home":   h.LoadHomeContent(r.Context()),
		"footer": h.LoadFooterContent(r.Context()),
	})
}
func (h *Handlers) AdminSetSiteContent(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Home   domain.HomeContent   `json:"home"`
		Footer domain.FooterContent `json:"footer"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	ctx := r.Context()
	if err := h.Settings.SetJSON(ctx, keyHomeContent, req.Home); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if err := h.Settings.SetJSON(ctx, keyFooterContent, req.Footer); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := middleware.UserIDFromContext(ctx)
	_ = h.Audit.Log(ctx, &actor, "SITE_CONTENT_UPDATE", "site_settings", nil, keyHomeContent, "updated", r.RemoteAddr, r.UserAgent())
	h.AdminGetSiteContent(w, r)
}
