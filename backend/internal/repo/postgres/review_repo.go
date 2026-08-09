package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type ReviewRepo struct{ db *DB }

func NewReviewRepo(db *DB) *ReviewRepo { return &ReviewRepo{db: db} }

func (r *ReviewRepo) Create(ctx context.Context, guideID, authorID, excursionID int64, rating int, text string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO guide_reviews (guide_id, author_id, excursion_id, rating, text, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
	`, guideID, authorID, excursionID, rating, text, domain.ReviewPending).Scan(&id)
	return id, err
}

func (r *ReviewRepo) GetByID(ctx context.Context, id int64) (*domain.Review, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, guide_id, author_id, rating, text, status, excursion_id
		FROM guide_reviews WHERE id=$1
	`, id)
	var rv domain.Review
	err := row.Scan(&rv.ID, &rv.GuideID, &rv.AuthorID, &rv.Rating, &rv.Text, &rv.Status, &rv.ExcursionID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &rv, nil
}

func (r *ReviewRepo) ListByGuide(ctx context.Context, guideID int64) ([]domain.Review, error) {
	return r.listReviews(ctx, `
		SELECT r.id, r.guide_id, r.author_id, r.rating, r.text, r.status, r.excursion_id,
			COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.login) AS author_name,
			e.title AS excursion_title
		FROM guide_reviews r
		JOIN users u ON u.id = r.author_id
		JOIN excursions e ON e.id = r.excursion_id
		WHERE r.guide_id=$1 AND r.status=$2
		ORDER BY r.id DESC
	`, guideID, domain.ReviewPublished)
}

func (r *ReviewRepo) ListByExcursion(ctx context.Context, excursionID int64) ([]domain.Review, error) {
	return r.listReviews(ctx, `
		SELECT r.id, r.guide_id, r.author_id, r.rating, r.text, r.status, r.excursion_id,
			COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.login) AS author_name,
			e.title AS excursion_title
		FROM guide_reviews r
		JOIN users u ON u.id = r.author_id
		JOIN excursions e ON e.id = r.excursion_id
		WHERE r.excursion_id=$1 AND r.status=$2
		ORDER BY r.id DESC
	`, excursionID, domain.ReviewPublished)
}

func (r *ReviewRepo) listReviews(ctx context.Context, sql string, args ...any) ([]domain.Review, error) {
	rows, err := r.db.Pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Review
	for rows.Next() {
		var rv domain.Review
		if err := rows.Scan(&rv.ID, &rv.GuideID, &rv.AuthorID, &rv.Rating, &rv.Text, &rv.Status, &rv.ExcursionID, &rv.AuthorName, &rv.ExcursionTitle); err != nil {
			return nil, err
		}
		out = append(out, rv)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return out, nil
	}
	ids := make([]int64, len(out))
	for i, rv := range out {
		ids[i] = rv.ID
	}
	comments, err := r.ListCommentsByReviewIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range out {
		out[i].Comments = comments[out[i].ID]
	}
	return out, nil
}

func (r *ReviewRepo) ListCommentsByReviewIDs(ctx context.Context, reviewIDs []int64) (map[int64][]domain.ReviewComment, error) {
	out := make(map[int64][]domain.ReviewComment)
	if len(reviewIDs) == 0 {
		return out, nil
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT c.id, c.review_id, c.author_id, c.text,
			COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.login) AS author_name,
			(gp.user_id = c.author_id) AS is_guide
		FROM review_comments c
		JOIN users u ON u.id = c.author_id
		JOIN guide_reviews r ON r.id = c.review_id
		JOIN guide_profiles gp ON gp.id = r.guide_id
		WHERE c.review_id = ANY($1)
		ORDER BY c.id ASC
	`, reviewIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var c domain.ReviewComment
		if err := rows.Scan(&c.ID, &c.ReviewID, &c.AuthorID, &c.Text, &c.AuthorName, &c.IsGuide); err != nil {
			return nil, err
		}
		out[c.ReviewID] = append(out[c.ReviewID], c)
	}
	return out, rows.Err()
}

func (r *ReviewRepo) SetStatus(ctx context.Context, id int64, status string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE guide_reviews SET status=$2, updated_at=NOW() WHERE id=$1`, id, status)
	return err
}

func (r *ReviewRepo) ListAdmin(ctx context.Context, status string, limit int) ([]domain.Review, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	q := `
		SELECT r.id, r.guide_id, r.author_id, r.rating, r.text, r.status, r.excursion_id,
			COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.login) AS author_name,
			COALESCE(e.title, '') AS excursion_title
		FROM guide_reviews r
		JOIN users u ON u.id = r.author_id
		LEFT JOIN excursions e ON e.id = r.excursion_id`
	args := []any{}
	if status != "" {
		q += ` WHERE r.status=$1`
		args = append(args, status)
	}
	q += ` ORDER BY r.id DESC LIMIT ` + fmt.Sprintf("%d", limit)
	return r.listReviews(ctx, q, args...)
}

func (r *ReviewRepo) RecalcRating(ctx context.Context, guideID int64) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE guide_profiles SET
			rating_avg = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM guide_reviews WHERE guide_id=$1 AND status=$2), 0),
			rating_count = (SELECT COUNT(*) FROM guide_reviews WHERE guide_id=$1 AND status=$2),
			updated_at = NOW()
		WHERE id=$1
	`, guideID, domain.ReviewPublished)
	return err
}

func (r *ReviewRepo) PublishAllPending(ctx context.Context) ([]int64, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT DISTINCT guide_id FROM guide_reviews WHERE status=$1`, domain.ReviewPending)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var guideIDs []int64
	for rows.Next() {
		var gid int64
		if err := rows.Scan(&gid); err != nil {
			return nil, err
		}
		guideIDs = append(guideIDs, gid)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	_, err = r.db.Pool.Exec(ctx, `
		UPDATE guide_reviews SET status=$1, updated_at=NOW() WHERE status=$2
	`, domain.ReviewPublished, domain.ReviewPending)
	return guideIDs, err
}

func (r *ReviewRepo) AddComment(ctx context.Context, reviewID, authorID int64, text string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO review_comments (review_id, author_id, text) VALUES ($1,$2,$3) RETURNING id
	`, reviewID, authorID, text).Scan(&id)
	return id, err
}

func (r *ReviewRepo) GetGuideID(ctx context.Context, reviewID int64) (int64, error) {
	var gid int64
	err := r.db.Pool.QueryRow(ctx, `SELECT guide_id FROM guide_reviews WHERE id=$1`, reviewID).Scan(&gid)
	return gid, err
}

func (r *ReviewRepo) ListByStatus(ctx context.Context, status string) ([]domain.Review, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, guide_id, author_id, rating, text, status FROM guide_reviews WHERE status=$1`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []domain.Review
	for rows.Next() {
		var rv domain.Review
		if err := rows.Scan(&rv.ID, &rv.GuideID, &rv.AuthorID, &rv.Rating, &rv.Text, &rv.Status); err != nil {
			return nil, err
		}
		items = append(items, rv)
	}
	return items, rows.Err()
}
