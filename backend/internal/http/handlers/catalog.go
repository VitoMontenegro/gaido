package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

func (h *Handlers) ListGuides(w http.ResponseWriter, r *http.Request) {
	limit, offset := paginate(r)
	var cityID, countryID *int64
	if c := r.URL.Query().Get("city_id"); c != "" {
		if id, err := strconv.ParseInt(c, 10, 64); err == nil {
			cityID = &id
		}
	}
	if slug := r.URL.Query().Get("country_slug"); slug != "" {
		country, err := h.Geo.GetCountryBySlug(r.Context(), slug)
		if err != nil || country == nil {
			response.Error(w, r, apperrors.ErrNotFound)
			return
		}
		countryID = &country.ID
	}
	guideType := r.URL.Query().Get("guide_type")
	items, err := h.Guides.ListPublic(r.Context(), cityID, countryID, guideType, limit, offset)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]domain.PublicGuideDTO, 0, len(items))
	ids := make([]int64, 0, len(items))
	for _, g := range items {
		out = append(out, h.publicGuideDTO(r.Context(), &g))
		ids = append(ids, g.ID)
	}
	_ = h.Guides.TouchShown(r.Context(), ids)
	response.JSON(w, r, 200, map[string]any{"items": out, "limit": limit, "offset": offset})
}
func (h *Handlers) ListTopGuides(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 20 {
		limit = 8
	}
	out := h.ResolveTopGuides(r.Context(), limit)
	response.JSON(w, r, 200, map[string]any{"items": out})
}
func (h *Handlers) ResolveTopGuides(ctx context.Context, limit int) []domain.PublicGuideDTO {
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
		dto := h.publicGuideDTO(ctx, g)
		dto.IsPromoted = true
		out = append(out, dto)
	}

	if len(out) < limit {
		exclude := make([]int64, 0, len(seen))
		for id := range seen {
			exclude = append(exclude, id)
		}
		topRated, _ := h.Guides.ListTopRated(ctx, limit-len(out), exclude)
		for i := range topRated {
			g := &topRated[i]
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

	if len(out) < limit {
		exclude := make([]int64, 0, len(seen))
		for id := range seen {
			exclude = append(exclude, id)
		}
		rest, _ := h.Guides.ListPublicRandom(ctx, limit-len(out), exclude)
		for i := range rest {
			g := &rest[i]
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
func (h *Handlers) GetGuide(w http.ResponseWriter, r *http.Request) {
	g, err := h.Guides.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || g == nil || g.Status != domain.GuideStatusActive {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, h.publicGuideDTO(r.Context(), g))
}
func (h *Handlers) ListExcursions(w http.ResponseWriter, r *http.Request) {
	limit, offset := paginate(r)
	var cityID *int64
	if c := r.URL.Query().Get("city_id"); c != "" {
		if id, err := strconv.ParseInt(c, 10, 64); err == nil {
			cityID = &id
		}
	}
	var dateFilter *time.Time
	if d := r.URL.Query().Get("date"); d != "" {
		if t, err := parseDateQuery(d); err == nil {
			dateFilter = t
		}
	}
	items, err := h.Exc.ListPublicEnriched(r.Context(), cityID, r.URL.Query().Get("q"), dateFilter, limit, offset)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items, "limit": limit, "offset": offset})
}
func (h *Handlers) GetExcursion(w http.ResponseWriter, r *http.Request) {
	e, err := h.Exc.GetViewBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || !h.canViewExcursion(r.Context(), e) {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	e.MapEmbedURL = guidesvc.ResolveMapEmbed(e.MapEmbedURL)
	if g, err := h.Guides.GetByID(r.Context(), e.GuideID); err == nil && g != nil {
		e.GuideContacts = h.publicGuideDTO(r.Context(), g).Contacts
		e.GuideAbout = g.About
		e.GuideRatingAvg = g.RatingAvg
		e.GuideRatingCount = g.RatingCount
	}
	response.JSON(w, r, 200, e)
}
func (h *Handlers) ListGuideExcursions(w http.ResponseWriter, r *http.Request) {
	g, err := h.Guides.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || g == nil || g.Status != domain.GuideStatusActive {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	items, err := h.Exc.ListPublishedByGuide(r.Context(), g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
