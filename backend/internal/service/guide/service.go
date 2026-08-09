package guide

import (
	"context"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/sanitize"
)

type GuideRepository interface {
	GetByUserID(ctx context.Context, userID int64) (*domain.GuideProfile, error)
	UpdateProfile(ctx context.Context, g *domain.GuideProfile) error
	DeleteLicenseDocuments(ctx context.Context, guideID int64) error
	HasDocument(ctx context.Context, guideID int64, docType string) (bool, error)
	DeleteDocumentByType(ctx context.Context, guideID int64, docType string) error
	AddDocument(ctx context.Context, guideID int64, docType, storageKey, mime string, size int64, checksum string) error
	AddCity(ctx context.Context, guideID, cityID int64, isPrimary bool) error
}

type ExcursionPublisher interface {
	PublishPendingByGuide(ctx context.Context, guideID int64) error
}

type SettingsReader interface {
	GetBool(ctx context.Context, key string, fallback bool) (bool, error)
}

type Service struct {
	Guides   GuideRepository
	Exc      ExcursionPublisher
	Settings SettingsReader
}

func (s *Service) HasUploadedLicense(ctx context.Context, g *domain.GuideProfile) bool {
	ok, _ := s.Guides.HasDocument(ctx, g.ID, domain.DocTypeGuideLicense)
	if ok {
		return true
	}
	ok, _ = s.Guides.HasDocument(ctx, g.ID, domain.DocTypeEntertainerLicense)
	return ok
}

func (s *Service) LicensePresent(ctx context.Context, g *domain.GuideProfile) bool {
	switch g.GuideType {
	case domain.GuideTypeGuide:
		ok, _ := s.Guides.HasDocument(ctx, g.ID, domain.DocTypeGuideLicense)
		return ok
	case domain.GuideTypeEntertainer:
		ok, _ := s.Guides.HasDocument(ctx, g.ID, domain.DocTypeEntertainerLicense)
		return ok
	default:
		return true
	}
}

func (s *Service) AccountProfile(ctx context.Context, g *domain.GuideProfile) domain.GuideAccountProfile {
	return BuildGuideAccountProfile(g, s.HasUploadedLicense(ctx, g))
}

func (s *Service) ApplyProfileUpdate(g *domain.GuideProfile, req domain.GuideProfile) {
	if req.GuideType == domain.GuideTypeCompanion {
		g.GuideType = domain.GuideTypeCompanion
	} else if g.GuideType == domain.GuideTypeCompanion {
		g.GuideType = domain.GuideTypeGuide
	}
	g.FirstName = req.FirstName
	g.LastName = req.LastName
	g.DisplayName = req.DisplayName
	g.About = sanitize.HTML(req.About)
	g.PreferredContactMethod = req.PreferredContactMethod
	g.Phone = req.Phone
	g.Email = req.Email
	g.Telegram = req.Telegram
	g.Whatsapp = req.Whatsapp
	g.AvatarURL = strings.TrimSpace(req.AvatarURL)
	if g.DisplayName != "" && g.Status == domain.GuideStatusDraft {
		g.Status = domain.GuideStatusWaitingPayment
	}
}

func (s *Service) UpdateProfile(ctx context.Context, userID int64, req domain.GuideProfile) (*domain.GuideAccountProfile, error) {
	g, err := s.Guides.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if g == nil {
		return nil, nil
	}
	if req.GuideType == domain.GuideTypeCompanion {
		_ = s.Guides.DeleteLicenseDocuments(ctx, g.ID)
	}
	s.ApplyProfileUpdate(g, req)
	if err := s.Guides.UpdateProfile(ctx, g); err != nil {
		return nil, err
	}
	profile := s.AccountProfile(ctx, g)
	return &profile, nil
}

func (s *Service) ModerationEnabled(ctx context.Context) bool {
	if s.Settings == nil {
		return true
	}
	enabled, _ := s.Settings.GetBool(ctx, "moderation_enabled", true)
	return enabled
}

func (s *Service) AutoPublishPending(ctx context.Context, guideID int64) {
	if s.ModerationEnabled(ctx) || s.Exc == nil {
		return
	}
	_ = s.Exc.PublishPendingByGuide(ctx, guideID)
}

func (s *Service) AfterDocumentUpload(ctx context.Context, g *domain.GuideProfile, docType, storageKey, mime string, size int64) error {
	if err := s.Guides.DeleteDocumentByType(ctx, g.ID, OppositeDocumentType(docType)); err != nil {
		return err
	}
	if err := s.Guides.AddDocument(ctx, g.ID, docType, storageKey, mime, size, ""); err != nil {
		return err
	}
	g.GuideType = GuideTypeForDocument(docType)
	return s.Guides.UpdateProfile(ctx, g)
}
