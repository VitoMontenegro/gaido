package handlers

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/geocode"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

func (h *Handlers) Ready(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if err := h.DB.Pool.Ping(ctx); err != nil {
		response.JSON(w, r, 503, map[string]string{"status": "postgres unavailable"})
		return
	}
	if err := h.Redis.Ping(ctx); err != nil {
		response.JSON(w, r, 503, map[string]string{"status": "redis unavailable"})
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ready"})
}

func (h *Handlers) CreateNotification(ctx context.Context, userID int64, ntype, payload string) error {
	if err := h.Notif.Create(ctx, userID, ntype, []byte(payload)); err != nil {
		return err
	}
	return h.Redis.Signal.Publish(ctx, "notifications:"+strconv.FormatInt(userID, 10), "1").Err()
}

func (h *Handlers) NotifyAdmins(ctx context.Context, ntype, payload string) {
	ids, err := h.Users.ListAdminIDs(ctx)
	if err != nil {
		return
	}
	for _, id := range ids {
		_ = h.CreateNotification(ctx, id, ntype, payload)
	}
}

func (h *Handlers) ensureArticleAuthor(ctx context.Context, article *domain.Article) {
	if article == nil || article.AuthorID != nil {
		return
	}
	adminID, err := h.Users.FirstAdminID(ctx)
	if err != nil || adminID <= 0 {
		return
	}
	if err := h.Articles.SetAuthor(ctx, article.ID, adminID); err != nil {
		return
	}
	article.AuthorID = &adminID
}

func (h *Handlers) licensePresent(ctx context.Context, g *domain.GuideProfile) bool {
	return h.GuideSvc.LicensePresent(ctx, g)
}

func (h *Handlers) canPreviewUnpublishedExcursion(ctx context.Context, guideID int64) bool {
	uid := middleware.UserIDFromContext(ctx)
	if uid == 0 {
		return false
	}
	for _, role := range middleware.RolesFromContext(ctx) {
		if role == domain.RoleAdmin || role == domain.RoleModerator {
			return true
		}
	}
	g, _ := h.Guides.GetByUserID(ctx, uid)
	return g != nil && g.ID == guideID
}

func (h *Handlers) canViewExcursion(ctx context.Context, e *domain.ExcursionView) bool {
	if e == nil {
		return false
	}
	if e.Status == domain.ExcursionPublished {
		return true
	}
	return h.canPreviewUnpublishedExcursion(ctx, e.GuideID)
}

func (h *Handlers) publicGuideDTO(ctx context.Context, g *domain.GuideProfile) domain.PublicGuideDTO {
	sub, _ := h.Subs.GetActive(ctx, g.ID)
	hasLicense := h.licensePresent(ctx, g)
	// Monetization master switch: when payments enabled, contacts require active subscription.
	requireSub, _ := h.Settings.GetBool(ctx, "guide_placement_payments_enabled", false)
	return guidesvc.BuildPublicGuideDTO(g, sub, hasLicense, requireSub)
}

func (h *Handlers) geocoder() *geocode.Nominatim {
	return geocode.NewNominatim(h.Cfg.GeocodeUserAgent)
}

func (h *Handlers) resolveCityGeocode(ctx context.Context, cityName, countrySlug string, lat, lng float64) (float64, float64, string, error) {
	displayName := geocode.NormalizeDisplayName(cityName)
	if lat != 0 || lng != 0 {
		return lat, lng, displayName, nil
	}
	result, ok, err := h.geocoder().SearchCity(ctx, cityName, countrySlug)
	if err != nil {
		h.Log.Warn("geocode city failed", "city", cityName, "country", countrySlug, "err", err)
		return 0, 0, "", apperrors.ErrCityNotGeocoded
	}
	if !ok || (result.Lat == 0 && result.Lng == 0) || !geocode.HasCyrillic(result.Name) {
		return 0, 0, "", apperrors.ErrCityNotGeocoded
	}
	name := result.Name
	if name == "" {
		name = displayName
	}
	return result.Lat, result.Lng, name, nil
}

func (h *Handlers) ensureCityCoords(ctx context.Context, cityID int64, lat, lng float64) {
	if cityID <= 0 || (lat == 0 && lng == 0) {
		return
	}
	if err := h.Geo.UpdateCityCoords(ctx, cityID, lat, lng); err != nil {
		h.Log.Warn("update city coords failed", "city_id", cityID, "err", err)
	}
}

func (h *Handlers) ensureCityName(ctx context.Context, cityID int64, name string) {
	if cityID <= 0 || strings.TrimSpace(name) == "" {
		return
	}
	if err := h.Geo.UpdateCityName(ctx, cityID, name); err != nil {
		h.Log.Warn("update city name failed", "city_id", cityID, "err", err)
	}
}
