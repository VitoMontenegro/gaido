package postgres

import (
	"strings"
	"testing"
)

func TestClampAdminPage(t *testing.T) {
	limit, offset := ClampAdminPage(0, -3)
	if limit != 50 || offset != 0 {
		t.Fatalf("clamp empty: got %d %d", limit, offset)
	}
	limit, offset = ClampAdminPage(100, 10)
	if limit != 50 || offset != 10 {
		t.Fatalf("clamp oversize: got %d %d", limit, offset)
	}
	limit, offset = ClampAdminPage(20, 40)
	if limit != 20 || offset != 40 {
		t.Fatalf("clamp valid: got %d %d", limit, offset)
	}
}

func TestAdminExcursionWhere(t *testing.T) {
	where, args := adminExcursionWhere(AdminListQuery{Status: "PUBLISHED", Q: "Карпати", CountrySlug: "ua"})
	if !strings.Contains(where, "e.status=$1") || !strings.Contains(where, "co.slug=$2") || !strings.Contains(where, "e.title ILIKE ANY($3)") {
		t.Fatalf("unexpected where: %s", where)
	}
	if len(args) != 3 {
		t.Fatalf("args=%d", len(args))
	}
}

func TestAdminGuideWhere(t *testing.T) {
	where, args := adminGuideWhere(AdminListQuery{Status: "ACTIVE", Q: "Іван", CountrySlug: "pl"})
	if !strings.Contains(where, "status=$1") || !strings.Contains(where, "co.slug=$2") || !strings.Contains(where, "display_name ILIKE ANY($3)") {
		t.Fatalf("unexpected where: %s", where)
	}
	if len(args) != 3 {
		t.Fatalf("args=%d", len(args))
	}
}
