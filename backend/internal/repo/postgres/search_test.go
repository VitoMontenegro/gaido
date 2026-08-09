package postgres

import "testing"

func TestExpandSearchTerms(t *testing.T) {
	terms := expandSearchTerms("тиват")
	if len(terms) < 2 {
		t.Fatalf("expected variants for тиват, got %v", terms)
	}
	found := false
	for _, term := range terms {
		if term == "тіват" || term == "тиват" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected тиват/тіват variant, got %v", terms)
	}
}
