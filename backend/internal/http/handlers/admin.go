package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/cacheheaders"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	mailsvc "github.com/vitomonte/experts-tourister/internal/service/mail"
)

func (h *Handlers) AdminUsers(w http.ResponseWriter, r *http.Request) {
	items, err := h.Users.List(r.Context(), 100, 0)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, u := range items {
		out = append(out, map[string]any{
			"id": u.ID, "email": u.Email, "login": u.Login,
			"first_name": u.FirstName, "last_name": u.LastName,
			"roles": u.Roles, "status": u.Status, "created_at": u.CreatedAt,
		})
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}
func (h *Handlers) AdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	actor := middleware.UserIDFromContext(r.Context())
	if id <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if id == actor {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	u, err := h.Users.GetByID(r.Context(), id)
	if err != nil || u == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	for _, role := range u.Roles {
		if role == domain.RoleAdmin {
			n, err := h.Users.CountAdmins(r.Context())
			if err != nil {
				response.Error(w, r, apperrors.ErrInternal)
				return
			}
			if n <= 1 {
				response.Error(w, r, apperrors.ErrForbidden)
				return
			}
			break
		}
	}
	if err := h.Users.SoftDelete(r.Context(), id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.Error(w, r, apperrors.ErrNotFound)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	_ = h.Audit.Log(r.Context(), &actor, "USER_DELETE", "user", &id, u.Login, "", r.RemoteAddr, r.UserAgent())
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}
func (h *Handlers) AdminAnalytics(w http.ResponseWriter, r *http.Request) {
	stats, err := h.Admin.DashboardStats(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	recentPayments := make([]map[string]any, 0, len(stats.RecentPayments))
	for _, p := range stats.RecentPayments {
		recentPayments = append(recentPayments, map[string]any{
			"id": p.ID, "amount": p.Amount, "currency": p.Currency, "purpose": p.Purpose,
			"status": p.Status, "created_at": p.CreatedAt, "payer_name": p.PayerName,
		})
	}
	response.JSON(w, r, 200, map[string]any{
		"active_guides": stats.ActiveGuides, "published_excursions": stats.PublishedExcursions, "published_reviews": stats.PublishedReviews,
		"total_users": stats.TotalUsers, "total_guides": stats.TotalGuides,
		"pending_moderation_excursions": stats.PendingExcursions, "draft_excursions": stats.DraftExcursions, "pending_reviews": stats.PendingReviews,
		"total_favorites": stats.TotalFavorites,
		"payments_total":  stats.PaymentsTotal, "payments_paid": stats.PaymentsPaid, "payments_pending": stats.PaymentsPending,
		"revenue_total": stats.RevenueTotal, "revenue_month": stats.RevenueMonth,
		"active_subscriptions":   stats.ActiveSubscriptions,
		"featured_guides_active": stats.FeaturedGuides, "featured_excursions_active": stats.FeaturedExcursions,
		"cities_count": stats.CitiesCount, "countries_count": stats.CountriesCount,
		"total_carriers": stats.TotalCarriers, "published_carriers": stats.PublishedCarriers,
		"pending_carriers": stats.PendingCarriers, "published_rides": stats.PublishedRides,
		"pending_rides": stats.PendingRides, "transport_bookings": stats.TransportBookings,
		"carrier_subscriptions": stats.CarrierSubscriptions,
		"total_providers":       stats.TotalProviders, "published_providers": stats.PublishedProviders,
		"pending_providers": stats.PendingProviders, "total_offerings": stats.TotalOfferings,
		"published_offerings": stats.PublishedOfferings, "pending_offerings": stats.PendingOfferings,
		"total_complaints": stats.TotalComplaints, "pending_complaints": stats.PendingComplaints,
		"provider_subscriptions": stats.ProviderSubscriptions,
		"recent_payments":        recentPayments,
	})
}
func (h *Handlers) AdminGetSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	payments, _ := h.Settings.GetBool(ctx, "guide_placement_payments_enabled", false)
	moderation, _ := h.Settings.GetBool(ctx, "moderation_enabled", true)
	bodyFont := h.LoadBodyFont(ctx)
	if !payments || !moderation {
		h.SyncCatalogFillingMode(ctx)
	}
	mailCfg, err := h.Mail.Load(ctx)
	if err != nil {
		h.Log.Warn("mail settings load failed", "error", err)
	}
	response.JSON(w, r, 200, map[string]any{
		"guide_placement_payments_enabled": payments,
		"moderation_enabled":               moderation,
		"body_font":                        bodyFont,
		"mail":                             h.Mail.Public(mailCfg),
	})
}
func (h *Handlers) AdminSetSettings(w http.ResponseWriter, r *http.Request) {
	var req struct {
		GuidePlacementPaymentsEnabled *bool                `json:"guide_placement_payments_enabled"`
		ModerationEnabled             *bool                `json:"moderation_enabled"`
		BodyFont                      *string              `json:"body_font"`
		Mail                          *domain.MailSettings `json:"mail"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	if req.GuidePlacementPaymentsEnabled != nil {
		val := "false"
		if *req.GuidePlacementPaymentsEnabled {
			val = "true"
		}
		_ = h.Settings.Set(r.Context(), "guide_placement_payments_enabled", val)
		_ = h.Audit.Log(r.Context(), &actor, "SITE_SETTING_CHANGE", "site_settings", nil, "guide_placement_payments_enabled", val, r.RemoteAddr, r.UserAgent())
	}
	if req.ModerationEnabled != nil {
		val := "false"
		if *req.ModerationEnabled {
			val = "true"
		}
		_ = h.Settings.Set(r.Context(), "moderation_enabled", val)
		_ = h.Audit.Log(r.Context(), &actor, "SITE_SETTING_CHANGE", "site_settings", nil, "moderation_enabled", val, r.RemoteAddr, r.UserAgent())
	}
	if req.BodyFont != nil {
		font := normalizeBodyFont(*req.BodyFont)
		_ = h.Settings.Set(r.Context(), "body_font", font)
		_ = h.Audit.Log(r.Context(), &actor, "SITE_SETTING_CHANGE", "site_settings", nil, "body_font", font, r.RemoteAddr, r.UserAgent())
	}
	if req.Mail != nil {
		if _, err := h.Mail.Save(r.Context(), *req.Mail); err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		_ = h.Audit.Log(r.Context(), &actor, "SITE_SETTING_CHANGE", "site_settings", nil, "mail_settings", req.Mail.Host, r.RemoteAddr, r.UserAgent())
	}
	h.SyncCatalogFillingMode(r.Context())
	h.AdminGetSettings(w, r)
}

func (h *Handlers) AdminTestMail(w http.ResponseWriter, r *http.Request) {
	var req struct {
		To string `json:"to"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	to := strings.TrimSpace(req.To)
	if to == "" || !emailRe.MatchString(to) {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "invalid email format", 400))
		return
	}
	if err := h.Mail.Send(r.Context(), to, "Тестовий лист Gaido", "Це тестовий лист з адмінки Gaido. Поштовий сервер налаштовано коректно.\n"); err != nil {
		if errors.Is(err, mailsvc.ErrNotConfigured) {
			response.Error(w, r, apperrors.ErrMailNotConfigured)
			return
		}
		h.Log.Warn("test mail failed", "error", err)
		response.Error(w, r, apperrors.New("MAIL_SEND_FAILED", "failed to send email", 502))
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "sent"})
}
func (h *Handlers) SyncCatalogFillingMode(ctx context.Context) {
	payments, _ := h.Settings.GetBool(ctx, "guide_placement_payments_enabled", false)
	moderation := h.IsModerationEnabled(ctx)
	if payments && moderation {
		return
	}
	if !payments {
		if n, err := h.Guides.ActivateAllForCatalogFilling(ctx); err != nil {
			h.Log.Warn("catalog filling: activate guides failed", "error", err)
		} else if n > 0 {
			h.Log.Info("catalog filling: guides activated", "count", n)
		}
	}
	if !moderation {
		h.PublishAllPendingContent(ctx)
	}
}
func (h *Handlers) AutoPublishPendingForGuide(ctx context.Context, guideID int64) {
	if h.IsModerationEnabled(ctx) {
		return
	}
	_ = h.Exc.PublishPendingByGuide(ctx, guideID)
}
func (h *Handlers) PublishAllPendingContent(ctx context.Context) {
	_ = h.Exc.PublishAllPending(ctx)
	guideIDs, _ := h.Reviews.PublishAllPending(ctx)
	for _, gid := range guideIDs {
		_ = h.Reviews.RecalcRating(ctx, gid)
	}
}
func (h *Handlers) IsModerationEnabled(ctx context.Context) bool {
	enabled, _ := h.Settings.GetBool(ctx, "moderation_enabled", true)
	return enabled
}
func (h *Handlers) AdminAudit(w http.ResponseWriter, r *http.Request) {
	items, err := h.Audit.ListRecent(r.Context(), 100)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, e := range items {
		out = append(out, map[string]any{
			"id": e.ID, "actor_id": e.ActorID, "action": e.Action,
			"entity_type": e.EntityType, "entity_id": e.EntityID, "created_at": e.CreatedAt,
		})
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}
func (h *Handlers) ListSlots(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	items, err := h.Calendar.List(r.Context(), g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) CreateSlot(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		StartsAt time.Time `json:"starts_at"`
		EndsAt   time.Time `json:"ends_at"`
		Note     string    `json:"note"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	id, err := h.Calendar.Create(r.Context(), g.ID, req.StartsAt, req.EndsAt, req.Note)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}
func (h *Handlers) DeleteSlot(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.Calendar.Delete(r.Context(), g.ID, id); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}
func (h *Handlers) UploadMedia(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(h.Cfg.MediaMaxUploadBytes); err != nil {
		h.Log.Warn("media upload rejected", "err", err, "stage", "parse_multipart", "request_id", middleware.GetRequestID(r.Context()))
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "upload failed", 400))
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		h.Log.Warn("media upload rejected", "err", err, "stage", "form_file", "request_id", middleware.GetRequestID(r.Context()))
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "upload failed", 400))
		return
	}
	defer file.Close()
	mime := hdr.Header.Get("Content-Type")
	_, pub, _, err := h.Media.SaveUpload(file, mime, h.Cfg.MediaMaxUploadBytes)
	if err != nil {
		h.Log.Warn("media upload rejected", "err", err, "declared_mime", mime, "request_id", middleware.GetRequestID(r.Context()))
		response.Error(w, r, mediaUploadError(err))
		return
	}
	response.JSON(w, r, 201, map[string]string{"public_key": pub})
}
func (h *Handlers) ServePublicMedia(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	w.Header().Set("Cache-Control", cacheheaders.Immutable)
	http.ServeFile(w, r, h.Media.PublicPath(key))
}
