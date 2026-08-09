package billing_test

import (
	"context"
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
	dto := guidesvc.BuildPublicGuideDTO(g, sub, true)
	if !dto.Contacts.Visible || dto.Contacts.Phone == "" {
		t.Fatal("expected visible contacts after activation")
	}
}

func TestContactsHiddenWithoutSubscription(t *testing.T) {
	g := &domain.GuideProfile{Status: domain.GuideStatusActive, Phone: "+79001111111"}
	dto := guidesvc.BuildPublicGuideDTO(g, nil, true)
	if dto.Contacts.Visible {
		t.Fatal("expected hidden contacts without subscription")
	}
}

var _ = context.Background
