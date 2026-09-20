package guide_test

import (
	"strings"
	"testing"
	"time"

	"github.com/vitomonte/experts-tourister/internal/domain"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

func TestContactsVisible(t *testing.T) {
	exp := time.Now().Add(24 * time.Hour)
	g := &domain.GuideProfile{Status: domain.GuideStatusActive}
	sub := &domain.GuideSubscription{Status: domain.SubscriptionActive, ExpiresAt: &exp}
	dto := guidesvc.BuildPublicGuideDTO(g, sub, true, true)
	if !dto.Contacts.Visible {
		t.Fatal("expected contacts visible")
	}
}

func TestContactsHiddenInactive(t *testing.T) {
	g := &domain.GuideProfile{Status: domain.GuideStatusDraft}
	dto := guidesvc.BuildPublicGuideDTO(g, nil, false, true)
	if dto.Contacts.Visible {
		t.Fatal("expected contacts hidden")
	}
	if dto.Contacts.Phone != "" {
		t.Fatal("must not leak phone")
	}
}

func TestTypeBadgeRequiresLicense(t *testing.T) {
	g := &domain.GuideProfile{Status: domain.GuideStatusActive, GuideType: domain.GuideTypeGuide}
	dto := guidesvc.BuildPublicGuideDTO(g, nil, false, true)
	if dto.TypeBadge != nil {
		t.Fatal("badge should be nil without license")
	}
	dto2 := guidesvc.BuildPublicGuideDTO(g, nil, true, true)
	if dto2.TypeBadge == nil || *dto2.TypeBadge != "Гід" {
		t.Fatal("expected guide badge")
	}
}

func TestCatalogStatus(t *testing.T) {
	if guidesvc.CatalogStatus(domain.GuideTypeCompanion, false) != "companion" {
		t.Fatal("companion status")
	}
	if guidesvc.CatalogStatus(domain.GuideTypeCompanion, true) != "confirmed" {
		t.Fatal("license overrides companion")
	}
	if guidesvc.CatalogStatus(domain.GuideTypeGuide, true) != "confirmed" {
		t.Fatal("confirmed")
	}
	if guidesvc.CatalogStatus(domain.GuideTypeGuide, false) != "pending" {
		t.Fatal("pending")
	}
}

func TestTypeBadgeLicenseOverridesCompanion(t *testing.T) {
	g := &domain.GuideProfile{GuideType: domain.GuideTypeCompanion}
	dto := guidesvc.BuildPublicGuideDTO(g, nil, true, true)
	if dto.TypeBadge == nil || *dto.TypeBadge != "Гід" {
		t.Fatal("license should override companion badge")
	}
}

func TestPublicGuideDTOHidesAboutLinks(t *testing.T) {
	g := &domain.GuideProfile{
		Status: domain.GuideStatusDraft,
		About:  "Гід по Празі. Telegram https://t.me/ivan_guide",
	}
	dto := guidesvc.BuildPublicGuideDTO(g, nil, false, true)
	if strings.Contains(dto.About, "t.me") || strings.Contains(dto.About, "http") {
		t.Fatalf("public about still has a link: %q", dto.About)
	}
	if !strings.Contains(dto.About, "Гід по Празі") {
		t.Fatalf("public about lost the text: %q", dto.About)
	}
}

func TestValidateMaxGuests(t *testing.T) {
	if err := guidesvc.ValidateMaxGuests(0); err == nil {
		t.Fatal("expected error for 0")
	}
	if err := guidesvc.ValidateMaxGuests(15); err != nil {
		t.Fatal("15 should be valid")
	}
}
