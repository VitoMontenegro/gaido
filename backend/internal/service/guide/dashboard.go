package guide

import (
	"time"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

type DashboardInput struct {
	Guide              *domain.GuideProfile
	Stats              domain.GuideDashboardStats
	Subscription       *domain.GuideSubscription
	FeaturedGuide      *domain.FeaturedPlacement
	FeaturedExcursions []domain.FeaturedExcursionPlacement
	PaymentsEnabled    bool
	HasLicense         bool
}

func BuildDashboard(in DashboardInput) map[string]any {
	g := in.Guide
	stats := in.Stats
	profileComplete := 0
	if g.AvatarURL != "" {
		profileComplete += 25
	}
	if g.About != "" {
		profileComplete += 25
	}
	if g.Phone != "" {
		profileComplete += 25
	}
	if g.GuideType == domain.GuideTypeCompanion || in.HasLicense {
		profileComplete += 25
	}

	return map[string]any{
		"display_name": g.DisplayName, "avatar_url": g.AvatarURL, "website_slug": g.WebsiteSlug,
		"status": g.Status, "guide_type": g.GuideType, "catalog_status": CatalogStatus(g.GuideType, in.HasLicense),
		"rating_avg": g.RatingAvg, "rating_count": g.RatingCount,
		"profile_complete": profileComplete,
		"excursions": map[string]int{
			"published": stats.PublishedExcursions,
			"draft":     stats.DraftExcursions,
			"pending":   stats.PendingExcursions,
			"total":     stats.PublishedExcursions + stats.DraftExcursions + stats.PendingExcursions,
		},
		"slots_upcoming":            stats.UpcomingSlots,
		"payments_enabled":          in.PaymentsEnabled,
		"subscription_expires":      subscriptionExpires(in.Subscription),
		"featured_guide_expires":    featuredExpires(in.FeaturedGuide),
		"featured_excursions_count": len(in.FeaturedExcursions),
	}
}

func subscriptionExpires(sub *domain.GuideSubscription) *time.Time {
	if sub == nil {
		return nil
	}
	return sub.ExpiresAt
}

func featuredExpires(fp *domain.FeaturedPlacement) *time.Time {
	if fp == nil {
		return nil
	}
	return &fp.ExpiresAt
}
