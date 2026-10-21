package domain

import (
	"strings"
	"testing"
)

func TestParsePlaceType(t *testing.T) {
	got, ok := ParsePlaceType("Country")
	if !ok || got != PlaceTypeCountry {
		t.Fatalf("country: got %q %v", got, ok)
	}
	got, ok = ParsePlaceType("city")
	if !ok || got != PlaceTypeCity {
		t.Fatalf("city: got %q %v", got, ok)
	}
	if _, ok := ParsePlaceType("region"); ok {
		t.Fatal("region should be invalid")
	}
}

func TestNormalizePlaceFAQ(t *testing.T) {
	items := NormalizePlaceFAQ([]PlaceFAQ{
		{Question: "  Q1  ", Answer: " A1 "},
		{Question: "", Answer: "skip"},
		{Question: "Q2", Answer: ""},
		{Question: "Q3", Answer: "A3"},
	})
	if len(items) != 2 || items[0].Question != "Q1" || items[1].Question != "Q3" {
		t.Fatalf("unexpected %+v", items)
	}
}

func TestNormalizePlacePageFields(t *testing.T) {
	h1, excerpt, intro, title, desc, image, faq := NormalizePlacePageFields(
		" Заголовок ",
		"  короткий  ",
		" <p>стаття</p> ",
		"SEO",
		"desc",
		"/img.jpg",
		[]PlaceFAQ{{Question: "Q", Answer: "A"}},
	)
	if h1 != "Заголовок" || excerpt != "короткий" || intro != "<p>стаття</p>" || title != "SEO" || desc != "desc" || image != "/img.jpg" || len(faq) != 1 {
		t.Fatalf("got h1=%q excerpt=%q intro=%q title=%q desc=%q image=%q faq=%+v", h1, excerpt, intro, title, desc, image, faq)
	}
	long := strings.Repeat("я", PlaceExcerptMax+10)
	_, short, _, _, _, _, _ := NormalizePlacePageFields("", long, "", "", "", "", nil)
	if len([]rune(short)) != PlaceExcerptMax {
		t.Fatalf("excerpt clamp: %d", len([]rune(short)))
	}
}

func TestPlacePublicPath(t *testing.T) {
	if got := PlacePublicPath(PlaceTypeCountry, "georgia"); got != "/countries/georgia" {
		t.Fatalf("country path: %s", got)
	}
	if got := PlacePublicPath(PlaceTypeCity, "tbilisi"); got != "/city/tbilisi" {
		t.Fatalf("city path: %s", got)
	}
	if got := PlacePublicPath(PlaceTypeCountriesIndex, "index"); got != "/countries" {
		t.Fatalf("countries index path: %s", got)
	}
}
