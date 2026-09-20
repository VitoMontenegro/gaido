package postgres

import (
	"fmt"
	"strings"
)

const adminPageSize = 50

type AdminListQuery struct {
	Status      string
	Q           string
	CountrySlug string
	OrderAsc    bool
	Limit       int
	Offset      int
}

type AdminCountry struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}

func ClampAdminPage(limit, offset int) (int, int) {
	if limit <= 0 || limit > adminPageSize {
		limit = adminPageSize
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

func adminOrderSQL(asc bool) string {
	if asc {
		return "ASC"
	}
	return "DESC"
}

func joinConds(conds []string) string {
	if len(conds) == 0 {
		return ""
	}
	return " WHERE " + strings.Join(conds, " AND ")
}

func adminNameSearch(col string, q string, n int) (cond string, arg any, next int, ok bool) {
	terms := expandSearchTerms(q)
	if len(terms) == 0 {
		return "", nil, n, false
	}
	return fmt.Sprintf(`%s ILIKE ANY($%d)`, col, n), searchPatterns(terms), n + 1, true
}

func adminExcursionWhere(q AdminListQuery) (where string, args []any) {
	var conds []string
	n := 1
	if q.Status != "" {
		conds = append(conds, fmt.Sprintf("e.status=$%d", n))
		args = append(args, q.Status)
		n++
	}
	if slug := strings.TrimSpace(q.CountrySlug); slug != "" {
		conds = append(conds, fmt.Sprintf("co.slug=$%d", n))
		args = append(args, slug)
		n++
	}
	if cond, arg, _, ok := adminNameSearch("e.title", q.Q, n); ok {
		conds = append(conds, cond)
		args = append(args, arg)
	}
	return joinConds(conds), args
}

func adminGuideWhere(q AdminListQuery) (where string, args []any) {
	var conds []string
	n := 1
	if q.Status != "" {
		conds = append(conds, fmt.Sprintf("status=$%d", n))
		args = append(args, q.Status)
		n++
	}
	if slug := strings.TrimSpace(q.CountrySlug); slug != "" {
		conds = append(conds, fmt.Sprintf(`id IN (
			SELECT ccg.guide_id FROM (`+catalogCountryGuidesUnion+`) ccg
			JOIN countries co ON co.id = ccg.country_id
			WHERE co.slug=$%d
		)`, n))
		args = append(args, slug)
		n++
	}
	terms := expandSearchTerms(q.Q)
	if len(terms) > 0 {
		conds = append(conds, fmt.Sprintf(`(display_name ILIKE ANY($%d) OR first_name ILIKE ANY($%d) OR last_name ILIKE ANY($%d))`, n, n, n))
		args = append(args, searchPatterns(terms))
	}
	return joinConds(conds), args
}
