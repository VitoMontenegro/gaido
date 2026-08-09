package seed

import "context"

// extraCities — популярні туристичні міста (доповнення до столиць).
var extraCities = []struct {
	countrySlug, regionSlug, slug, name string
	lat, lng                             float64
}{
	// Чорногорія
	{"me", "main", "budva", "Будва", 42.2911, 18.8403},
	{"me", "main", "kotor", "Котор", 42.4247, 18.7712},
	{"me", "main", "herceg-novi", "Герцег-Нові", 42.4531, 18.5375},
	{"me", "main", "tivat", "Тіват", 42.4348, 18.6965},
	{"me", "main", "bar", "Бар", 42.0943, 19.1004},
	{"me", "main", "podgorica", "Подгориця", 42.4304, 19.2594},
	{"me", "main", "cetinje", "Цетинье", 42.3906, 18.9142},
	// Хорватія
	{"hr", "main", "dubrovnik", "Дубровник", 42.6507, 18.0944},
	{"hr", "main", "split", "Спліт", 43.5081, 16.4402},
	{"hr", "main", "zadar", "Задар", 44.1194, 15.2314},
	// Греція
	{"gr", "main", "athens", "Афіни", 37.9838, 23.7275},
	{"gr", "main", "thessaloniki", "Салоніки", 40.6401, 22.9444},
	{"gr", "main", "heraklion", "Іракліон", 35.3387, 25.1442},
	// Франція
	{"fr", "main", "paris", "Париж", 48.8566, 2.3522},
	{"fr", "main", "nice", "Ніцца", 43.7102, 7.2620},
	{"fr", "main", "lyon", "Ліон", 45.7640, 4.8357},
	// ОАЕ
	{"ae", "main", "dubai", "Дубай", 25.2048, 55.2708},
	{"ae", "main", "abu-dhabi", "Абу-Дабі", 24.4539, 54.3773},
	// Таїланд
	{"th", "main", "bangkok", "Бангкок", 13.7563, 100.5018},
	{"th", "main", "phuket", "Пхукет", 7.8804, 98.3923},
	// Вʼєтнам
	{"vn", "main", "hanoi", "Ханой", 21.0278, 105.8342},
	{"vn", "main", "ho-chi-minh", "Хошимін", 10.8231, 106.6297},
	// Єгипет
	{"eg", "main", "cairo", "Каїр", 30.0444, 31.2357},
	{"eg", "main", "hurghada", "Хургада", 27.2579, 33.8116},
	// Вірменія
	{"am", "main", "yerevan", "Єреван", 40.1792, 44.4991},
	// Азербайджан
	{"az", "main", "baku", "Баку", 40.4093, 49.8671},
	// Казахстан
	{"kz", "main", "almaty", "Алмати", 43.2220, 76.8512},
	{"kz", "main", "astana", "Астана", 51.1694, 71.4491},
	// Узбекистан
	{"uz", "main", "tashkent", "Ташкент", 41.2995, 69.2401},
	{"uz", "main", "samarkand", "Самарканд", 39.6542, 66.9597},
}

func (s *Seeder) ensureExtraCities(ctx context.Context) error {
	all := append(extraCities, europeExtraCities...)
	for _, c := range all {
		country, err := s.Geo.GetCountryBySlug(ctx, c.countrySlug)
		if err != nil || country == nil {
			continue
		}
		regionID, err := s.Geo.EnsureRegion(ctx, country.ID, c.regionSlug, country.Name)
		if err != nil {
			return err
		}
		if _, err := s.Geo.EnsureCity(ctx, country.ID, regionID, c.slug, c.name, c.lat, c.lng); err != nil {
			return err
		}
	}
	return nil
}
