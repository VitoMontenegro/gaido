package billing_test

import (
	"testing"
	"time"

	"github.com/vitomonte/experts-tourister/internal/domain"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

func TestContactsAfterActivation(t *testing.T) {
	exp := time.Now().Add(24 * time.Hour)
	g := &domain.GuideProfile{
		Status:                 domain.GuideStatusActive,
		Phone:                  "+79001111111",
		PreferredContactMethod: "phone",
	}
	sub := &domain.GuideSubscription{Status: domain.SubscriptionActive, ExpiresAt: &exp}
	dto := guidesvc.BuildPublicGuideDTO(g, sub, true, true)
	if !dto.Contacts.Visible || dto.Contacts.Phone == "" {
		t.Fatal("expected visible contacts after activation")
	}
}

func TestContactsHiddenWithoutSubscription(t *testing.T) {
	g := &domain.GuideProfile{Status: domain.GuideStatusActive, Phone: "+79001111111"}
	dto := guidesvc.BuildPublicGuideDTO(g, nil, true, true)
	if dto.Contacts.Visible {
		t.Fatal("expected hidden contacts without subscription")
	}
}

func TestContactsVisibleGrowthMode(t *testing.T) {
	g := &domain.GuideProfile{Status: domain.GuideStatusActive, Phone: "+79001111111"}
	dto := guidesvc.BuildPublicGuideDTO(g, nil, true, false)
	if !dto.Contacts.Visible || dto.Contacts.Phone == "" {
		t.Fatal("expected visible contacts in growth mode")
	}
}
