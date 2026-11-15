package excursion

import (
	"context"
	"math"
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

type descriptionRepo struct {
	existing *domain.Excursion
	saved    *domain.Excursion
}

func (r *descriptionRepo) Create(context.Context, *domain.Excursion) (int64, error) { return 1, nil }
func (r *descriptionRepo) GetByID(context.Context, int64) (*domain.Excursion, error) {
	return r.existing, nil
}
func (r *descriptionRepo) Update(_ context.Context, e *domain.Excursion) error {
	r.saved = e
	return nil
}
func (r *descriptionRepo) SetStatus(context.Context, int64, string) error { return nil }
func (r *descriptionRepo) Delete(context.Context, int64, int64) error     { return nil }
func (r *descriptionRepo) ListByStatus(context.Context, string, int) ([]domain.Excursion, error) {
	return nil, nil
}

func TestUpdatePreservesLegacyDescriptions(t *testing.T) {
	original := &domain.Excursion{GuideID: 3, Description: "Старе коротке", BodyHTML: "<p>Старе повне</p>", Status: domain.ExcursionDraft}
	repo := &descriptionRepo{existing: original}
	s := &Service{Exc: repo}
	text := "<p>Нове</p>"
	_, err := s.Update(context.Background(), 3, 1, &domain.Excursion{MaxGuests: 2, DescriptionHTML: &text})
	if err != nil {
		t.Fatal(err)
	}
	if repo.saved.Description != original.Description || repo.saved.BodyHTML != original.BodyHTML || *repo.saved.DescriptionHTML != text {
		t.Fatalf("descriptions not preserved: %+v", repo.saved)
	}
	original.DescriptionHTML = &text
	_, err = s.Update(context.Background(), 3, 1, &domain.Excursion{MaxGuests: 2})
	if err != nil {
		t.Fatal(err)
	}
	if repo.saved.DescriptionHTML == nil || *repo.saved.DescriptionHTML != text {
		t.Fatal("old client erased new description")
	}
}

func TestUpdateRejectsEmptyDescriptionWithoutChangingLegacy(t *testing.T) {
	for _, value := range []string{"", "<p><br></p>", "<p>&nbsp;</p>", "<script>alert(1)</script>"} {
		repo := &descriptionRepo{existing: &domain.Excursion{GuideID: 3, BodyHTML: "<p>Старе повне</p>"}}
		_, err := (&Service{Exc: repo}).Update(context.Background(), 3, 1, &domain.Excursion{MaxGuests: 2, DescriptionHTML: &value})
		if err == nil || repo.saved != nil {
			t.Fatalf("empty description %q was saved", value)
		}
	}
}

func TestRejectInvalidPrice(t *testing.T) {
	for _, price := range []float64{-1, math.NaN(), math.Inf(1), math.Inf(-1)} {
		s := &Service{Exc: &descriptionRepo{existing: &domain.Excursion{GuideID: 3}}}
		if err := s.PrepareNew(3, &domain.Excursion{MaxGuests: 2, PriceFrom: price}); err == nil {
			t.Fatalf("create accepted %v", price)
		}
		if _, err := s.Update(context.Background(), 3, 1, &domain.Excursion{MaxGuests: 2, PriceFrom: price}); err == nil {
			t.Fatalf("update accepted %v", price)
		}
	}
}
