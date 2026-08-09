package review

import (
	"context"
	"testing"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestCreate_validation(t *testing.T) {
	s := &Service{Exc: excStub{published: true}}
	_, err := s.Create(context.Background(), 0, 1, 5, "ok")
	if err != apperrors.ErrValidation {
		t.Fatalf("got %v", err)
	}
	_, err = s.Create(context.Background(), 1, 1, 0, "ok")
	if err != apperrors.ErrValidation {
		t.Fatalf("got %v", err)
	}
}

func TestCreate_unpublishedExcursion(t *testing.T) {
	s := &Service{Exc: excStub{status: domain.ExcursionDraft}}
	_, err := s.Create(context.Background(), 1, 1, 5, "text")
	if err != apperrors.ErrValidation {
		t.Fatalf("got %v", err)
	}
}

type excStub struct {
	published bool
	status    string
}

func (e excStub) GetByID(_ context.Context, _ int64) (*domain.Excursion, error) {
	status := e.status
	if status == "" {
		if e.published {
			status = domain.ExcursionPublished
		} else {
			status = domain.ExcursionDraft
		}
	}
	return &domain.Excursion{ID: 1, GuideID: 10, Status: status}, nil
}
