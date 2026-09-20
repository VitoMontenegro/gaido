package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

func (h *Handlers) ListCountries(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("with_guides") == "1" {
		items, err := h.Geo.ListCountriesWithGuideCount(r.Context())
		if err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		response.JSON(w, r, 200, map[string]any{"items": items})
		return
	}
	items, err := h.Geo.ListCountries(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) ListCities(w http.ResponseWriter, r *http.Request) {
	items, err := h.Geo.ListCities(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) ListCitiesByCountry(w http.ResponseWriter, r *http.Request) {
	items, err := h.Geo.ListCitiesByCountry(r.Context(), chi.URLParam(r, "country"))
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) ListMapPoints(w http.ResponseWriter, r *http.Request) {
	items, err := h.Geo.ListMapPoints(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []postgres.MapPoint{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) GetCityByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	c, err := h.Geo.GetCityByID(r.Context(), id)
	if err != nil || c == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, c)
}
func (h *Handlers) GetCity(w http.ResponseWriter, r *http.Request) {
	c, err := h.Geo.GetCityBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || c == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, c)
}

func (h *Handlers) GeoSearch(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len(q) < 2 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	hit, ok, err := h.geocoder().SearchAddress(r.Context(), q, r.URL.Query().Get("country"))
	if err != nil {
		h.Log.Warn("geo search failed", "q", q, "err", err)
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if !ok {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, hit)
}

func (h *Handlers) GeoAddress(w http.ResponseWriter, r *http.Request) {
	lat, err1 := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	lng, err2 := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
	if err1 != nil || err2 != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	hit, ok, err := h.geocoder().ReverseAddress(r.Context(), lat, lng)
	if err != nil {
		h.Log.Warn("geo reverse address failed", "err", err)
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if !ok {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	out := map[string]any{
		"lat": hit.Lat, "lng": hit.Lng, "address": hit.Address,
		"district": hit.District, "city_name": hit.CityName,
	}
	if city, err := h.Providers.ReverseGeocodeCity(r.Context(), lat, lng); err == nil && city != nil {
		out["city_id"] = city.ID
		out["city_name"] = city.Name
		out["city_slug"] = city.Slug
		out["country_slug"] = city.CountrySlug
	}
	response.JSON(w, r, 200, out)
}
func (h *Handlers) CreateCountry(w http.ResponseWriter, r *http.Request) {
	var req struct{ Slug, Name string }
	_ = json.NewDecoder(r.Body).Decode(&req)
	id, err := h.Geo.CreateCountry(r.Context(), req.Slug, req.Name)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}
func (h *Handlers) CreateRegion(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CountryID int64  `json:"country_id"`
		Slug      string `json:"slug"`
		Name      string `json:"name"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	id, err := h.Geo.CreateRegion(r.Context(), req.CountryID, req.Slug, req.Name)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}
func (h *Handlers) CreateCity(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CountryID int64   `json:"country_id"`
		RegionID  int64   `json:"region_id"`
		Slug      string  `json:"slug"`
		Name      string  `json:"name"`
		Lat       float64 `json:"latitude"`
		Lng       float64 `json:"longitude"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	id, err := h.Geo.CreateCity(r.Context(), req.CountryID, req.RegionID, req.Slug, req.Name, req.Lat, req.Lng)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}
