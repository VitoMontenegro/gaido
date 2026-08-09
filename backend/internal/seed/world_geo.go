package seed

import (
	"context"
	_ "embed"
	"encoding/json"
	"strings"

	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

//go:embed data/countries.json
var mledozeCountriesJSON []byte

type mledozeCountry struct {
	CCA2         string   `json:"cca2"`
	Capital      []string `json:"capital"`
	LatLng       []float64 `json:"latlng"`
	Name         struct {
		Common string `json:"common"`
	} `json:"name"`
	Translations struct {
		Ukr struct {
			Common string `json:"common"`
		} `json:"ukr"`
		Rus struct {
			Common string `json:"common"`
		} `json:"rus"`
	} `json:"translations"`
}

var countrySlugOverrides = map[string]string{
	"RU": "russia",
	"TR": "turkey",
	"IT": "italy",
	"GE": "georgia",
	"ES": "spain",
	"ME": "me",
	"GB": "united-kingdom",
	"US": "united-states",
	"AE": "uae",
	"KR": "south-korea",
	"KP": "north-korea",
	"CZ": "czechia",
}

func countrySlug(cca2 string) string {
	if s, ok := countrySlugOverrides[cca2]; ok {
		return s
	}
	return strings.ToLower(cca2)
}

func (s *Seeder) ensureWorldGeo(ctx context.Context) error {
	var items []mledozeCountry
	if err := json.Unmarshal(mledozeCountriesJSON, &items); err != nil {
		return err
	}

	for _, item := range items {
		slug := countrySlug(item.CCA2)
		name := countryNameUK(slug, item.Translations.Ukr.Common, item.Translations.Rus.Common, item.Name.Common)
		if name == "" {
			continue
		}

		countryID, err := s.Geo.EnsureCountry(ctx, slug, name)
		if err != nil {
			return err
		}

		var cityCount int
		if err := s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM cities WHERE country_id=$1`, countryID).Scan(&cityCount); err != nil {
			return err
		}
		if cityCount > 0 {
			continue
		}

		regionID, err := s.Geo.EnsureRegion(ctx, countryID, "main", name)
		if err != nil {
			return err
		}

		if len(item.Capital) == 0 {
			continue
		}

		capitalName := item.Capital[0]
		lat, lng := 0.0, 0.0
		if len(item.LatLng) >= 2 {
			lat, lng = item.LatLng[0], item.LatLng[1]
		}
		_, err = s.Geo.EnsureCity(ctx, countryID, regionID, guidesvc.CitySlug(capitalName), capitalName, lat, lng)
		if err != nil {
			return err
		}
	}
	return nil
}
