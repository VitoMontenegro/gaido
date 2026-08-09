package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) CreateReview(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ExcursionID int64  `json:"excursion_id"`
		Rating      int    `json:"rating"`
		Text        string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.ExcursionID <= 0 || req.Rating < 1 || req.Rating > 5 || strings.TrimSpace(req.Text) == "" {
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
	if !h.IsModerationEnabled(r.Context()) {
		_ = h.Reviews.SetStatus(r.Context(), id, domain.ReviewPublished)
		_ = h.Reviews.RecalcRating(r.Context(), ex.GuideID)
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
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
	var (
		items []domain.Review
		err   error
	)
	switch {
	case excursionID > 0:
		items, err = h.Reviews.ListByExcursion(r.Context(), excursionID)
	case guideID > 0:
		items, err = h.Reviews.ListByGuide(r.Context(), guideID)
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
	response.JSON(w, r, 200, map[string]any{"items": items})
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
