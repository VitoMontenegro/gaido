package seed

import (
	"context"
	"time"

	"github.com/vitomonte/experts-tourister/internal/geocode"
)

func cityNamesUKCatalog() map[string]string {
	out := make(map[string]string)
	add := func(countrySlug, citySlug, name string) {
		out[countrySlug+"/"+citySlug] = name
	}
	for _, c := range append(extraCities, europeExtraCities...) {
		add(c.countrySlug, c.slug, c.name)
	}
	for _, country := range geoCatalog {
		for _, region := range country.regions {
			for _, city := range region.cities {
				add(country.slug, city.slug, city.name)
			}
		}
	}
	for _, c := range capitalNamesUKOverrides {
		add(c.countrySlug, c.citySlug, c.name)
	}
	return out
}

// capitalNamesUKOverrides — столиці, де Nominatim/OSM не дає коректної укр. назви.
var capitalNamesUKOverrides = []struct {
	countrySlug, citySlug, name string
}{
	{"jp", "tokyo", "Токіо"},
	{"us", "washington-d.c.", "Вашингтон"},
	{"us", "washington", "Вашингтон"},
}

func (s *Seeder) syncCityNamesUK(ctx context.Context, withNominatim bool) error {
	if err := s.syncCityNamesFromCatalog(ctx); err != nil {
		return err
	}
	if err := s.syncCityNamesNormalized(ctx); err != nil {
		return err
	}
	if !withNominatim {
		return nil
	}
	return s.syncCityNamesFromNominatim(ctx)
}

func (s *Seeder) syncCityNamesNormalized(ctx context.Context) error {
	rows, err := s.Geo.ListCitiesForNameSync(ctx)
	if err != nil {
		return err
	}
	for _, row := range rows {
		normed := geocode.NormalizeDisplayName(row.Name)
		if normed != "" && normed != row.Name {
			if err := s.Geo.UpdateCityName(ctx, row.ID, normed); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Seeder) syncCityNamesFromCatalog(ctx context.Context) error {
	catalog := cityNamesUKCatalog()
	for key, name := range catalog {
		countrySlug, citySlug, ok := splitCityCatalogKey(key)
		if !ok {
			continue
		}
		if _, err := s.DB.Pool.Exec(ctx, `
			UPDATE cities c SET name = $3, updated_at = NOW()
			FROM countries co
			WHERE c.country_id = co.id AND co.slug = $1 AND c.slug = $2
		`, countrySlug, citySlug, name); err != nil {
			return err
		}
	}
	return nil
}

func splitCityCatalogKey(key string) (countrySlug, citySlug string, ok bool) {
	for i := 0; i < len(key); i++ {
		if key[i] == '/' {
			return key[:i], key[i+1:], true
		}
	}
	return "", "", false
}

func (s *Seeder) syncCityNamesFromNominatim(ctx context.Context) error {
	rows, err := s.Geo.ListCitiesForNameSync(ctx)
	if err != nil {
		return err
	}
	geo := geocode.NewNominatim("GaidoTop Seed (+https://gaido.top)")
	for _, row := range rows {
		if err := ctx.Err(); err != nil {
			return err
		}
		if !geocode.NeedsUkrainianName(row.Name) {
			continue
		}
		var (
			result geocode.CityResult
			ok     bool
			gerr   error
		)
		result, ok, gerr = geo.SearchCity(ctx, row.Name, row.CountrySlug)
		if gerr != nil || !ok || result.Name == "" || !geocode.HasCyrillic(result.Name) {
			time.Sleep(1100 * time.Millisecond)
			continue
		}
		if err := s.Geo.UpdateCityName(ctx, row.ID, result.Name); err != nil {
			return err
		}
		if (row.Latitude == 0 && row.Longitude == 0) && (result.Lat != 0 || result.Lng != 0) {
			_ = s.Geo.UpdateCityCoords(ctx, row.ID, result.Lat, result.Lng)
		}
		time.Sleep(1100 * time.Millisecond)
	}
	return nil
}
