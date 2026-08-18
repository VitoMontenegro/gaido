package seed

import (
	"context"
	"encoding/json"
	"strings"
)

// countryNamesUK — продуктові назви (пріоритет над ISO/CLDR).
var countryNamesUK = map[string]string{
	"united-states": "Сполучені Штати Америки",
	"uae":           "ОАЕ",
	"vn":            "В'єтнам",
	"hk":            "Гонконг",
	"mo":            "Макао",
	"xk":            "Косово",
	"ae":            "ОАЕ",
}

func countryNameUK(slug, cca2, ukrTrans string) string {
	if n, ok := countryNamesUK[slug]; ok {
		return n
	}
	if n := isoCountryNameUK(cca2); n != "" {
		return n
	}
	return strings.TrimSpace(ukrTrans)
}

func isoCountryNameUK(cca2 string) string {
	if isoCountryNamesUK == nil {
		isoCountryNamesUK = loadISOCountryNamesUK()
	}
	return isoCountryNamesUK[strings.ToUpper(strings.TrimSpace(cca2))]
}

var isoCountryNamesUK map[string]string

func loadISOCountryNamesUK() map[string]string {
	out := map[string]string{}
	if err := json.Unmarshal(countriesUKJSON, &out); err != nil {
		panic("seed: countries_uk.json: " + err.Error())
	}
	return out
}

func (s *Seeder) syncCountryNamesUK(ctx context.Context) error {
	var items []mledozeCountry
	if err := json.Unmarshal(mledozeCountriesJSON, &items); err != nil {
		return err
	}
	for _, item := range items {
		if excludedCountryCodes[item.CCA2] {
			continue
		}
		slug := countrySlug(item.CCA2)
		name := countryNameUK(slug, item.CCA2, item.Translations.Ukr.Common)
		if name == "" {
			continue
		}
		if _, err := s.DB.Pool.Exec(ctx, `
			UPDATE countries SET name = $2, updated_at = NOW() WHERE slug = $1
		`, slug, name); err != nil {
			return err
		}
	}
	_, err := s.DB.Pool.Exec(ctx, `
		UPDATE regions r SET name = c.name, updated_at = NOW()
		FROM countries c
		WHERE r.country_id = c.id AND r.slug = 'main'
	`)
	return err
}
