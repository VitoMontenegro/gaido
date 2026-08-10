package excursion

import (
	"context"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/sanitize"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

type ExcursionRepository interface {
	Create(ctx context.Context, e *domain.Excursion) (int64, error)
	GetByID(ctx context.Context, id int64) (*domain.Excursion, error)
	Update(ctx context.Context, e *domain.Excursion) error
	SetStatus(ctx context.Context, id int64, status string) error
	Delete(ctx context.Context, guideID, id int64) error
	ListByStatus(ctx context.Context, status string, limit int) ([]domain.Excursion, error)
}

type SettingsReader interface {
	GetBool(ctx context.Context, key string, fallback bool) (bool, error)
}

type Service struct {
	Exc      ExcursionRepository
	Settings SettingsReader
}

func (s *Service) ModerationEnabled(ctx context.Context) bool {
	if s.Settings == nil {
		return true
	}
	enabled, _ := s.Settings.GetBool(ctx, "moderation_enabled", true)
	return enabled
}

func (s *Service) PrepareNew(guideID int64, e *domain.Excursion) error {
	if err := guidesvc.ValidateMaxGuests(e.MaxGuests); err != nil {
		return apperrors.New("VALIDATION_ERROR", err.Error(), 400)
	}
	if e.DurationMinutes <= 0 {
		e.DurationMinutes = 180
	}
	if e.TransportMode == "" {
		e.TransportMode = "WALKING"
	}
	if e.Language == "" {
		e.Language = "uk"
	}
	e.MapEmbedURL = guidesvc.ResolveMapEmbed(e.MapEmbedURL)
	if e.IncludedItems == nil {
		e.IncludedItems = []string{}
	}
	if e.ExcludedItems == nil {
		e.ExcludedItems = []string{}
	}
	e.GuideID = guideID
	e.Status = domain.ExcursionDraft
	if strings.TrimSpace(e.Slug) == "" {
		e.Slug = guidesvc.Slugify(e.Title)
	}
	sanitizeExcursionHTML(e)
	return nil
}

func sanitizeExcursionHTML(e *domain.Excursion) {
	e.Description = sanitize.HTML(e.Description)
	e.BodyHTML = sanitize.HTML(e.BodyHTML)
	e.OrganizationalDetails = sanitize.HTML(e.OrganizationalDetails)
}

func (s *Service) Create(ctx context.Context, guideID int64, e *domain.Excursion) (int64, error) {
	if err := s.PrepareNew(guideID, e); err != nil {
		return 0, err
	}
	if !s.ModerationEnabled(ctx) {
		e.Status = domain.ExcursionPublished
	}
	return s.Exc.Create(ctx, e)
}

func (s *Service) StatusAfterUpdate(ctx context.Context, existing *domain.Excursion) string {
	moderation := s.ModerationEnabled(ctx)
	switch existing.Status {
	case domain.ExcursionPublished:
		if moderation {
			return domain.ExcursionPendingModeration
		}
		return domain.ExcursionPublished
	case domain.ExcursionPendingModeration:
		if !moderation {
			return domain.ExcursionPublished
		}
		return domain.ExcursionPendingModeration
	default:
		return existing.Status
	}
}

func (s *Service) Update(ctx context.Context, guideID, id int64, patch *domain.Excursion) (*domain.Excursion, error) {
	existing, err := s.Exc.GetByID(ctx, id)
	if err != nil || existing == nil || existing.GuideID != guideID {
		return nil, apperrors.ErrForbidden
	}
	patch.ID = id
	patch.GuideID = guideID
	patch.Slug = existing.Slug
	patch.MapEmbedURL = guidesvc.ResolveMapEmbed(patch.MapEmbedURL)
	if patch.IncludedItems == nil {
		patch.IncludedItems = []string{}
	}
	if patch.ExcludedItems == nil {
		patch.ExcludedItems = []string{}
	}
	sanitizeExcursionHTML(patch)
	patch.Status = s.StatusAfterUpdate(ctx, existing)
	if err := guidesvc.ValidateMaxGuests(patch.MaxGuests); err != nil {
		return nil, apperrors.New("VALIDATION_ERROR", err.Error(), 400)
	}
	if err := s.Exc.Update(ctx, patch); err != nil {
		return nil, apperrors.ErrInternal
	}
	return patch, nil
}

func (s *Service) Submit(ctx context.Context, guideID, id int64) (string, error) {
	e, err := s.Exc.GetByID(ctx, id)
	if err != nil || e == nil || e.GuideID != guideID {
		return "", apperrors.ErrForbidden
	}
	status := domain.ExcursionPendingModeration
	if !s.ModerationEnabled(ctx) {
		status = domain.ExcursionPublished
	}
	if err := s.Exc.SetStatus(ctx, id, status); err != nil {
		return "", apperrors.ErrInternal
	}
	return status, nil
}

func (s *Service) Draft(ctx context.Context, guideID, id int64) error {
	e, err := s.Exc.GetByID(ctx, id)
	if err != nil || e == nil || e.GuideID != guideID {
		return apperrors.ErrForbidden
	}
	if err := s.Exc.SetStatus(ctx, id, domain.ExcursionDraft); err != nil {
		return apperrors.ErrInternal
	}
	return nil
}

func (s *Service) Approve(ctx context.Context, id int64) error {
	if err := s.Exc.SetStatus(ctx, id, domain.ExcursionPublished); err != nil {
		return apperrors.ErrInternal
	}
	return nil
}

func (s *Service) Reject(ctx context.Context, id int64) error {
	if err := s.Exc.SetStatus(ctx, id, domain.ExcursionRejected); err != nil {
		return apperrors.ErrInternal
	}
	return nil
}

func (s *Service) Delete(ctx context.Context, guideID, id int64) error {
	if err := s.Exc.Delete(ctx, guideID, id); err != nil {
		return apperrors.ErrNotFound
	}
	return nil
}

// CanTransition reports whether a status change is allowed (for tests and guards).
func CanTransition(from, to string) bool {
	allowed := map[string][]string{
		domain.ExcursionDraft:             {domain.ExcursionPendingModeration, domain.ExcursionPublished, domain.ExcursionDraft},
		domain.ExcursionPendingModeration: {domain.ExcursionPublished, domain.ExcursionRejected, domain.ExcursionDraft},
		domain.ExcursionPublished:         {domain.ExcursionPendingModeration, domain.ExcursionPublished, domain.ExcursionDraft},
		domain.ExcursionRejected:          {domain.ExcursionDraft},
	}
	for _, t := range allowed[from] {
		if t == to {
			return true
		}
	}
	return false
}
