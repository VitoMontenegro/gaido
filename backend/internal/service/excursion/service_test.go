package excursion

import (
	"context"
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestCanTransition(t *testing.T) {
	cases := []struct {
		from, to string
		ok       bool
	}{
		{domain.ExcursionDraft, domain.ExcursionPendingModeration, true},
		{domain.ExcursionDraft, domain.ExcursionPublished, true},
		{domain.ExcursionPendingModeration, domain.ExcursionPublished, true},
		{domain.ExcursionPendingModeration, domain.ExcursionRejected, true},
		{domain.ExcursionRejected, domain.ExcursionDraft, true},
		{domain.ExcursionRejected, domain.ExcursionPublished, false},
	}
	for _, c := range cases {
		got := CanTransition(c.from, c.to)
		if got != c.ok {
			t.Errorf("CanTransition(%q, %q) = %v, want %v", c.from, c.to, got, c.ok)
		}
	}
}

func TestStatusAfterUpdate_moderationOn(t *testing.T) {
	s := &Service{Settings: settingsStub{moderation: true}}
	existing := &domain.Excursion{Status: domain.ExcursionPublished}
	got := s.StatusAfterUpdate(context.Background(), existing)
	if got != domain.ExcursionPendingModeration {
		t.Fatalf("got %q", got)
	}
}

func TestStatusAfterUpdate_moderationOff(t *testing.T) {
	s := &Service{Settings: settingsStub{moderation: false}}
	existing := &domain.Excursion{Status: domain.ExcursionPublished}
	got := s.StatusAfterUpdate(context.Background(), existing)
	if got != domain.ExcursionPublished {
		t.Fatalf("got %q", got)
	}
}

type settingsStub struct{ moderation bool }

func (s settingsStub) GetBool(_ context.Context, key string, fallback bool) (bool, error) {
	if key == "moderation_enabled" {
		return s.moderation, nil
	}
	return fallback, nil
}
