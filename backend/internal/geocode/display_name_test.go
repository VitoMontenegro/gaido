package geocode

import "testing"

func TestNormalizeDisplayName(t *testing.T) {
	tests := map[string]string{
		"жабляк":             "Жабляк",
		"Жябляк":             "Жябляк",
		"плужине":            "Плужине",
		"  івано-франківськ": "Івано-Франківськ",
		"NEW YORK":           "New York",
	}
	for in, want := range tests {
		if got := NormalizeDisplayName(in); got != want {
			t.Fatalf("NormalizeDisplayName(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestLooksRussian(t *testing.T) {
	if !LooksRussian("Голуэй") {
		t.Fatal("expected Russian spelling")
	}
	if LooksRussian("Болгарія") {
		t.Fatal("Ukrainian name must not look Russian")
	}
}
