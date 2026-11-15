package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/service/identity"
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
		slug = identity.ProfileSlug(name, "user")
	}
	return
}

func mapSlugErr(err error) error {
	if errors.Is(err, identity.ErrSlugConflict) || errors.Is(err, guidesvc.ErrSlugConflict) {
		return apperrors.ErrSlugTaken
	}
	return err
}

func (h *Handlers) uniqueProviderSlug(ctx context.Context, raw, name string, exceptID int64) (string, error) {
	return h.allocateProfileSlug(ctx, "provider", name, "provider", exceptID, func(s string) (bool, error) {
		return h.Providers.SlugTaken(ctx, s, exceptID)
	})
}

func (h *Handlers) uniqueGuideSlug(ctx context.Context, raw, name string, exceptID int64) (string, error) {
	return h.allocateProfileSlug(ctx, "guide", name, "guide", exceptID, func(s string) (bool, error) {
		return h.Guides.SlugTaken(ctx, s, exceptID)
	})
}

func (h *Handlers) uniqueCarrierSlug(ctx context.Context, raw, name string, exceptProviderID int64) (string, error) {
	return h.allocateProfileSlug(ctx, "carrier", name, "carrier", exceptProviderID, func(s string) (bool, error) {
		return h.Carriers.SlugTaken(ctx, s, exceptProviderID)
	})
}

func (h *Handlers) allocateProfileSlug(ctx context.Context, space, name, fallback string, exceptID int64, extra func(string) (bool, error)) (string, error) {
	slug, err := identity.AllocateProfileSlug(name, fallback, func(s string) (bool, error) {
		if h.SlugAliases != nil {
			taken, err := h.SlugAliases.Taken(ctx, space, s, exceptID)
			if err != nil || taken {
				return taken, err
			}
		}
		if extra != nil {
			return extra(s)
		}
		return false, nil
	})
	return slug, mapSlugErr(err)
}

func (h *Handlers) createGuideProfileTx(ctx context.Context, userID int64, first, last, login string) error {
	name := domain.UserDisplayName(first, last, login)
	slug, err := h.uniqueGuideSlug(ctx, "", name, 0)
	if err != nil {
		return err
	}
	guideID, err := h.Guides.CreateProfile(ctx, userID, domain.GuideTypeGuide, name, slug)
	if err != nil {
		return err
	}
	if h.SlugAliases != nil {
		if err := h.SlugAliases.Reserve(ctx, "guide", slug, guideID, true); err != nil {
			return err
		}
	}
	_ = h.GuideSvc.ActivateForCatalogFilling(ctx, guideID)
	return nil
}

func (h *Handlers) redirectProfileAlias(w http.ResponseWriter, r *http.Request, space, prefix, slug string) bool {
	if h.SlugAliases == nil {
		return false
	}
	_, current, isCurrent, err := h.SlugAliases.Lookup(r.Context(), space, slug)
	if err != nil || current == "" || isCurrent || current == slug {
		return false
	}
	http.Redirect(w, r, prefix+current, http.StatusMovedPermanently)
	return true
}
