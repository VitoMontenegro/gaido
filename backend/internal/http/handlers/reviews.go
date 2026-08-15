package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

const maxReviewPhotos = 8

func paginateReviews(r *http.Request) (int, int) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

func (h *Handlers) CreateReview(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ExcursionID int64    `json:"excursion_id"`
		Rating      int      `json:"rating"`
		Text        string   `json:"text"`
		Photos      []string `json:"photos"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.ExcursionID <= 0 || req.Rating < 1 || req.Rating > 5 || strings.TrimSpace(req.Text) == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if len(req.Photos) > maxReviewPhotos {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	ex, err := h.Exc.GetByID(r.Context(), req.ExcursionID)
	if err != nil || ex == nil || ex.Status != domain.ExcursionPublished {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	id, err := h.Reviews.Create(r.Context(), ex.GuideID, middleware.UserIDFromContext(r.Context()), req.ExcursionID, req.Rating, req.Text)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			response.Error(w, r, apperrors.ErrReviewExists)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if err := h.Reviews.SavePhotos(r.Context(), id, sanitizeReviewPhotoKeys(req.Photos)); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if !h.IsModerationEnabled(r.Context()) {
		_ = h.Reviews.SetStatus(r.Context(), id, domain.ReviewPublished)
		_ = h.Reviews.RecalcRating(r.Context(), ex.GuideID)
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

func sanitizeReviewPhotoKeys(keys []string) []string {
	out := make([]string, 0, len(keys))
	seen := make(map[string]struct{}, len(keys))
	for _, k := range keys {
		k = strings.TrimSpace(k)
		if k == "" {
			continue
		}
		if _, ok := seen[k]; ok {
			continue
		}
		seen[k] = struct{}{}
		out = append(out, k)
		if len(out) >= maxReviewPhotos {
			break
		}
	}
	return out
}

func (h *Handlers) UploadReviewPhoto(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(h.Cfg.MediaMaxUploadBytes); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	defer file.Close()
	mime := hdr.Header.Get("Content-Type")
	_, pub, _, err := h.Media.SaveUpload(file, mime, h.Cfg.MediaMaxUploadBytes)
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	response.JSON(w, r, 201, map[string]string{"public_key": pub})
}

func (h *Handlers) CreateReviewComment(w http.ResponseWriter, r *http.Request) {
	reviewID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if strings.TrimSpace(req.Text) == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	uid := middleware.UserIDFromContext(r.Context())
	rv, err := h.Reviews.GetByID(r.Context(), reviewID)
	if err != nil || rv == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	g, _ := h.Guides.GetByUserID(r.Context(), uid)
	isGuide := g != nil && g.ID == rv.GuideID
	isAuthor := rv.AuthorID == uid
	if !isGuide && !isAuthor {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	id, err := h.Reviews.AddComment(r.Context(), reviewID, uid, req.Text)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	notifyUserID := rv.AuthorID
	if uid == rv.AuthorID {
		gp, _ := h.Guides.GetByID(r.Context(), rv.GuideID)
		if gp != nil {
			notifyUserID = gp.UserID
		}
	}
	if notifyUserID != uid {
		_ = h.CreateNotification(r.Context(), notifyUserID, "REVIEW_COMMENT", `{}`)
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

func (h *Handlers) ListReviewsPublic(w http.ResponseWriter, r *http.Request) {
	excursionID, _ := strconv.ParseInt(r.URL.Query().Get("excursion_id"), 10, 64)
	guideID, _ := strconv.ParseInt(r.URL.Query().Get("guide_id"), 10, 64)
	limit, offset := paginateReviews(r)
	var (
		items []domain.Review
		total int
		err   error
	)
	switch {
	case excursionID > 0:
		items, err = h.Reviews.ListByExcursion(r.Context(), excursionID, limit, offset)
		if err == nil {
			total, err = h.Reviews.CountByExcursion(r.Context(), excursionID)
		}
	case guideID > 0:
		items, err = h.Reviews.ListByGuide(r.Context(), guideID, limit, offset)
		if err == nil {
			total, err = h.Reviews.CountByGuide(r.Context(), guideID)
		}
	default:
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.Review{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items, "total": total, "limit": limit, "offset": offset})
}

func (h *Handlers) ListReviewPhotosPublic(w http.ResponseWriter, r *http.Request) {
	excursionID, _ := strconv.ParseInt(r.URL.Query().Get("excursion_id"), 10, 64)
	guideID, _ := strconv.ParseInt(r.URL.Query().Get("guide_id"), 10, 64)
	limit, offset := paginateReviews(r)
	var (
		items []domain.ReviewPhotoItem
		total int
		err   error
	)
	switch {
	case excursionID > 0:
		items, err = h.Reviews.ListPhotosByExcursion(r.Context(), excursionID, limit, offset)
		if err == nil {
			total, err = h.Reviews.CountPhotosByExcursion(r.Context(), excursionID)
		}
	case guideID > 0:
		items, err = h.Reviews.ListPhotosByGuide(r.Context(), guideID, limit, offset)
		if err == nil {
			total, err = h.Reviews.CountPhotosByGuide(r.Context(), guideID)
		}
	default:
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.ReviewPhotoItem{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items, "total": total, "limit": limit, "offset": offset})
}

func (h *Handlers) ModListReviews(w http.ResponseWriter, r *http.Request) {
	items, err := h.ReviewSvc.ListPending(r.Context())
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) ApproveReview(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.ReviewSvc.Approve(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "published"})
}
func (h *Handlers) AdminListReviews(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	items, err := h.Reviews.ListAdmin(r.Context(), status, 100)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) AdminDeleteReview(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if id <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	guideID, err := h.Reviews.Delete(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if guideID > 0 {
		_ = h.Reviews.RecalcRating(r.Context(), guideID)
	}
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}

func (h *Handlers) DisputeReview(w http.ResponseWriter, r *http.Request) {
	reviewID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	text := strings.TrimSpace(req.Text)
	if text == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	uid := middleware.UserIDFromContext(r.Context())
	g, err := h.Guides.GetByUserID(r.Context(), uid)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	rv, err := h.Reviews.GetByID(r.Context(), reviewID)
	if err != nil || rv == nil || rv.Status != domain.ReviewPublished {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if rv.GuideID != g.ID {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	id, err := h.Reviews.CreateDispute(r.Context(), reviewID, g.ID, text)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			response.Error(w, r, apperrors.ErrDisputeExists)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	exTitle := ""
	if ex, _ := h.Exc.GetByID(r.Context(), rv.ExcursionID); ex != nil {
		exTitle = ex.Title
	}
	payload, _ := json.Marshal(map[string]any{
		"review_id":       reviewID,
		"dispute_id":      id,
		"guide_id":        g.ID,
		"guide_name":      g.DisplayName,
		"excursion_title": exTitle,
		"rating":          rv.Rating,
		"text_preview":    truncateRunes(text, 200),
	})
	h.NotifyAdmins(r.Context(), "REVIEW_DISPUTE", string(payload))
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

func truncateRunes(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max]) + "…"
}
