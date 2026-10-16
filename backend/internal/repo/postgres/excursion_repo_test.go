package postgres

import (
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestExcursionPendingStatusConstant(t *testing.T) {
	if domain.ExcursionPendingModeration == "" {
		t.Fatal("pending status must be set")
	}
}

func TestApplyExcursionCoverFallback(t *testing.T) {
	cover := ""
	applyExcursionCoverFallback(&cover, domain.ExcursionStructuredContent{
		PhotoLocations: []string{"  ", "photos/tour.webp"},
	})
	if cover != "photos/tour.webp" {
		t.Fatalf("cover = %q", cover)
	}

	cover = "cover.webp"
	applyExcursionCoverFallback(&cover, domain.ExcursionStructuredContent{
		PhotoLocations: []string{"photos/tour.webp"},
	})
	if cover != "cover.webp" {
		t.Fatalf("existing cover changed to %q", cover)
	}
}
