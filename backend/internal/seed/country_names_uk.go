package seed

import "context"

// countryNamesUK — українські назви країн за slug (для UI та seed).
var countryNamesUK = map[string]string{
	"turkey": "Туреччина",
	"italy":  "Італія",
	"georgia": "Грузія",
	"spain":  "Іспанія",
	"me":     "Чорногорія",
	"hr":     "Хорватія",
	"gr":     "Греція",
	"fr":     "Франція",
	"ae":     "ОАЕ",
	"th":     "Таїланд",
	"vn":     "В'єтнам",
	"eg":     "Єгипет",
	"am":     "Вірменія",
	"az":     "Азербайджан",
	"kz":     "Казахстан",
	"uz":     "Узбекистан",
	"ua":     "Україна",
	"pl":     "Польща",
	"de":     "Німеччина",
	"cz":     "Чехія",
	"at":     "Австрія",
	"hu":     "Угорщина",
	"sk":     "Словаччина",
	"ro":     "Румунія",
	"bg":     "Болгарія",
	"rs":     "Сербія",
	"lt":     "Литва",
	"lv":     "Латвія",
	"ee":     "Естонія",
	"md":     "Молдова",
	"pt":     "Португалія",
	"nl":     "Нідерланди",
	"be":     "Бельгія",
	"ch":     "Швейцарія",
	"gb":     "Велика Британія",
	"ie":     "Ірландія",
	"se":     "Швеція",
	"no":     "Норвегія",
	"dk":     "Данія",
	"fi":     "Фінляндія",
	"cy":     "Кіпр",
	"si":     "Словенія",
	"mk":     "Північна Македонія",
	"al":     "Албанія",
	"ba":     "Боснія і Герцеговина",
}

func countryNameUK(slug, ukrTrans, rusTrans, englishName string) string {
	if n, ok := countryNamesUK[slug]; ok {
		return n
	}
	if ukrTrans != "" {
		return ukrTrans
	}
	if englishName != "" {
		return englishName
	}
	return rusTrans
}

func (s *Seeder) syncCountryNamesUK(ctx context.Context) error {
	for slug, name := range countryNamesUK {
		if _, err := s.DB.Pool.Exec(ctx, `
			UPDATE countries SET name = $2, updated_at = NOW() WHERE slug = $1
		`, slug, name); err != nil {
			return err
		}
	}
	return nil
}
