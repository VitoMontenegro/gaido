package postgres

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type ForumRepo struct{ db *DB }

func NewForumRepo(db *DB) *ForumRepo { return &ForumRepo{db: db} }

const forumAuthorSelect = `
	NULLIF(TRIM(COALESCE(NULLIF(gp.display_name, ''), NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.login)), ''),
	` + authorAvatarSQL + `,
	CASE WHEN gp.status = 'ACTIVE' AND COALESCE(gp.website_slug, '') <> '' THEN gp.website_slug ELSE NULL END
`

func forumAuthorFromScan(display, avatar, slug *string) *domain.ForumAuthor {
	name := ""
	if display != nil {
		name = strings.TrimSpace(*display)
	}
	if name == "" {
		return nil
	}
	out := &domain.ForumAuthor{DisplayName: name}
	if avatar != nil {
		out.AvatarURL = strings.TrimSpace(*avatar)
	}
	if slug != nil {
		out.GuideSlug = strings.TrimSpace(*slug)
	}
	return out
}

func (r *ForumRepo) List(ctx context.Context) ([]domain.Forum, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT f.id, f.slug, f.title, f.description, f.audience,
		       f.topic_count, f.post_count, f.last_post_at,
		       t.id, t.title, p.created_at,
		`+forumAuthorSelect+`
		FROM forums f
		LEFT JOIN forum_posts p ON p.id = f.last_post_id
		LEFT JOIN forum_topics t ON t.id = p.topic_id
		LEFT JOIN users u ON u.id = p.author_id
		LEFT JOIN guide_profiles gp ON gp.user_id = p.author_id
		ORDER BY f.id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Forum
	for rows.Next() {
		f, err := scanForum(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (r *ForumRepo) GetBySlug(ctx context.Context, slug string) (*domain.Forum, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT f.id, f.slug, f.title, f.description, f.audience,
		       f.topic_count, f.post_count, f.last_post_at,
		       t.id, t.title, p.created_at,
		`+forumAuthorSelect+`
		FROM forums f
		LEFT JOIN forum_posts p ON p.id = f.last_post_id
		LEFT JOIN forum_topics t ON t.id = p.topic_id
		LEFT JOIN users u ON u.id = p.author_id
		LEFT JOIN guide_profiles gp ON gp.user_id = p.author_id
		WHERE f.slug = $1
	`, slug)
	f, err := scanForum(row)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func scanForum(row pgx.Row) (domain.Forum, error) {
	var f domain.Forum
	var lastTopicID *int64
	var lastTopicTitle *string
	var lastCreated *time.Time
	var display, avatar, slug *string
	err := row.Scan(
		&f.ID, &f.Slug, &f.Title, &f.Description, &f.Audience,
		&f.TopicCount, &f.PostCount, &f.LastPostAt,
		&lastTopicID, &lastTopicTitle, &lastCreated,
		&display, &avatar, &slug,
	)
	if err != nil {
		return f, err
	}
	if lastTopicID != nil && lastTopicTitle != nil && lastCreated != nil {
		f.LastPost = &domain.ForumLastPost{
			TopicID:    *lastTopicID,
			TopicTitle: *lastTopicTitle,
			Author:     forumAuthorFromScan(display, avatar, slug),
			CreatedAt:  *lastCreated,
		}
	}
	return f, nil
}

func (r *ForumRepo) ListTopics(ctx context.Context, forumID int64, limit, offset int) ([]domain.ForumTopic, error) {
	if limit <= 0 || limit > 50 {
		limit = 30
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT t.id, t.forum_id, f.slug, f.title, f.audience,
		       t.title, t.author_id, t.post_count, t.last_post_at, t.created_at,
		       NULLIF(TRIM(COALESCE(NULLIF(gp.display_name, ''), NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.login)), ''),
		       `+authorAvatarSQL+`,
		       CASE WHEN gp.status = 'ACTIVE' AND COALESCE(gp.website_slug, '') <> '' THEN gp.website_slug ELSE NULL END,
		       NULLIF(TRIM(COALESCE(NULLIF(lgp.display_name, ''), NULLIF(TRIM(CONCAT(lu.first_name, ' ', lu.last_name)), ''), lu.login)), ''),
		       `+lastAuthorAvatarSQL+`,
		       CASE WHEN lgp.status = 'ACTIVE' AND COALESCE(lgp.website_slug, '') <> '' THEN lgp.website_slug ELSE NULL END
		FROM forum_topics t
		JOIN forums f ON f.id = t.forum_id
		JOIN users u ON u.id = t.author_id
		LEFT JOIN guide_profiles gp ON gp.user_id = t.author_id
		LEFT JOIN forum_posts lp ON lp.id = t.last_post_id
		LEFT JOIN users lu ON lu.id = lp.author_id
		LEFT JOIN guide_profiles lgp ON lgp.user_id = lp.author_id
		WHERE t.forum_id = $1
		ORDER BY t.last_post_at DESC NULLS LAST, t.id DESC
		LIMIT $2 OFFSET $3
	`, forumID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.ForumTopic
	for rows.Next() {
		t, err := scanTopic(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *ForumRepo) ListRecentPublicTopics(ctx context.Context, limit int) ([]domain.ForumTopic, error) {
	if limit <= 0 || limit > 20 {
		limit = 8
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT t.id, t.forum_id, f.slug, f.title, f.audience,
		       t.title, t.author_id, t.post_count, t.last_post_at, t.created_at,
		       NULLIF(TRIM(COALESCE(NULLIF(gp.display_name, ''), NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.login)), ''),
		       `+authorAvatarSQL+`,
		       CASE WHEN gp.status = 'ACTIVE' AND COALESCE(gp.website_slug, '') <> '' THEN gp.website_slug ELSE NULL END,
		       NULLIF(TRIM(COALESCE(NULLIF(lgp.display_name, ''), NULLIF(TRIM(CONCAT(lu.first_name, ' ', lu.last_name)), ''), lu.login)), ''),
		       `+lastAuthorAvatarSQL+`,
		       CASE WHEN lgp.status = 'ACTIVE' AND COALESCE(lgp.website_slug, '') <> '' THEN lgp.website_slug ELSE NULL END
		FROM forum_topics t
		JOIN forums f ON f.id = t.forum_id
		JOIN users u ON u.id = t.author_id
		LEFT JOIN guide_profiles gp ON gp.user_id = t.author_id
		LEFT JOIN forum_posts lp ON lp.id = t.last_post_id
		LEFT JOIN users lu ON lu.id = lp.author_id
		LEFT JOIN guide_profiles lgp ON lgp.user_id = lp.author_id
		WHERE f.audience = $1
		ORDER BY t.last_post_at DESC NULLS LAST, t.id DESC
		LIMIT $2
	`, domain.ForumAudiencePublic, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.ForumTopic
	for rows.Next() {
		t, err := scanTopic(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	if out == nil {
		out = []domain.ForumTopic{}
	}
	return out, rows.Err()
}

func (r *ForumRepo) GetTopic(ctx context.Context, id int64) (*domain.ForumTopic, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT t.id, t.forum_id, f.slug, f.title, f.audience,
		       t.title, t.author_id, t.post_count, t.last_post_at, t.created_at,
		       NULLIF(TRIM(COALESCE(NULLIF(gp.display_name, ''), NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.login)), ''),
		       `+authorAvatarSQL+`,
		       CASE WHEN gp.status = 'ACTIVE' AND COALESCE(gp.website_slug, '') <> '' THEN gp.website_slug ELSE NULL END,
		       NULLIF(TRIM(COALESCE(NULLIF(lgp.display_name, ''), NULLIF(TRIM(CONCAT(lu.first_name, ' ', lu.last_name)), ''), lu.login)), ''),
		       `+lastAuthorAvatarSQL+`,
		       CASE WHEN lgp.status = 'ACTIVE' AND COALESCE(lgp.website_slug, '') <> '' THEN lgp.website_slug ELSE NULL END
		FROM forum_topics t
		JOIN forums f ON f.id = t.forum_id
		JOIN users u ON u.id = t.author_id
		LEFT JOIN guide_profiles gp ON gp.user_id = t.author_id
		LEFT JOIN forum_posts lp ON lp.id = t.last_post_id
		LEFT JOIN users lu ON lu.id = lp.author_id
		LEFT JOIN guide_profiles lgp ON lgp.user_id = lp.author_id
		WHERE t.id = $1
	`, id)
	t, err := scanTopic(row)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func scanTopic(row pgx.Row) (domain.ForumTopic, error) {
	var t domain.ForumTopic
	var display, avatar, slug *string
	var lastDisplay, lastAvatar, lastSlug *string
	err := row.Scan(
		&t.ID, &t.ForumID, &t.ForumSlug, &t.ForumTitle, &t.ForumAudience,
		&t.Title, &t.AuthorID, &t.PostCount, &t.LastPostAt, &t.CreatedAt,
		&display, &avatar, &slug,
		&lastDisplay, &lastAvatar, &lastSlug,
	)
	if err != nil {
		return t, err
	}
	t.Author = forumAuthorFromScan(display, avatar, slug)
	t.LastAuthor = forumAuthorFromScan(lastDisplay, lastAvatar, lastSlug)
	return t, nil
}

func (r *ForumRepo) ListPostsAfter(ctx context.Context, topicID, after int64, limit int) ([]domain.ForumPost, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT p.id, p.topic_id, p.author_id, p.body, p.created_at,
		`+forumAuthorSelect+`
		FROM forum_posts p
		JOIN users u ON u.id = p.author_id
		LEFT JOIN guide_profiles gp ON gp.user_id = p.author_id
		WHERE p.topic_id = $1 AND p.id > $2
		ORDER BY p.id ASC
		LIMIT $3
	`, topicID, after, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.ForumPost
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []domain.ForumPost{}
	}
	return out, rows.Err()
}

func scanPost(row pgx.Row) (domain.ForumPost, error) {
	var p domain.ForumPost
	var display, avatar, slug *string
	err := row.Scan(&p.ID, &p.TopicID, &p.AuthorID, &p.Body, &p.CreatedAt, &display, &avatar, &slug)
	if err != nil {
		return p, err
	}
	p.Author = forumAuthorFromScan(display, avatar, slug)
	return p, nil
}

func (r *ForumRepo) GetPost(ctx context.Context, id int64) (*domain.ForumPost, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT p.id, p.topic_id, p.author_id, p.body, p.created_at,
		`+forumAuthorSelect+`
		FROM forum_posts p
		JOIN users u ON u.id = p.author_id
		LEFT JOIN guide_profiles gp ON gp.user_id = p.author_id
		WHERE p.id = $1
	`, id)
	p, err := scanPost(row)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ForumRepo) CreateTopic(ctx context.Context, forumID, authorID int64, title, body string) (*domain.ForumTopic, *domain.ForumPost, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	var topicID int64
	if err = tx.QueryRow(ctx, `
		INSERT INTO forum_topics (forum_id, title, author_id)
		VALUES ($1, $2, $3)
		RETURNING id
	`, forumID, title, authorID).Scan(&topicID); err != nil {
		return nil, nil, err
	}

	var postID int64
	var postAt time.Time
	if err = tx.QueryRow(ctx, `
		INSERT INTO forum_posts (topic_id, author_id, body)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`, topicID, authorID, body).Scan(&postID, &postAt); err != nil {
		return nil, nil, err
	}

	if _, err = tx.Exec(ctx, `
		UPDATE forum_topics
		SET post_count = 1, last_post_id = $1, last_post_at = $2
		WHERE id = $3
	`, postID, postAt, topicID); err != nil {
		return nil, nil, err
	}
	if _, err = tx.Exec(ctx, `
		UPDATE forums
		SET topic_count = topic_count + 1, post_count = post_count + 1,
		    last_post_id = $1, last_post_at = $2
		WHERE id = $3
	`, postID, postAt, forumID); err != nil {
		return nil, nil, err
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, nil, err
	}

	topic, err := r.GetTopic(ctx, topicID)
	if err != nil {
		return nil, nil, err
	}
	post, err := r.GetPost(ctx, postID)
	if err != nil {
		return topic, &domain.ForumPost{ID: postID, TopicID: topicID, AuthorID: authorID, Body: body, CreatedAt: postAt}, err
	}
	return topic, post, nil
}

func (r *ForumRepo) CreatePost(ctx context.Context, topicID, forumID, authorID int64, body string) (*domain.ForumPost, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var postID int64
	var createdAt time.Time
	if err = tx.QueryRow(ctx, `
		INSERT INTO forum_posts (topic_id, author_id, body)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`, topicID, authorID, body).Scan(&postID, &createdAt); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(ctx, `
		UPDATE forum_topics
		SET post_count = post_count + 1, last_post_id = $1, last_post_at = $2
		WHERE id = $3
	`, postID, createdAt, topicID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(ctx, `
		UPDATE forums
		SET post_count = post_count + 1, last_post_id = $1, last_post_at = $2
		WHERE id = $3
	`, postID, createdAt, forumID); err != nil {
		return nil, err
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	post, err := r.GetPost(ctx, postID)
	if err != nil {
		return &domain.ForumPost{ID: postID, TopicID: topicID, AuthorID: authorID, Body: body, CreatedAt: createdAt}, err
	}
	return post, nil
}

func (r *ForumRepo) ListPublicSlugs(ctx context.Context) ([]string, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT slug FROM forums WHERE audience = $1 ORDER BY id
	`, domain.ForumAudiencePublic)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			return nil, err
		}
		out = append(out, slug)
	}
	return out, rows.Err()
}
