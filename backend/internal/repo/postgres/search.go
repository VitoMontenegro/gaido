package postgres

import (
	"fmt"
	"strings"
)

// expandSearchTerms повертає варіанти запиту з урахуванням и/і, e/е тощо.
func expandSearchTerms(q string) []string {
	q = strings.TrimSpace(q)
	if q == "" {
		return nil
	}
	seen := map[string]struct{}{strings.ToLower(q): {}}
	out := []string{q}
	lower := strings.ToLower(q)
	for _, pair := range [][2]string{{"и", "і"}, {"і", "и"}, {"e", "е"}, {"е", "e"}, {"и", "i"}, {"і", "i"}} {
		if !strings.Contains(lower, pair[0]) {
			continue
		}
		alt := strings.ReplaceAll(lower, pair[0], pair[1])
		if _, ok := seen[alt]; ok {
			continue
		}
		seen[alt] = struct{}{}
		out = append(out, alt)
	}
	return out
}

func searchPatterns(terms []string) []string {
	patterns := make([]string, len(terms))
	for i, t := range terms {
		patterns[i] = "%" + t + "%"
	}
	return patterns
}

// appendExcursionTextSearch додає умову пошуку по назві, опису, місту та імені гіда.
func appendExcursionTextSearch(sql string, args []any, n int, q string, withCityJoin bool) (string, []any, int) {
	terms := expandSearchTerms(q)
	if len(terms) == 0 {
		return sql, args, n
	}
	cols := []string{"e.title", "e.description", "g.display_name"}
	if withCityJoin {
		cols = append(cols, "c.name")
	}
	var parts []string
	for _, col := range cols {
		parts = append(parts, fmt.Sprintf(`%s ILIKE ANY($%d)`, col, n))
	}
	args = append(args, searchPatterns(terms))
	n++
	return sql + ` AND (` + strings.Join(parts, " OR ") + `)`, args, n
}
