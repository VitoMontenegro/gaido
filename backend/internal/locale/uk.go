package locale

import (
	"sort"

	"golang.org/x/text/collate"
	"golang.org/x/text/language"
)

// SortByName orders items by Ukrainian alphabet, case-insensitive.
// Equal names keep their previous order.
func SortByName[T any](items []T, name func(T) string) {
	c := collate.New(language.Ukrainian, collate.IgnoreCase)
	sort.SliceStable(items, func(i, j int) bool {
		return c.CompareString(name(items[i]), name(items[j])) < 0
	})
}
