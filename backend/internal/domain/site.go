package domain

type HomeStat struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type HomeBenefit struct {
	Title string `json:"title"`
	Text  string `json:"text"`
}

type HomeFAQ struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type HomeCategoryTile struct {
	Label    string `json:"label"`
	URL      string `json:"url"`
	ImageURL string `json:"image_url"`
}

type HomeCta struct {
	Title          string `json:"title"`
	Text           string `json:"text"`
	Schedule       string `json:"schedule"`
	PrimaryLabel   string `json:"primary_label"`
	PrimaryURL     string `json:"primary_url"`
	SecondaryLabel string `json:"secondary_label"`
	SecondaryURL   string `json:"secondary_url"`
}

type HomeContent struct {
	HeroTitle              string             `json:"hero_title"`
	HeroSubtitle           string             `json:"hero_subtitle"`
	CategoryTiles          []HomeCategoryTile `json:"category_tiles"`
	AboutImageURL          string             `json:"about_image_url"`
	Cta                    HomeCta            `json:"cta"`
	StatsTitle             string             `json:"stats_title"`
	Stats                  []HomeStat         `json:"stats"`
	Benefits               []HomeBenefit      `json:"benefits"`
	FAQ                    []HomeFAQ          `json:"faq"`
	FeaturedGuideSlugs     []string           `json:"featured_guide_slugs"`
	FeaturedExcursionSlugs []string           `json:"featured_excursion_slugs"`
	PopularCitySlugs       []string           `json:"popular_city_slugs"`
}

type FooterLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type FooterColumn struct {
	Title string       `json:"title"`
	Links []FooterLink `json:"links"`
}

type FooterContent struct {
	Phone       string         `json:"phone"`
	Email       string         `json:"email"`
	Telegram    string         `json:"telegram"`
	Description string         `json:"description"`
	Columns     []FooterColumn `json:"columns"`
	Copyright   string         `json:"copyright"`
}

type LegalPage struct {
	Title    string `json:"title"`
	BodyHTML string `json:"body_html"`
}

type LegalContent struct {
	PrivacyPolicy  LegalPage `json:"privacy_policy"`
	SiteRules      LegalPage `json:"site_rules"`
	PlacementRules LegalPage `json:"placement_rules"`
}

type DestinationCity struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type DestinationGroup struct {
	CountrySlug string            `json:"country_slug"`
	CountryName string            `json:"country_name"`
	Cities      []DestinationCity `json:"cities"`
}

type SiteHomePayload struct {
	Content              HomeContent        `json:"content"`
	FeaturedGuides       []PublicGuideDTO   `json:"featured_guides"`
	FeaturedExcursions   []ExcursionView    `json:"featured_excursions"`
	PopularDestinations  []DestinationGroup `json:"popular_destinations"`
}

type SitePayload struct {
	Home   SiteHomePayload `json:"home"`
	Footer FooterContent   `json:"footer"`
	Legal  LegalContent    `json:"legal"`
}
