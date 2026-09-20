package domain

import (
	"strings"
	"unicode/utf8"
)

const (
	PlaceTypeCountry = "country"
	PlaceTypeCity    = "city"

	PlaceFAQMaxItems    = 20
	PlaceFAQQuestionMax = 200
	PlaceFAQAnswerMax   = 2000
	PlaceSEOTitleMax    = 120
	PlaceSEODescMax     = 320
	PlaceExcerptMax     = 500
	PlaceIntroHTMLMax   = 100000
	PlaceSEOImageURLMax = 500
)

type PlaceFAQ struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type PlacePage struct {
	PlaceType      string     `json:"place_type"`
	PlaceID        int64      `json:"place_id"`
	Slug           string     `json:"slug"`
	Name           string     `json:"name"`
	CountryName    string     `json:"country_name,omitempty"`
	CountrySlug    string     `json:"country_slug,omitempty"`
	PublicPath     string     `json:"public_path"`
	Excerpt        string     `json:"excerpt"`
	IntroHTML      string     `json:"intro_html"`
	SEOTitle       string     `json:"seo_title"`
	SEODescription string     `json:"seo_description"`
	SEOImageURL    string     `json:"seo_image_url"`
	FAQ            []PlaceFAQ `json:"faq"`
}

type PlacePageListItem struct {
	PlaceType   string `json:"place_type"`
	PlaceID     int64  `json:"place_id"`
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	CountryName string `json:"country_name,omitempty"`
	PublicPath  string `json:"public_path"`
	HasContent  bool   `json:"has_content"`
}

func ParsePlaceType(raw string) (string, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case PlaceTypeCountry:
		return PlaceTypeCountry, true
	case PlaceTypeCity:
		return PlaceTypeCity, true
	default:
		return "", false
	}
}

func PlacePublicPath(placeType, slug string) string {
	switch placeType {
	case PlaceTypeCountry:
		return "/countries/" + slug
	case PlaceTypeCity:
		return "/city/" + slug
	default:
		return ""
	}
}

func ClampRunes(s string, max int) string {
	s = strings.TrimSpace(s)
	if max <= 0 || utf8.RuneCountInString(s) <= max {
		return s
	}
	runes := []rune(s)
	return strings.TrimSpace(string(runes[:max]))
}

func NormalizePlaceFAQ(items []PlaceFAQ) []PlaceFAQ {
	if len(items) == 0 {
		return []PlaceFAQ{}
	}
	out := make([]PlaceFAQ, 0, len(items))
	for _, item := range items {
		q := ClampRunes(item.Question, PlaceFAQQuestionMax)
		a := ClampRunes(item.Answer, PlaceFAQAnswerMax)
		if q == "" || a == "" {
			continue
		}
		out = append(out, PlaceFAQ{Question: q, Answer: a})
		if len(out) >= PlaceFAQMaxItems {
			break
		}
	}
	return out
}

func NormalizePlacePageFields(excerpt, introHTML, seoTitle, seoDesc, seoImage string, faq []PlaceFAQ) (short, intro, title, desc, image string, items []PlaceFAQ) {
	intro = strings.TrimSpace(introHTML)
	if utf8.RuneCountInString(intro) > PlaceIntroHTMLMax {
		intro = string([]rune(intro)[:PlaceIntroHTMLMax])
	}
	return ClampRunes(excerpt, PlaceExcerptMax),
		intro,
		ClampRunes(seoTitle, PlaceSEOTitleMax),
		ClampRunes(seoDesc, PlaceSEODescMax),
		ClampRunes(seoImage, PlaceSEOImageURLMax),
		NormalizePlaceFAQ(faq)
}
