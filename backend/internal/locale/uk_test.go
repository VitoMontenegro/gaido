package locale

import (
	"slices"
	"testing"
)

func TestSortByNameUkrainian(t *testing.T) {
	names := []string{"Італія", "єгипет", "Австрія", "Україна", "Японія", "Ґана", "Греція", "Естонія"}
	SortByName(names, func(s string) string { return s })
	want := []string{"Австрія", "Греція", "Ґана", "Естонія", "єгипет", "Італія", "Україна", "Японія"}
	if !slices.Equal(names, want) {
		t.Fatalf("got %v, want %v", names, want)
	}
}
