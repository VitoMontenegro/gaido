package guide

import "testing"

func TestCitySlug(t *testing.T) {
	tests := map[string]string{
		"Краків":   "krakiv",
		"Kraków":   "krakow",
		"Warszawa": "warszawa",
		"Щецин":    "shchetsyn",
		"":         "",
	}
	for in, want := range tests {
		got := CitySlug(in)
		if want == "" {
			if got == "" || got == "guide" {
				t.Fatalf("CitySlug(%q) = %q, want non-empty slug", in, got)
			}
			continue
		}
		if got != want {
			t.Fatalf("CitySlug(%q) = %q, want %q", in, got, want)
		}
	}
}
