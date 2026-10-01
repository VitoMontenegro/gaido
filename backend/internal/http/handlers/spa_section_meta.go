package handlers

import (
	"context"
	"strconv"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

func (h *Handlers) resolveTransportMeta(ctx context.Context, path, base string) *SpaPageMeta {
	defaultImage := h.publicBaseURL() + "/api/v1/media/public/d2b27d81f09874a08b4dc3293fe67f2e.webp"
	path = strings.TrimSuffix(path, "/")
	if path == "" {
		path = "/"
	}

	switch {
	case path == "/":
		body := newCrawlBody(seoTransportHomeTitle, seoTransportHomeDescription, portalHubTransportText)
		tiles := make([]CrawlLink, 0, len(transportHomeTiles))
		for _, tile := range transportHomeTiles {
			tiles = append(tiles, crawlLink(tile.Label, absURL(base, tile.Path)))
		}
		body = body.withSection("", nil, tiles)
		routes := make([]CrawlLink, 0, len(transportPopularRoutes))
		for _, route := range transportPopularRoutes {
			routes = append(routes, crawlLink(route.Label, absURL(base, "/routes/"+route.From+"/"+route.To)))
		}
		body = body.withSection("Популярні маршрути", nil, routes)
		if h.Transport != nil {
			if rides, _, err := h.Transport.Search(ctx, postgres.TransportSearchParams{Limit: 8}); err == nil {
				body = body.withSection("Рейси", nil, rideCrawlLinks(base, rides))
			}
		}
		if h.Carriers != nil {
			if carriers, _, err := h.Carriers.ListPublished(ctx, postgres.CarrierSearchParams{Limit: 4}); err == nil {
				body = body.withSection("Перевізники", nil, carrierCrawlLinks(base, carriers))
			}
		}
		body = body.withFAQ(transportHomeFAQ)
		return (&SpaPageMeta{
			Title:       pageTitleSuffix(seoTransportHomeTitle),
			Description: seoTransportHomeDescription,
			Canonical:   absURL(base, "/"),
			OgImage:     defaultImage,
		}).withBody(body)
	case path == "/search":
		return (&SpaPageMeta{
			Title:       pageTitleSuffix(seoTransportSearchHeading),
			Description: seoTransportSearchDescription,
			Canonical:   absURL(base, "/search"),
			OgImage:     defaultImage,
		}).withBody(newCrawlBody(seoTransportSearchHeading, seoTransportSearchDescription))
	case path == "/carriers":
		var carriers []domain.CarrierProfile
		if h.Carriers != nil {
			carriers, _, _ = h.Carriers.ListPublished(ctx, postgres.CarrierSearchParams{Limit: 50})
		}
		return (&SpaPageMeta{
			Title:       pageTitleSuffix(seoTransportCarriersHeading),
			Description: seoTransportCarriersDescription,
			Canonical:   absURL(base, "/carriers"),
			OgImage:     defaultImage,
		}).withBody(newCrawlBody(seoTransportCarriersHeading, seoTransportCarriersDescription).withSection("", nil, carrierCrawlLinks(base, carriers)))
	case path == "/cities":
		var rides []domain.TransportListing
		if h.Transport != nil {
			rides, _, _ = h.Transport.Search(ctx, postgres.TransportSearchParams{Limit: 100})
		}
		return (&SpaPageMeta{
			Title:       pageTitleSuffix(seoTransportCitiesHeading),
			Description: seoTransportCitiesDescription,
			Canonical:   absURL(base, "/cities"),
			OgImage:     defaultImage,
		}).withBody(newCrawlBody(seoTransportCitiesHeading, seoTransportCitiesDescription).withSection("", nil, cityFromRidesLinks(base, rides)))
	}

	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 {
		return nil
	}
	switch parts[0] {
	case "carriers":
		if len(parts) != 2 || h.Carriers == nil {
			return nil
		}
		c, err := h.Carriers.GetProfileBySlug(ctx, parts[1])
		if err != nil || c == nil || c.Status != domain.CarrierStatusPublished {
			return nil
		}
		title := strings.TrimSpace(c.DisplayName)
		if title == "" {
			title = strings.TrimSpace(c.BusinessName)
		}
		if title == "" {
			title = "Перевізник"
		}
		desc := truncateDesc(c.About, 160)
		if desc == "" {
			desc = title + " — міжнародні перевезення на Vezu"
		}
		var rides []domain.TransportListing
		if h.Transport != nil {
			rides, _ = h.Transport.ListByProvider(ctx, c.ProviderID)
		}
		published := make([]domain.TransportListing, 0, len(rides))
		for _, ride := range rides {
			if ride.Status == domain.TransportListingPublished {
				published = append(published, ride)
			}
		}
		return (&SpaPageMeta{
			Title:       pageTitleSuffix(title),
			Description: desc,
			Canonical:   absURL(base, "/carriers/"+c.WebsiteSlug),
			OgImage:     defaultImage,
		}).withBody(newCrawlBody(title, splitParagraphs(c.About)...).withSection("Рейси", nil, rideCrawlLinks(base, published)))
	case "cities":
		if len(parts) != 2 || h.Geo == nil {
			return nil
		}
		city, err := h.Geo.GetCityBySlug(ctx, parts[1])
		if err != nil || city == nil {
			return nil
		}
		var rides []domain.TransportListing
		if h.Transport != nil {
			rides, _, _ = h.Transport.Search(ctx, postgres.TransportSearchParams{Limit: 100})
		}
		fromLinks := rideCrawlLinks(base, ridesForCity(rides, city.ID, true))
		toLinks := rideCrawlLinks(base, ridesForCity(rides, city.ID, false))
		count := len(fromLinks) + len(toLinks)
		heading := "Рейси: " + city.Name
		desc := seoCityHubDescription(city.Name, count)
		related := make([]CrawlLink, 0)
		for _, route := range transportPopularRoutes {
			if route.From == city.Slug || route.To == city.Slug {
				related = append(related, crawlLink(route.Label, absURL(base, "/routes/"+route.From+"/"+route.To)))
			}
		}
		body := newCrawlBody(heading, desc)
		body = body.withSection("Популярні маршрути", nil, related)
		body = body.withSection("З міста", nil, fromLinks)
		body = body.withSection("До міста", nil, toLinks)
		return (&SpaPageMeta{
			Title:       pageTitleSuffix(seoCityHubHeading(city.Name)),
			Description: desc,
			Canonical:   absURL(base, "/cities/"+city.Slug),
			OgImage:     defaultImage,
		}).withBody(body)
	case "routes":
		if len(parts) != 3 || h.Geo == nil {
			return nil
		}
		fromCity, err := h.Geo.GetCityBySlug(ctx, parts[1])
		if err != nil || fromCity == nil {
			return nil
		}
		toCity, err := h.Geo.GetCityBySlug(ctx, parts[2])
		if err != nil || toCity == nil {
			return nil
		}
		var rides []domain.TransportListing
		total := 0
		if h.Transport != nil {
			rides, total, _ = h.Transport.Search(ctx, postgres.TransportSearchParams{
				FromCityID: fromCity.ID,
				ToCityID:   toCity.ID,
				Limit:      50,
			})
		}
		label := fromCity.Name + " → " + toCity.Name
		desc := seoRouteDescription(fromCity.Name, toCity.Name, total)
		return (&SpaPageMeta{
			Title:       pageTitleSuffix(seoRouteHeading(fromCity.Name, toCity.Name)),
			Description: desc,
			Canonical:   absURL(base, "/routes/"+fromCity.Slug+"/"+toCity.Slug),
			OgImage:     defaultImage,
		}).withBody(newCrawlBody(label, desc).withSection("Рейси", nil, rideCrawlLinks(base, rides)))
	case "rides":
		if len(parts) != 2 || h.Transport == nil {
			return nil
		}
		id, err := strconv.ParseInt(parts[1], 10, 64)
		if err != nil || id <= 0 {
			return nil
		}
		ride, err := h.Transport.GetByID(ctx, id)
		if err != nil || ride == nil || ride.Status != domain.TransportListingPublished {
			return nil
		}
		label := rideLabel(*ride)
		desc := truncateDesc(ride.Description, 160)
		if desc == "" {
			desc = label + " — міжнародні перевезення на Vezu"
		}
		paras := compactParagraphs([]string{label, ride.Description})
		var carrierLinks []CrawlLink
		if ride.ProviderSlug != "" {
			name := strings.TrimSpace(ride.ProviderName)
			if name == "" {
				name = "Перевізник"
			}
			carrierLinks = []CrawlLink{crawlLink(name, absURL(base, "/carriers/"+ride.ProviderSlug))}
		}
		return (&SpaPageMeta{
			Title:       pageTitleSuffix(label),
			Description: desc,
			Canonical:   absURL(base, "/rides/"+strconv.FormatInt(ride.ID, 10)),
			OgImage:     defaultImage,
		}).withBody(newCrawlBody(label, paras...).withSection("Перевізник", nil, carrierLinks))
	case "legal":
		if len(parts) != 2 {
			return nil
		}
		return h.legalPageMeta(ctx, base, defaultImage, parts[1])
	case "login", "register", "account", "admin", "moderator", "downloads":
		return &SpaPageMeta{Title: pageTitleSuffix(""), NoIndex: true}
	}
	return nil
}

func ridesForCity(items []domain.TransportListing, cityID int64, depart bool) []domain.TransportListing {
	out := make([]domain.TransportListing, 0)
	for _, item := range items {
		stops := item.Stops
		if len(stops) == 0 {
			continue
		}
		if depart && stops[0].CityID == cityID {
			out = append(out, item)
			continue
		}
		if !depart && stops[len(stops)-1].CityID == cityID {
			out = append(out, item)
		}
	}
	return out
}

func (h *Handlers) resolveServicesMeta(ctx context.Context, path, base string) *SpaPageMeta {
	defaultImage := h.publicBaseURL() + "/api/v1/media/public/d2b27d81f09874a08b4dc3293fe67f2e.webp"
	path = strings.TrimSuffix(path, "/")
	if path == "" {
		path = "/"
	}

	switch {
	case path == "/":
		var catLinks []CrawlLink
		if h.Providers != nil {
			if cats, err := h.Providers.ListCategories(ctx); err == nil {
				for _, cat := range cats {
					if cat.Name == "" {
						continue
					}
					catLinks = append(catLinks, crawlLink(cat.Name, absURL(base, "/")))
				}
			}
		}
		body := newCrawlBody(seoServicesHomeTitle, seoServicesHomeDescription)
		body = body.withSection("", splitParagraphs(portalHubServicesText), nil)
		body = body.withSection("Категорії", nil, catLinks)
		return (&SpaPageMeta{
			Title:       pageTitleSuffix(seoServicesHomeTitle),
			Description: seoServicesHomeDescription,
			Canonical:   absURL(base, "/"),
			OgImage:     defaultImage,
		}).withBody(body)
	}

	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 {
		return nil
	}
	switch parts[0] {
	case "provider":
		if len(parts) != 2 || h.Providers == nil {
			return nil
		}
		p, err := h.Providers.GetProviderBySlug(ctx, parts[1])
		if err != nil || p == nil || p.Status == domain.ProviderStatusBlocked {
			return nil
		}
		published := p.Status == domain.ProviderStatusVerified || p.Status == domain.ProviderStatusModeration
		if !published {
			return nil
		}
		desc := truncateDesc(p.About, 160)
		if desc == "" {
			desc = p.DisplayName + " — послуги українською за кордоном"
		}
		offerings, _ := h.Providers.ListOfferingsByProvider(ctx, p.ID, true)
		offeringParas := make([]string, 0, len(offerings))
		for _, o := range offerings {
			line := strings.TrimSpace(o.Title)
			if o.Description != "" {
				if line != "" {
					line += ". "
				}
				line += strings.TrimSpace(o.Description)
			}
			if line != "" {
				offeringParas = append(offeringParas, line)
			}
		}
		body := newCrawlBody(p.DisplayName, splitParagraphs(p.About)...)
		if p.Profession != "" {
			body.Paragraphs = append([]string{p.Profession}, body.Paragraphs...)
		}
		body = body.withSection("Послуги", offeringParas, nil)
		return (&SpaPageMeta{
			Title:       pageTitleSuffix(p.DisplayName),
			Description: desc,
			Canonical:   absURL(base, "/provider/"+p.WebsiteSlug),
			OgImage:     defaultImage,
		}).withBody(body)
	case "legal":
		if len(parts) != 2 {
			return nil
		}
		return h.legalPageMeta(ctx, base, defaultImage, parts[1])
	case "login", "register", "account", "admin", "moderator", "downloads":
		return &SpaPageMeta{Title: pageTitleSuffix(""), NoIndex: true}
	}
	return nil
}
