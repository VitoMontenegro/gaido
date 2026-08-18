package seed

import "testing"

func TestCountryNameUK_usesISOThenOverride(t *testing.T) {
	if got := countryNameUK("united-states", "US", ""); got != "Сполучені Штати Америки" {
		t.Fatalf("US = %q", got)
	}
	if got := countryNameUK("united-states", "US", "ignored"); got != "Сполучені Штати Америки" {
		t.Fatalf("override must win, got %q", got)
	}
	if got := countryNameUK("jp", "JP", ""); got != "Японія" {
		t.Fatalf("JP = %q", got)
	}
	if got := countryNameUK("uae", "AE", ""); got != "ОАЕ" {
		t.Fatalf("AE = %q", got)
	}
	if got := countryNameUK("de", "DE", ""); got != "Німеччина" {
		t.Fatalf("DE = %q", got)
	}
	if got := countryNameUK("do", "DO", ""); got != "Домініканська Республіка" {
		t.Fatalf("DO = %q", got)
	}
	if got := countryNameUK("ax", "AX", ""); got != "Аландські Острови" {
		t.Fatalf("AX = %q", got)
	}
}
