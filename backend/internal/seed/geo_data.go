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
