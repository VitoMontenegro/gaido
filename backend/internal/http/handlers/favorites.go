package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TargetType string `json:"target_type"`
		TargetID   int64  `json:"target_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	added, err := h.Favs.Toggle(r.Context(), middleware.UserIDFromContext(r.Context()), req.TargetType, req.TargetID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]bool{"favorited": added})
}

func (h *Handlers) ListFavorites(w http.ResponseWriter, r *http.Request) {
	items, err := h.Favs.ListEnriched(r.Context(), middleware.UserIDFromContext(r.Context()))
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	enriched := make([]map[string]any, 0, len(items))
	for _, f := range items {
		item := map[string]any{"target_type": f.TargetType, "target_id": f.TargetID}
		if f.Title != "" {
			item["title"] = f.Title
		}
		if f.Slug != "" {
			item["slug"] = f.Slug
		}
		if f.CoverImageURL != "" {
			item["cover_image_url"] = f.CoverImageURL
		}
		if f.CityName != "" {
			item["city_name"] = f.CityName
		}
		if f.PriceFrom > 0 || f.Currency != "" {
			item["price_from"] = f.PriceFrom
			item["currency"] = f.Currency
		}
		if f.Description != "" {
			item["description"] = f.Description
		}
		if f.RatingCount > 0 || f.RatingAvg > 0 {
			item["rating_avg"] = f.RatingAvg
			item["rating_count"] = f.RatingCount
		}
		if f.AvatarURL != "" {
			item["avatar_url"] = f.AvatarURL
		}
		enriched = append(enriched, item)
	}
	response.JSON(w, r, 200, map[string]any{"items": enriched})
}
