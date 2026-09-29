package handlers

import (
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestMergeHomeContent_fillsSEOFromCurrentHome(t *testing.T) {
	got := mergeHomeContent(domain.HomeContent{HeroSubtitle: "Hero text"})
	if got.SEOTitle != seoHomeTitle {
		t.Fatalf("seo title: %q", got.SEOTitle)
	}
	if got.SEODescription != "Hero text" {
		t.Fatalf("seo description: %q", got.SEODescription)
	}
	if got.SEOImageURL == "" {
		t.Fatal("expected default og image")
	}
}

func TestMergePortalHubContent_fillsDefaults(t *testing.T) {
	got := mergePortalHubContent(domain.PortalHubContent{
		Cards: []domain.PortalHubCard{{ID: "guides", Title: "Гіди"}},
	})
	if got.Title != seoPortalHomeTitle {
		t.Fatalf("title = %q", got.Title)
	}
	if len(got.Cards) != 3 {
		t.Fatalf("cards = %d", len(got.Cards))
	}
	if got.Cards[0].Title != "Гіди" {
		t.Fatalf("guides title = %q", got.Cards[0].Title)
	}
	if got.Cards[1].ImageURL != "/images/home/transport.jpg" {
		t.Fatalf("transport image = %q", got.Cards[1].ImageURL)
	}
	if got.Cards[2].Text == "" {
		t.Fatal("expected services text")
	}
}
