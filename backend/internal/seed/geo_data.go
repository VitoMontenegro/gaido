package seed

type geoCity struct {
	slug, name   string
	lat, lng     float64
}

type geoRegion struct {
	slug, name string
	cities     []geoCity
}

type geoCountry struct {
	slug, name string
	regions    []geoRegion
}

// geoCatalog — набір країн і міст як у tourister-go.
var geoCatalog = []geoCountry{
	{
		slug: "russia", name: "Росія",
		regions: []geoRegion{
			{
				slug: "moscow-region", name: "Московська область",
				cities: []geoCity{
					{"moscow", "Москва", 55.7558, 37.6173},
					{"spb", "Санкт-Петербург", 59.9343, 30.3351},
				},
			},
			{
				slug: "south", name: "Південь Росії",
				cities: []geoCity{
					{"sochi", "Сочі", 43.6028, 39.7342},
				},
			},
			{
				slug: "volga", name: "Поволжжя",
				cities: []geoCity{
					{"kazan", "Казань", 55.7887, 49.1221},
				},
			},
			{
				slug: "karelia", name: "Карелія",
				cities: []geoCity{
					{"petrozavodsk", "Петрозаводськ", 61.7850, 34.3469},
				},
			},
		},
	},
	{
		slug: "turkey", name: "Туреччина",
		regions: []geoRegion{
			{
				slug: "main", name: "Туреччина",
				cities: []geoCity{
					{"istanbul", "Стамбул", 41.0082, 28.9784},
				},
			},
		},
	},
	{
		slug: "italy", name: "Італія",
		regions: []geoRegion{
			{
				slug: "main", name: "Італія",
				cities: []geoCity{
					{"rome", "Рим", 41.9028, 12.4964},
				},
			},
		},
	},
	{
		slug: "georgia", name: "Грузія",
		regions: []geoRegion{
			{
				slug: "main", name: "Грузія",
				cities: []geoCity{
					{"tbilisi", "Тбілісі", 41.7151, 44.8271},
				},
			},
		},
	},
	{
		slug: "spain", name: "Іспанія",
		regions: []geoRegion{
			{
				slug: "main", name: "Іспанія",
				cities: []geoCity{
					{"barcelona", "Барселона", 41.3874, 2.1686},
				},
			},
		},
	},
}
