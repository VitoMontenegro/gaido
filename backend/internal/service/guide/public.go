package guide

import (
	"context"
	"strings"
	"time"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

type DocumentChecker interface {
	HasDocument(ctx context.Context, guideID int64, docType string) (bool, error)
}

type SubscriptionChecker interface {
	GetActiveSubscription(ctx context.Context, guideID int64) (*domain.GuideSubscription, error)
}

func BuildPublicGuideDTO(g *domain.GuideProfile, sub *domain.GuideSubscription, hasLicense bool, requireSubscription bool) domain.PublicGuideDTO {
	dto := domain.PublicGuideDTO{
		ID:          g.ID,
		Slug:        g.WebsiteSlug,
		DisplayName: g.DisplayName,
		GuideType:   g.GuideType,
		About:       g.About,
		AvatarURL:   g.AvatarURL,
		RatingAvg:   g.RatingAvg,
		RatingCount: g.RatingCount,
		Status:      g.Status,
		Contacts:    domain.ContactsDTO{Visible: false},
	}

	if badge := typeBadge(g.GuideType, hasLicense); badge != "" {
		dto.TypeBadge = &badge
	}

	if contactsVisible(g, sub, requireSubscription) {
		dto.Contacts = domain.ContactsDTO{
			Visible:                true,
			Phone:                  g.Phone,
			Email:                  g.Email,
			Telegram:               g.Telegram,
			Whatsapp:               g.Whatsapp,
			PreferredContactMethod: g.PreferredContactMethod,
		}
	}
	return dto
}

func CatalogStatus(guideType string, hasLicense bool) string {
	switch guideType {
	case domain.GuideTypeCompanion:
		return "companion"
	case domain.GuideTypeGuide, domain.GuideTypeEntertainer:
		if hasLicense {
			return "confirmed"
		}
		return "pending"
	default:
		if hasLicense {
			return "confirmed"
		}
		return "pending"
	}
}

func GuideTypeForDocument(docType string) string {
	if docType == domain.DocTypeEntertainerLicense {
		return domain.GuideTypeEntertainer
	}
	return domain.GuideTypeGuide
}

func OppositeDocumentType(docType string) string {
	if docType == domain.DocTypeEntertainerLicense {
		return domain.DocTypeGuideLicense
	}
	return domain.DocTypeEntertainerLicense
}

func BuildGuideAccountProfile(g *domain.GuideProfile, hasLicense bool) domain.GuideAccountProfile {
	public := BuildPublicGuideDTO(g, nil, hasLicense, true)
	return domain.GuideAccountProfile{
		GuideProfile:  *g,
		TypeBadge:     public.TypeBadge,
		HasLicense:    hasLicense,
		CatalogStatus: CatalogStatus(g.GuideType, hasLicense),
	}
}

func typeBadge(guideType string, hasLicense bool) string {
	switch guideType {
	case domain.GuideTypeCompanion:
		return "Компаньйон"
	case domain.GuideTypeGuide:
		if hasLicense {
			return "Гід"
		}
	case domain.GuideTypeEntertainer:
		if hasLicense {
			return "Конферансьє"
		}
	}
	return ""
}

func contactsVisible(g *domain.GuideProfile, sub *domain.GuideSubscription, requireSubscription bool) bool {
	if g.Status != domain.GuideStatusActive {
		return false
	}
	if g.Status == domain.GuideStatusBlocked || g.Status == domain.GuideStatusSuspended {
		return false
	}
	if !requireSubscription {
		return true
	}
	if sub == nil || sub.Status != domain.SubscriptionActive {
		return false
	}
	if sub.ExpiresAt == nil || !sub.ExpiresAt.After(time.Now()) {
		return false
	}
	return true
}

func Slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.ReplaceAll(s, " ", "-")
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			b.WriteRune(r)
		}
	}
	out := b.String()
	if out == "" {
		return "guide"
	}
	return out
}

func ValidateMaxGuests(n int) error {
	if n < 1 {
		return domain.ErrInvalidMaxGuests
	}
	if n > domain.MaxGuestsCap {
		return domain.ErrInvalidMaxGuests
	}
	return nil
}
