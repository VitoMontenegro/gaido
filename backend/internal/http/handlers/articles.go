package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

func (h *Handlers) ListArticlesPublic(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, err := h.Articles.ListPublished(r.Context(), limit, offset)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.ArticleListItem{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) GetArticlePublic(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	article, err := h.Articles.GetPublishedBySlug(r.Context(), slug)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if article == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	h.ensureArticleAuthor(r.Context(), article)
	if article.Author == nil && article.AuthorID != nil {
		if refreshed, err := h.Articles.GetByID(r.Context(), article.ID); err == nil && refreshed != nil {
			article.Author = refreshed.Author
		}
	}
	response.JSON(w, r, 200, article)
}

func (h *Handlers) ListGuideArticlesPublic(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, err := h.Articles.ListPublishedByGuideSlug(r.Context(), slug, limit, offset)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.ArticleListItem{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) ListArticlesCMS(w http.ResponseWriter, r *http.Request) {
	items, err := h.Articles.ListAll(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.Article{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) GetArticleCMS(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	article, err := h.Articles.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if article == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, article)
}
func validateArticleInput(in postgres.ArticleInput) *apperrors.AppError {
	if in.Title == "" {
		return apperrors.New("VALIDATION_ERROR", "title is required", 400)
	}
	if in.Slug == "" {
		return apperrors.New("VALIDATION_ERROR", "slug is required", 400)
	}
	if in.BodyHTML == "" {
		return apperrors.New("VALIDATION_ERROR", "body_html is required", 400)
	}
	return nil
}
func (h *Handlers) CreateArticle(w http.ResponseWriter, r *http.Request) {
	var req articleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	in := req.normalize()
	if err := validateArticleInput(in); err != nil {
		response.Error(w, r, err)
		return
	}
	taken, err := h.Articles.SlugTaken(r.Context(), in.Slug, 0)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if taken {
		response.Error(w, r, apperrors.ErrConflict)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())
	in.AuthorID = &userID
	in.PublishedAt = postgres.ArticlePublishedAt(in.Status, nil)

	id, err := h.Articles.Create(r.Context(), in)
	if err != nil {
		response.Error(w, r, h.MapArticleDBError(err))
		return
	}
	article, err := h.Articles.GetByID(r.Context(), id)
	if err != nil || article == nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	h.AuditArticle(r, "ARTICLE_CREATE", article.ID, nil, article)
	response.JSON(w, r, 201, article)
}
func (h *Handlers) UpdateArticle(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	prev, err := h.Articles.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if prev == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}

	var req articleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	in := req.normalize()
	if err := validateArticleInput(in); err != nil {
		response.Error(w, r, err)
		return
	}
	taken, err := h.Articles.SlugTaken(r.Context(), in.Slug, id)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if taken {
		response.Error(w, r, apperrors.ErrConflict)
		return
	}

	in.AuthorID = prev.AuthorID
	if in.AuthorID == nil {
		userID := middleware.UserIDFromContext(r.Context())
		in.AuthorID = &userID
	}
	in.PublishedAt = postgres.ArticlePublishedAt(in.Status, prev.PublishedAt)

	if err := h.Articles.Update(r.Context(), id, in); err != nil {
		response.Error(w, r, h.MapArticleDBError(err))
		return
	}
	article, err := h.Articles.GetByID(r.Context(), id)
	if err != nil || article == nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	h.AuditArticle(r, "ARTICLE_UPDATE", article.ID, prev, article)
	response.JSON(w, r, 200, article)
}
func (h *Handlers) DeleteArticle(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	prev, err := h.Articles.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if prev == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := h.Articles.Delete(r.Context(), id); err != nil {
		response.Error(w, r, h.MapArticleDBError(err))
		return
	}
	h.AuditArticle(r, "ARTICLE_DELETE", id, prev, nil)
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}
func (h *Handlers) MapArticleDBError(err error) *apperrors.AppError {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return apperrors.ErrConflict
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return apperrors.ErrNotFound
	}
	return apperrors.ErrInternal
}
func (h *Handlers) AuditArticle(r *http.Request, action string, id int64, oldVal, newVal any) {
	var oldJSON, newJSON string
	if oldVal != nil {
		if b, err := json.Marshal(oldVal); err == nil {
			oldJSON = string(b)
		}
	}
	if newVal != nil {
		if b, err := json.Marshal(newVal); err == nil {
			newJSON = string(b)
		}
	}
	actor := middleware.UserIDFromContext(r.Context())
	entityID := id
	_ = h.Audit.Log(r.Context(), &actor, action, "article", &entityID, oldJSON, newJSON, r.RemoteAddr, r.UserAgent())
}
func (h *Handlers) RegisterAdminArticleRoutes(r chi.Router) {
	r.Get("/admin/articles", h.ListArticlesCMS)
	r.Get("/admin/articles/{id}", h.GetArticleCMS)
	r.Post("/admin/articles", h.CreateArticle)
	r.Put("/admin/articles/{id}", h.UpdateArticle)
	r.Delete("/admin/articles/{id}", h.DeleteArticle)
}
func (h *Handlers) RegisterModeratorArticleRoutes(r chi.Router) {
	r.Get("/moderator/articles", h.ListArticlesCMS)
	r.Get("/moderator/articles/{id}", h.GetArticleCMS)
	r.Post("/moderator/articles", h.CreateArticle)
	r.Put("/moderator/articles/{id}", h.UpdateArticle)
	r.Delete("/moderator/articles/{id}", h.DeleteArticle)
}

func articleOwnedBy(article *domain.Article, userID int64) bool {
	return article != nil && article.AuthorID != nil && *article.AuthorID == userID
}

func (h *Handlers) ListMyArticles(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	items, err := h.Articles.ListByAuthor(r.Context(), uid)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.Article{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) GetMyArticle(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	article, err := h.Articles.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if !articleOwnedBy(article, middleware.UserIDFromContext(r.Context())) {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	response.JSON(w, r, 200, article)
}

func (h *Handlers) UpdateMyArticle(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	prev, err := h.Articles.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if !articleOwnedBy(prev, middleware.UserIDFromContext(r.Context())) {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	h.UpdateArticle(w, r)
}

func (h *Handlers) DeleteMyArticle(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	prev, err := h.Articles.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if !articleOwnedBy(prev, middleware.UserIDFromContext(r.Context())) {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	h.DeleteArticle(w, r)
}

func (h *Handlers) RegisterGuideArticleRoutes(r chi.Router) {
	r.Get("/account/guide/articles", h.ListMyArticles)
	r.Get("/account/guide/articles/{id}", h.GetMyArticle)
	r.Post("/account/guide/articles", h.CreateArticle)
	r.Put("/account/guide/articles/{id}", h.UpdateMyArticle)
	r.Delete("/account/guide/articles/{id}", h.DeleteMyArticle)
}
