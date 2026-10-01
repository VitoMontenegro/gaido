package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type NewsRepo struct{ db *DB }

func NewNewsRepo(db *DB) *NewsRepo { return &NewsRepo{db: db} }

func (r *NewsRepo) ListEnabledFeeds(ctx context.Context) ([]domain.NewsFeed, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, url, title, enabled FROM news_feeds WHERE enabled = TRUE ORDER BY id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.NewsFeed
	for rows.Next() {
		var f domain.NewsFeed
		if err := rows.Scan(&f.ID, &f.URL, &f.Title, &f.Enabled); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (r *NewsRepo) UpsertFeed(ctx context.Context, url, title string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO news_feeds (url, title) VALUES ($1, $2)
		ON CONFLICT (url) DO UPDATE SET title = CASE WHEN EXCLUDED.title <> '' THEN EXCLUDED.title ELSE news_feeds.title END
	`, url, title)
	return err
}

func (r *NewsRepo) CountPublishedSince(ctx context.Context, since time.Time) (int, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM news_items WHERE status = $1 AND created_at >= $2
	`, domain.NewsPublished, since).Scan(&n)
	return n, err
}

func (r *NewsRepo) Seen(ctx context.Context, guid, sourceURL string) (bool, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT 1 FROM news_items
		WHERE source_guid = $1 OR ($2 <> '' AND source_url = $2)
		LIMIT 1
	`, guid, sourceURL).Scan(&n)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (r *NewsRepo) Insert(ctx context.Context, item domain.NewsItem) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO news_items (feed_id, source_guid, source_url, source_title, status, skip_reason, article_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (feed_id, source_guid) DO NOTHING
	`, item.FeedID, item.SourceGUID, item.SourceURL, item.SourceTitle, item.Status, item.SkipReason, item.ArticleID)
	return err
}

func (r *NewsRepo) PublishArticle(ctx context.Context, item domain.NewsItem, in ArticleInput) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var articleID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO articles (slug, title, excerpt, body_html, cover_image_url, status, author_id, published_at, kind)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`, in.Slug, in.Title, in.Excerpt, in.BodyHTML, in.CoverImageURL, in.Status, in.AuthorID, in.PublishedAt, NormalizeArticleKind(in.Kind)).Scan(&articleID)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO news_items (feed_id, source_guid, source_url, source_title, status, skip_reason, article_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, item.FeedID, item.SourceGUID, item.SourceURL, item.SourceTitle, domain.NewsPublished, "", articleID)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
