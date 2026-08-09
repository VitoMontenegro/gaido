package postgres

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type ArticleRepo struct{ db *DB }

func NewArticleRepo(db *DB) *ArticleRepo { return &ArticleRepo{db: db} }

func scanArticle(row pgx.Row) (*domain.Article, error) {
	var a domain.Article
	err := row.Scan(
		&a.ID, &a.Slug, &a.Title, &a.Excerpt, &a.BodyHTML, &a.CoverImageURL,
		&a.Status, &a.AuthorID, &a.PublishedAt, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *ArticleRepo) ListPublished(ctx context.Context, limit, offset int) ([]domain.ArticleListItem, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, slug, title, excerpt, cover_image_url, published_at
		FROM articles
		WHERE status = $1
		ORDER BY published_at DESC NULLS LAST, id DESC
		LIMIT $2 OFFSET $3
	`, domain.ArticlePublished, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.ArticleListItem
	for rows.Next() {
		var item domain.ArticleListItem
		if err := rows.Scan(&item.ID, &item.Slug, &item.Title, &item.Excerpt, &item.CoverImageURL, &item.PublishedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *ArticleRepo) GetPublishedBySlug(ctx context.Context, slug string) (*domain.Article, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, slug, title, excerpt, body_html, cover_image_url, status, author_id, published_at, created_at, updated_at
		FROM articles
		WHERE slug = $1 AND status = $2
	`, slug, domain.ArticlePublished)
	a, err := scanArticle(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return a, err
}

func (r *ArticleRepo) ListAll(ctx context.Context) ([]domain.Article, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, slug, title, excerpt, body_html, cover_image_url, status, author_id, published_at, created_at, updated_at
		FROM articles
		ORDER BY COALESCE(published_at, created_at) DESC, id DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.Article
	for rows.Next() {
		var a domain.Article
		if err := rows.Scan(
			&a.ID, &a.Slug, &a.Title, &a.Excerpt, &a.BodyHTML, &a.CoverImageURL,
			&a.Status, &a.AuthorID, &a.PublishedAt, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *ArticleRepo) GetByID(ctx context.Context, id int64) (*domain.Article, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, slug, title, excerpt, body_html, cover_image_url, status, author_id, published_at, created_at, updated_at
		FROM articles WHERE id = $1
	`, id)
	a, err := scanArticle(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return a, err
}

type ArticleInput struct {
	Slug          string
	Title         string
	Excerpt       string
	BodyHTML      string
	CoverImageURL string
	Status        string
	AuthorID      *int64
	PublishedAt   *time.Time
}

func (r *ArticleRepo) Create(ctx context.Context, in ArticleInput) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO articles (slug, title, excerpt, body_html, cover_image_url, status, author_id, published_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, in.Slug, in.Title, in.Excerpt, in.BodyHTML, in.CoverImageURL, in.Status, in.AuthorID, in.PublishedAt).Scan(&id)
	return id, err
}

func (r *ArticleRepo) Update(ctx context.Context, id int64, in ArticleInput) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE articles
		SET slug = $2, title = $3, excerpt = $4, body_html = $5, cover_image_url = $6,
		    status = $7, author_id = $8, published_at = $9, updated_at = NOW()
		WHERE id = $1
	`, id, in.Slug, in.Title, in.Excerpt, in.BodyHTML, in.CoverImageURL, in.Status, in.AuthorID, in.PublishedAt)
	return err
}

func (r *ArticleRepo) Delete(ctx context.Context, id int64) error {
	tag, err := r.db.Pool.Exec(ctx, `DELETE FROM articles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *ArticleRepo) ReassignAuthor(ctx context.Context, fromID, toID int64) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE articles SET author_id = $2, updated_at = NOW() WHERE author_id = $1
	`, fromID, toID)
	return err
}

func (r *ArticleRepo) AssignAdminToOrphans(ctx context.Context, adminID int64) error {
	if adminID <= 0 {
		return nil
	}
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE articles SET author_id = $1, updated_at = NOW() WHERE author_id IS NULL
	`, adminID)
	return err
}

func (r *ArticleRepo) SetAuthor(ctx context.Context, articleID, authorID int64) error {
	tag, err := r.db.Pool.Exec(ctx, `
		UPDATE articles SET author_id = $2, updated_at = NOW() WHERE id = $1
	`, articleID, authorID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *ArticleRepo) SlugTaken(ctx context.Context, slug string, excludeID int64) (bool, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `SELECT id FROM articles WHERE slug = $1 AND id <> $2`, slug, excludeID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func NormalizeArticleStatus(status string) string {
	switch strings.ToUpper(strings.TrimSpace(status)) {
	case domain.ArticlePublished:
		return domain.ArticlePublished
	default:
		return domain.ArticleDraft
	}
}

func ArticlePublishedAt(status string, existing *time.Time) *time.Time {
	if status != domain.ArticlePublished {
		return nil
	}
	if existing != nil {
		return existing
	}
	now := time.Now().UTC()
	return &now
}
