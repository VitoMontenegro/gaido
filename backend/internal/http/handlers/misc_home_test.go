package handlers

import (
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestMergeHomeContent_fillsSEOFromCurrentHome(t *testing.T) {
	got := mergeHomeContent(domain.HomeContent{HeroSubtitle: "Hero text"})
	if got.SEOTitle != "Гіди та екскурсії" {
		t.Fatalf("seo title: %q", got.SEOTitle)
	}
	if got.SEODescription != "Hero text" {
		t.Fatalf("seo description: %q", got.SEODescription)
	}
	if got.SEOImageURL == "" {
		t.Fatal("expected default og image")
	}
}
