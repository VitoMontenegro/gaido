package review

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type ReviewRepository interface {
	Create(ctx context.Context, guideID, authorID, excursionID int64, rating int, text string) (int64, error)
	SetStatus(ctx context.Context, id int64, status string) error
	GetGuideID(ctx context.Context, reviewID int64) (int64, error)
	RecalcRating(ctx context.Context, guideID int64) error
	ListByStatus(ctx context.Context, status string) ([]domain.Review, error)
}

type ExcursionReader interface {
	GetByID(ctx context.Context, id int64) (*domain.Excursion, error)
}

type SettingsReader interface {
	GetBool(ctx context.Context, key string, fallback bool) (bool, error)
}

type Service struct {
	Reviews  ReviewRepository
	Exc      ExcursionReader
	Settings SettingsReader
}

func (s *Service) ModerationEnabled(ctx context.Context) bool {
	if s.Settings == nil {
		return true
	}
	enabled, _ := s.Settings.GetBool(ctx, "moderation_enabled", true)
	return enabled
}

func (s *Service) Create(ctx context.Context, excursionID, authorID int64, rating int, text string) (int64, error) {
	if excursionID <= 0 || rating < 1 || rating > 5 || strings.TrimSpace(text) == "" {
		return 0, apperrors.ErrValidation
	}
	ex, err := s.Exc.GetByID(ctx, excursionID)
	if err != nil || ex == nil || ex.Status != domain.ExcursionPublished {
		return 0, apperrors.ErrValidation
	}
	id, err := s.Reviews.Create(ctx, ex.GuideID, authorID, excursionID, rating, text)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return 0, apperrors.ErrReviewExists
		}
		return 0, apperrors.ErrInternal
	}
	if !s.ModerationEnabled(ctx) {
		_ = s.Reviews.SetStatus(ctx, id, domain.ReviewPublished)
		_ = s.Reviews.RecalcRating(ctx, ex.GuideID)
	}
	return id, nil
}

func (s *Service) Approve(ctx context.Context, reviewID int64) error {
	gid, err := s.Reviews.GetGuideID(ctx, reviewID)
	if err != nil {
		return apperrors.ErrNotFound
	}
	if err := s.Reviews.SetStatus(ctx, reviewID, domain.ReviewPublished); err != nil {
		return apperrors.ErrInternal
	}
	_ = s.Reviews.RecalcRating(ctx, gid)
	return nil
}

func (s *Service) ListPending(ctx context.Context) ([]domain.Review, error) {
	items, err := s.Reviews.ListByStatus(ctx, domain.ReviewPending)
	if err != nil {
		return nil, apperrors.ErrInternal
	}
	if items == nil {
		items = []domain.Review{}
	}
	return items, nil
}
