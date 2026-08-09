package guide_test

import (
	"testing"
	"time"

	"github.com/vitomonte/experts-tourister/internal/domain"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

func TestContactsVisible(t *testing.T) {
	exp := time.Now().Add(24 * time.Hour)
	g := &domain.GuideProfile{Status: domain.GuideStatusActive}
	sub := &domain.GuideSubscription{Status: domain.SubscriptionActive, ExpiresAt: &exp}
	dto := guidesvc.BuildPublicGuideDTO(g, sub, true)
	if !dto.Contacts.Visible {
		t.Fatal("expected contacts visible")
	}
}

func TestContactsHiddenInactive(t *testing.T) {
	g := &domain.GuideProfile{Status: domain.GuideStatusDraft}
	dto := guidesvc.BuildPublicGuideDTO(g, nil, false)
	if dto.Contacts.Visible {
		t.Fatal("expected contacts hidden")
	}
	if dto.Contacts.Phone != "" {
		t.Fatal("must not leak phone")
	}
}

func TestTypeBadgeRequiresLicense(t *testing.T) {
	g := &domain.GuideProfile{Status: domain.GuideStatusActive, GuideType: domain.GuideTypeGuide}
	dto := guidesvc.BuildPublicGuideDTO(g, nil, false)
	if dto.TypeBadge != nil {
		t.Fatal("badge should be nil without license")
	}
	dto2 := guidesvc.BuildPublicGuideDTO(g, nil, true)
	if dto2.TypeBadge == nil || *dto2.TypeBadge != "Гід" {
		t.Fatal("expected guide badge")
	}
}

func TestCatalogStatus(t *testing.T) {
	if guidesvc.CatalogStatus(domain.GuideTypeCompanion, false) != "companion" {
		t.Fatal("companion status")
	}
	if guidesvc.CatalogStatus(domain.GuideTypeGuide, true) != "confirmed" {
		t.Fatal("confirmed")
	}
	if guidesvc.CatalogStatus(domain.GuideTypeGuide, false) != "pending" {
		t.Fatal("pending")
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
