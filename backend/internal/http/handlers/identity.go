package handlers

import (
	"context"
	"errors"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

func roleProvider(ctx context.Context) bool {
	return hasRole(ctx, domain.RoleProvider)
}

func identityHintDTO(name, slug string) map[string]string {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}
	return map[string]string{"display_name": name, "website_slug": strings.TrimSpace(slug)}
}

func (h *Handlers) identityHint(ctx context.Context, userID int64, skip string) (name, slug string) {
	pick := func(n, s string) bool {
		n = strings.TrimSpace(n)
		if n == "" {
			return false
		}
		name, slug = n, strings.TrimSpace(s)
		return true
	}
	if skip != "carrier" && h.Carriers != nil {
		if cp, _ := h.Carriers.GetProfileByUserID(ctx, userID); cp != nil && pick(cp.DisplayName, cp.WebsiteSlug) {
			return
		}
	}
	if skip != "provider" && h.Providers != nil {
		if p, _ := h.Providers.GetProviderByUserID(ctx, userID); p != nil && pick(p.DisplayName, p.WebsiteSlug) {
			return
		}
	}
	if skip != "guide" && h.Guides != nil {
		if g, _ := h.Guides.GetByUserID(ctx, userID); g != nil && pick(g.DisplayName, g.WebsiteSlug) {
			return
		}
	}
	if u, _ := h.Users.GetByID(ctx, userID); u != nil {
		name = domain.UserDisplayName(u.FirstName, u.LastName, u.Login)
		slug = guidesvc.WebsiteSlug("", name)
		if slug == "provider" {
			slug = guidesvc.WebsiteSlug(u.Login, "user")
		}
	}
	return
}

func mapSlugErr(err error) error {
	if errors.Is(err, guidesvc.ErrSlugConflict) {
		return apperrors.ErrSlugTaken
	}
	return err
}

func (h *Handlers) uniqueProviderSlug(ctx context.Context, raw, name string, exceptID int64) (string, error) {
	slug, err := guidesvc.ReserveOrAllocate(raw, name, "provider", func(s string) (bool, error) {
		return h.Providers.SlugTaken(ctx, s, exceptID)
	})
	return slug, mapSlugErr(err)
}

func (h *Handlers) uniqueGuideSlug(ctx context.Context, raw, name string, exceptID int64) (string, error) {
	slug, err := guidesvc.ReserveOrAllocate(raw, name, "guide", func(s string) (bool, error) {
		return h.Guides.SlugTaken(ctx, s, exceptID)
	})
	return slug, mapSlugErr(err)
}

func (h *Handlers) uniqueCarrierSlug(ctx context.Context, raw, name string, exceptProviderID int64) (string, error) {
	slug, err := guidesvc.ReserveOrAllocate(raw, name, "carrier", func(s string) (bool, error) {
		return h.Carriers.SlugTaken(ctx, s, exceptProviderID)
	})
	return slug, mapSlugErr(err)
}
