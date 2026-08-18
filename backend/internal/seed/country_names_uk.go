package seed

import (
	"context"
	"encoding/json"
	"strings"
)

// countryNamesUK — перевизначення українських назв країн (пріоритет над mledoze).
var countryNamesUK = map[string]string{
	"turkey":  "Туреччина",
	"italy":   "Італія",
	"georgia": "Грузія",
	"spain":   "Іспанія",
	"me":      "Чорногорія",
	"hr":      "Хорватія",
	"gr":      "Греція",
	"fr":      "Франція",
	"ae":      "ОАЕ",
	"th":      "Таїланд",
	"vn":      "В'єтнам",
	"eg":      "Єгипет",
	"am":      "Вірменія",
	"az":      "Азербайджан",
	"kz":      "Казахстан",
	"uz":      "Узбекистан",
	"ua":      "Україна",
	"pl":      "Польща",
	"de":      "Німеччина",
	"cz":      "Чехія",
	"at":      "Австрія",
	"hu":      "Угорщина",
	"sk":      "Словаччина",
	"ro":      "Румунія",
	"bg":      "Болгарія",
	"rs":      "Сербія",
	"lt":      "Литва",
	"lv":      "Латвія",
	"ee":      "Естонія",
	"md":      "Молдова",
	"pt":      "Португалія",
	"nl":      "Нідерланди",
	"be":      "Бельгія",
	"ch":      "Швейцарія",
	"gb":      "Велика Британія",
	"ie":      "Ірландія",
	"se":      "Швеція",
	"no":      "Норвегія",
	"dk":      "Данія",
	"fi":      "Фінляндія",
	"cy":      "Кіпр",
	"si":      "Словенія",
	"mk":      "Північна Македонія",
	"al":      "Албанія",
	"ba":      "Боснія і Герцеговина",
}

func countryNameUK(slug, ukrTrans, rusTrans string) string {
	if n, ok := countryNamesUK[slug]; ok {
		return n
	}
	if ukrTrans != "" {
		return ukrTrans
	}
	return rusToUkrApprox(rusTrans)
}

// rusToUkrApprox — наближена заміна рос. назви, якщо в mledoze немає ukr.
func rusToUkrApprox(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	replacer := strings.NewReplacer(
		"ия", "ія", "Ия", "Ія", "ИЯ", "ІЯ",
		"ы", "и", "Ы", "И",
		"э", "е", "Э", "Е",
		"ё", "йо", "Ё", "Йо",
	)
	return replacer.Replace(name)
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
		name := countryNameUK(slug, item.Translations.Ukr.Common, item.Translations.Rus.Common)
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
