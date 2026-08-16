package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type ReviewRepo struct{ db *DB }

func NewReviewRepo(db *DB) *ReviewRepo { return &ReviewRepo{db: db} }

const reviewListSelect = `
	SELECT r.id, r.guide_id, r.author_id, r.rating, r.text, r.status, r.excursion_id,
		r.created_at,
		COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.login) AS author_name,
		COALESCE(e.title, '') AS excursion_title
	FROM guide_reviews r
	JOIN users u ON u.id = r.author_id
	LEFT JOIN excursions e ON e.id = r.excursion_id`

func (r *ReviewRepo) Create(ctx context.Context, guideID, authorID, excursionID int64, rating int, text string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO guide_reviews (guide_id, author_id, excursion_id, rating, text, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
	`, guideID, authorID, excursionID, rating, text, domain.ReviewPending).Scan(&id)
	return id, err
}

func (r *ReviewRepo) SavePhotos(ctx context.Context, reviewID int64, keys []string) error {
	if len(keys) == 0 {
		return nil
	}
	for i, key := range keys {
		if _, err := r.db.Pool.Exec(ctx, `
			INSERT INTO review_photos (review_id, public_key, sort_order) VALUES ($1,$2,$3)
		`, reviewID, key, i); err != nil {
			return err
		}
	}
	return nil
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

func (r *ReviewRepo) CountByGuide(ctx context.Context, guideID int64) (int, error) {
	var total int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM guide_reviews WHERE guide_id=$1 AND status=$2
	`, guideID, domain.ReviewPublished).Scan(&total)
	return total, err
}

func (r *ReviewRepo) GuideRatingStats(ctx context.Context, guideID int64) (avg float64, count int, err error) {
	err = r.db.Pool.QueryRow(ctx, `
		SELECT COALESCE(AVG(rating)::float8, 0), COUNT(*)::int
		FROM guide_reviews
		WHERE guide_id=$1 AND status=$2
	`, guideID, domain.ReviewPublished).Scan(&avg, &count)
	return avg, count, err
}

func (r *ReviewRepo) CountByExcursion(ctx context.Context, excursionID int64) (int, error) {
	var total int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM guide_reviews WHERE excursion_id=$1 AND status=$2
	`, excursionID, domain.ReviewPublished).Scan(&total)
	return total, err
}

func (r *ReviewRepo) ListByGuide(ctx context.Context, guideID int64, limit, offset int) ([]domain.Review, error) {
	return r.listReviews(ctx, reviewListSelect+`
		WHERE r.guide_id=$1 AND r.status=$2
		ORDER BY r.id DESC
		LIMIT $3 OFFSET $4
	`, guideID, domain.ReviewPublished, limit, offset)
}

func (r *ReviewRepo) ListByExcursion(ctx context.Context, excursionID int64, limit, offset int) ([]domain.Review, error) {
	return r.listReviews(ctx, reviewListSelect+`
		WHERE r.excursion_id=$1 AND r.status=$2
		ORDER BY r.id DESC
		LIMIT $3 OFFSET $4
	`, excursionID, domain.ReviewPublished, limit, offset)
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
		var createdAt time.Time
		if err := rows.Scan(&rv.ID, &rv.GuideID, &rv.AuthorID, &rv.Rating, &rv.Text, &rv.Status, &rv.ExcursionID, &createdAt, &rv.AuthorName, &rv.ExcursionTitle); err != nil {
			return nil, err
		}
		rv.CreatedAt = createdAt.UTC().Format(time.RFC3339)
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
	photos, err := r.ListPhotosByReviewIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	disputes, err := r.ListDisputesByReviewIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range out {
		out[i].Comments = comments[out[i].ID]
		out[i].Photos = photos[out[i].ID]
		out[i].Dispute = disputes[out[i].ID]
	}
	return out, nil
}

func (r *ReviewRepo) ListPhotosByReviewIDs(ctx context.Context, reviewIDs []int64) (map[int64][]string, error) {
	out := make(map[int64][]string)
	if len(reviewIDs) == 0 {
		return out, nil
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT review_id, public_key
		FROM review_photos
		WHERE review_id = ANY($1)
		ORDER BY review_id, sort_order ASC, id ASC
	`, reviewIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var reviewID int64
		var key string
		if err := rows.Scan(&reviewID, &key); err != nil {
			return nil, err
		}
		out[reviewID] = append(out[reviewID], key)
	}
	return out, rows.Err()
}

func (r *ReviewRepo) CountPhotosByExcursion(ctx context.Context, excursionID int64) (int, error) {
	var total int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM review_photos p
		JOIN guide_reviews r ON r.id = p.review_id
		WHERE r.excursion_id = $1 AND r.status = $2
	`, excursionID, domain.ReviewPublished).Scan(&total)
	return total, err
}

func (r *ReviewRepo) CountPhotosByGuide(ctx context.Context, guideID int64) (int, error) {
	var total int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM review_photos p
		JOIN guide_reviews r ON r.id = p.review_id
		WHERE r.guide_id = $1 AND r.status = $2
	`, guideID, domain.ReviewPublished).Scan(&total)
	return total, err
}

func (r *ReviewRepo) ListPhotosByExcursion(ctx context.Context, excursionID int64, limit, offset int) ([]domain.ReviewPhotoItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT p.public_key, p.review_id
		FROM review_photos p
		JOIN guide_reviews r ON r.id = p.review_id
		WHERE r.excursion_id = $1 AND r.status = $2
		ORDER BY r.id DESC, p.sort_order ASC, p.id ASC
		LIMIT $3 OFFSET $4
	`, excursionID, domain.ReviewPublished, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanReviewPhotoItems(rows)
}

func (r *ReviewRepo) ListPhotosByGuide(ctx context.Context, guideID int64, limit, offset int) ([]domain.ReviewPhotoItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT p.public_key, p.review_id
		FROM review_photos p
		JOIN guide_reviews r ON r.id = p.review_id
		WHERE r.guide_id = $1 AND r.status = $2
		ORDER BY r.id DESC, p.sort_order ASC, p.id ASC
		LIMIT $3 OFFSET $4
	`, guideID, domain.ReviewPublished, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanReviewPhotoItems(rows)
}

func scanReviewPhotoItems(rows pgx.Rows) ([]domain.ReviewPhotoItem, error) {
	var out []domain.ReviewPhotoItem
	for rows.Next() {
		var item domain.ReviewPhotoItem
		if err := rows.Scan(&item.PublicKey, &item.ReviewID); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
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
	q := reviewListSelect
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

func (r *ReviewRepo) Delete(ctx context.Context, id int64) (guideID int64, err error) {
	err = r.db.Pool.QueryRow(ctx, `DELETE FROM guide_reviews WHERE id=$1 RETURNING guide_id`, id).Scan(&guideID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, pgx.ErrNoRows
	}
	return guideID, err
}

func (r *ReviewRepo) CreateDispute(ctx context.Context, reviewID, guideID int64, text string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO review_disputes (review_id, guide_id, text, status) VALUES ($1,$2,$3,$4) RETURNING id
	`, reviewID, guideID, text, domain.ReviewDisputeOpen).Scan(&id)
	return id, err
}

func (r *ReviewRepo) CountOpenDisputes(ctx context.Context) (int, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM review_disputes WHERE status=$1
	`, domain.ReviewDisputeOpen).Scan(&n)
	return n, err
}

func (r *ReviewRepo) ListDisputesByReviewIDs(ctx context.Context, reviewIDs []int64) (map[int64]*domain.ReviewDispute, error) {
	out := make(map[int64]*domain.ReviewDispute)
	if len(reviewIDs) == 0 {
		return out, nil
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, review_id, text, status, created_at
		FROM review_disputes
		WHERE review_id = ANY($1)
	`, reviewIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var d domain.ReviewDispute
		var reviewID int64
		var createdAt time.Time
		if err := rows.Scan(&d.ID, &reviewID, &d.Text, &d.Status, &createdAt); err != nil {
			return nil, err
		}
		d.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		out[reviewID] = &d
	}
	return out, rows.Err()
}
