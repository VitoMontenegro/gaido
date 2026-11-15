package postgres

import (
	"strings"
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

func TestManagedEmptyGalleryHasNoLegacyCoverFallback(t *testing.T) {
	cover := "stale-cover.webp"
	applyExcursionCoverFallback(&cover, domain.ExcursionStructuredContent{GalleryManaged: true, GalleryMobileCover: "phone.webp", PhotoLocations: []string{"location.webp"}})
	if cover != "" {
		t.Fatalf("deleted cover reappeared: %q", cover)
	}
}

func TestFavoritePreviewPrefersNewDescriptionAndLimitsPayload(t *testing.T) {
	item := domain.FavoriteEnriched{DescriptionHTML: "<p>Нове &amp; цікаве</p>", BodyHTML: "<p>Старе</p>"}
	if got := favoriteExcursionPreview(item); got != "Нове & цікаве" {
		t.Fatal(got)
	}
	item.DescriptionHTML = strings.Repeat("екскурсія ", 50)
	if got := favoriteExcursionPreview(item); len([]rune(got)) > 160 {
		t.Fatal("preview too long")
	}
}
