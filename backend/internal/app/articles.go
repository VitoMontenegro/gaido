package app

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
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

func (a *App) listArticlesPublic(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, err := a.articles.ListPublished(r.Context(), limit, offset)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.ArticleListItem{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) getArticlePublic(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	article, err := a.articles.GetPublishedBySlug(r.Context(), slug)
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

func (a *App) listArticlesCMS(w http.ResponseWriter, r *http.Request) {
	items, err := a.articles.ListAll(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.Article{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (a *App) getArticleCMS(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	article, err := a.articles.GetByID(r.Context(), id)
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

type articleRequest struct {
	Slug          string `json:"slug"`
	Title         string `json:"title"`
	Excerpt       string `json:"excerpt"`
	BodyHTML      string `json:"body_html"`
	CoverImageURL string `json:"cover_image_url"`
	Status        string `json:"status"`
}

func (req *articleRequest) normalize() postgres.ArticleInput {
	title := strings.TrimSpace(req.Title)
	slug := strings.TrimSpace(req.Slug)
	if slug == "" {
		slug = guidesvc.Slugify(title)
	}
	return postgres.ArticleInput{
		Slug:          slug,
		Title:         title,
		Excerpt:       strings.TrimSpace(req.Excerpt),
		BodyHTML:      strings.TrimSpace(req.BodyHTML),
		CoverImageURL: strings.TrimSpace(req.CoverImageURL),
		Status:        postgres.NormalizeArticleStatus(req.Status),
	}
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

func (a *App) createArticle(w http.ResponseWriter, r *http.Request) {
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
	taken, err := a.articles.SlugTaken(r.Context(), in.Slug, 0)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if taken {
		response.Error(w, r, apperrors.ErrConflict)
		return
	}

	userID := userIDFromCtx(r.Context())
	in.AuthorID = &userID
	in.PublishedAt = postgres.ArticlePublishedAt(in.Status, nil)

	id, err := a.articles.Create(r.Context(), in)
	if err != nil {
		response.Error(w, r, a.mapArticleDBError(err))
		return
	}
	article, err := a.articles.GetByID(r.Context(), id)
	if err != nil || article == nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	a.auditArticle(r, "ARTICLE_CREATE", article.ID, nil, article)
	response.JSON(w, r, 201, article)
}

func (a *App) updateArticle(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	prev, err := a.articles.GetByID(r.Context(), id)
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
	taken, err := a.articles.SlugTaken(r.Context(), in.Slug, id)
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
		userID := userIDFromCtx(r.Context())
		in.AuthorID = &userID
	}
	in.PublishedAt = postgres.ArticlePublishedAt(in.Status, prev.PublishedAt)

	if err := a.articles.Update(r.Context(), id, in); err != nil {
		response.Error(w, r, a.mapArticleDBError(err))
		return
	}
	article, err := a.articles.GetByID(r.Context(), id)
	if err != nil || article == nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	a.auditArticle(r, "ARTICLE_UPDATE", article.ID, prev, article)
	response.JSON(w, r, 200, article)
}

func (a *App) deleteArticle(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	prev, err := a.articles.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if prev == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := a.articles.Delete(r.Context(), id); err != nil {
		response.Error(w, r, a.mapArticleDBError(err))
		return
	}
	a.auditArticle(r, "ARTICLE_DELETE", id, prev, nil)
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}

func (a *App) mapArticleDBError(err error) *apperrors.AppError {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return apperrors.ErrConflict
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return apperrors.ErrNotFound
	}
	return apperrors.ErrInternal
}

func (a *App) auditArticle(r *http.Request, action string, id int64, oldVal, newVal any) {
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
	actor := userIDFromCtx(r.Context())
	entityID := id
	_ = a.audit.Log(r.Context(), &actor, action, "article", &entityID, oldJSON, newJSON, r.RemoteAddr, r.UserAgent())
}

func (a *App) registerAdminArticleRoutes(r chi.Router) {
	r.Get("/admin/articles", a.listArticlesCMS)
	r.Get("/admin/articles/{id}", a.getArticleCMS)
	r.Post("/admin/articles", a.createArticle)
	r.Put("/admin/articles/{id}", a.updateArticle)
	r.Delete("/admin/articles/{id}", a.deleteArticle)
}

func (a *App) registerModeratorArticleRoutes(r chi.Router) {
	r.Get("/moderator/articles", a.listArticlesCMS)
	r.Get("/moderator/articles/{id}", a.getArticleCMS)
	r.Post("/moderator/articles", a.createArticle)
	r.Put("/moderator/articles/{id}", a.updateArticle)
	r.Delete("/moderator/articles/{id}", a.deleteArticle)
}
