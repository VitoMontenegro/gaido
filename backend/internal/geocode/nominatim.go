package geocode

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const defaultBaseURL = "https://nominatim.openstreetmap.org"

// slugToISO — зворотний мапінг до seed.countrySlugOverrides для багатосимвольних slug.
var slugToISO = map[string]string{
	"russia":         "ru",
	"turkey":         "tr",
	"italy":          "it",
	"georgia":        "ge",
	"spain":          "es",
	"united-kingdom": "gb",
	"united-states":  "us",
	"uae":            "ae",
	"south-korea":    "kr",
	"north-korea":    "kp",
	"czechia":        "cz",
}

type Nominatim struct {
	BaseURL   string
	UserAgent string
	Client    *http.Client
}

type CityResult struct {
	Lat  float64
	Lng  float64
	Name string
}

func NewNominatim(userAgent string) *Nominatim {
	ua := strings.TrimSpace(userAgent)
	if ua == "" {
		ua = "GaidoTop/1.0"
	}
	return &Nominatim{
		BaseURL:   defaultBaseURL,
		UserAgent: ua,
		Client:    &http.Client{Timeout: 8 * time.Second},
	}
}

func CountryISO(slug string) string {
	slug = strings.ToLower(strings.TrimSpace(slug))
	if len(slug) == 2 {
		return slug
	}
	return slugToISO[slug]
}

type searchHit struct {
	Lat         string            `json:"lat"`
	Lon         string            `json:"lon"`
	Name        string            `json:"name"`
	NameDetails map[string]string `json:"namedetails"`
}

func (h searchHit) ukrainianName() string {
	if h.NameDetails != nil {
		if uk, ok := h.NameDetails["name:uk"]; ok && strings.TrimSpace(uk) != "" {
			return strings.TrimSpace(uk)
		}
	}
	return strings.TrimSpace(h.Name)
}

// SearchCity шукає координати та українську назву населеного пункту в межах країни.
func (n *Nominatim) SearchCity(ctx context.Context, cityName, countrySlug string) (CityResult, bool, error) {
	cityName = strings.TrimSpace(cityName)
	if cityName == "" {
		return CityResult{}, false, nil
	}
	base := strings.TrimRight(n.BaseURL, "/")
	endpoint, err := url.Parse(base + "/search")
	if err != nil {
		return CityResult{}, false, err
	}
	q := endpoint.Query()
	q.Set("q", cityName)
	q.Set("format", "json")
	q.Set("limit", "1")
	q.Set("namedetails", "1")
	q.Set("featuretype", "city,town,village,hamlet")
	if iso := CountryISO(countrySlug); iso != "" {
		q.Set("countrycodes", iso)
	}
	endpoint.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return CityResult{}, false, err
	}
	req.Header.Set("User-Agent", n.UserAgent)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Language", "uk")

	client := n.Client
	if client == nil {
		client = &http.Client{Timeout: 8 * time.Second}
	}
	res, err := client.Do(req)
	if err != nil {
		return CityResult{}, false, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return CityResult{}, false, fmt.Errorf("nominatim: status %d", res.StatusCode)
	}
	var hits []searchHit
	if err := json.NewDecoder(res.Body).Decode(&hits); err != nil {
		return CityResult{}, false, err
	}
	if len(hits) == 0 {
		return CityResult{}, false, nil
	}
	hit := hits[0]
	var lat, lng float64
	if _, err := fmt.Sscanf(hit.Lat, "%f", &lat); err != nil {
		return CityResult{}, false, err
	}
	if _, err := fmt.Sscanf(hit.Lon, "%f", &lng); err != nil {
		return CityResult{}, false, err
	}
	name := NormalizeDisplayName(hit.ukrainianName())
	return CityResult{Lat: lat, Lng: lng, Name: name}, true, nil
}

type reverseHit struct {
	Lat         string            `json:"lat"`
	Lon         string            `json:"lon"`
	Name        string            `json:"name"`
	NameDetails map[string]string `json:"namedetails"`
}

// ReverseCity повертає українську назву населеного пункту за координатами.
func (n *Nominatim) ReverseCity(ctx context.Context, lat, lng float64) (CityResult, bool, error) {
	if lat == 0 && lng == 0 {
		return CityResult{}, false, nil
	}
	base := strings.TrimRight(n.BaseURL, "/")
	endpoint, err := url.Parse(base + "/reverse")
	if err != nil {
		return CityResult{}, false, err
	}
	q := endpoint.Query()
	q.Set("lat", fmt.Sprintf("%f", lat))
	q.Set("lon", fmt.Sprintf("%f", lng))
	q.Set("format", "json")
	q.Set("namedetails", "1")
	q.Set("zoom", "10")
	endpoint.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return CityResult{}, false, err
	}
	req.Header.Set("User-Agent", n.UserAgent)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Language", "uk")

	client := n.Client
	if client == nil {
		client = &http.Client{Timeout: 8 * time.Second}
	}
	res, err := client.Do(req)
	if err != nil {
		return CityResult{}, false, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return CityResult{}, false, fmt.Errorf("nominatim reverse: status %d", res.StatusCode)
	}
	var hit reverseHit
	if err := json.NewDecoder(res.Body).Decode(&hit); err != nil {
		return CityResult{}, false, err
	}
	name := NormalizeDisplayName(searchHit(hit).ukrainianName())
	if name == "" {
		return CityResult{}, false, nil
	}
	var rLat, rLng float64
	if _, err := fmt.Sscanf(hit.Lat, "%f", &rLat); err != nil {
		rLat = lat
	}
	if _, err := fmt.Sscanf(hit.Lon, "%f", &rLng); err != nil {
		rLng = lng
	}
	return CityResult{Lat: rLat, Lng: rLng, Name: name}, true, nil
}
