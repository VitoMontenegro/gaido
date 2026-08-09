package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/vitomonte/experts-tourister/internal/domain"
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

func (h *Handlers) publicGuideDTO(ctx context.Context, g *domain.GuideProfile) domain.PublicGuideDTO {
	sub, _ := h.Subs.GetActive(ctx, g.ID)
	hasLicense := h.licensePresent(ctx, g)
	// Monetization master switch: when payments enabled, contacts require active subscription.
	requireSub, _ := h.Settings.GetBool(ctx, "guide_placement_payments_enabled", false)
	return guidesvc.BuildPublicGuideDTO(g, sub, hasLicense, requireSub)
}
