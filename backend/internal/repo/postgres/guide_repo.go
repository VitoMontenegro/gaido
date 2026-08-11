package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type GuideRepo struct{ db *DB }

func NewGuideRepo(db *DB) *GuideRepo { return &GuideRepo{db: db} }

func (r *GuideRepo) CreateProfile(ctx context.Context, userID int64, guideType, displayName, slug string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO guide_profiles (user_id, guide_type, display_name, website_slug, status)
		VALUES ($1,$2,$3,$4,$5) RETURNING id
	`, userID, guideType, displayName, slug, domain.GuideStatusDraft).Scan(&id)
	return id, err
}

const guideProfileSelect = `id, user_id, guide_type, first_name, last_name, display_name, about, website_slug,
	rating_avg, rating_count, preferred_contact_method, phone, email, telegram, whatsapp, viber, response_hours,
	status, last_shown_at, created_at, avatar_url`

func (r *GuideRepo) GetByUserID(ctx context.Context, userID int64) (*domain.GuideProfile, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT `+guideProfileSelect+` FROM guide_profiles WHERE user_id=$1
	`, userID)
	return scanGuide(row)
}

func (r *GuideRepo) GetBySlug(ctx context.Context, slug string) (*domain.GuideProfile, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT `+guideProfileSelect+` FROM guide_profiles WHERE website_slug=$1
	`, slug)
	return scanGuide(row)
}

func (r *GuideRepo) GetByID(ctx context.Context, id int64) (*domain.GuideProfile, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT `+guideProfileSelect+` FROM guide_profiles WHERE id=$1
	`, id)
	return scanGuide(row)
}

func scanGuide(row pgx.Row) (*domain.GuideProfile, error) {
	var g domain.GuideProfile
	err := row.Scan(&g.ID, &g.UserID, &g.GuideType, &g.FirstName, &g.LastName, &g.DisplayName, &g.About,
		&g.WebsiteSlug, &g.RatingAvg, &g.RatingCount, &g.PreferredContactMethod, &g.Phone, &g.Email,
		&g.Telegram, &g.Whatsapp, &g.Viber, &g.ResponseHours, &g.Status, &g.LastShownAt, &g.CreatedAt, &g.AvatarURL)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &g, err
}

func scanGuideRow(rows pgx.Rows) (domain.GuideProfile, error) {
	var g domain.GuideProfile
	err := rows.Scan(&g.ID, &g.UserID, &g.GuideType, &g.FirstName, &g.LastName, &g.DisplayName, &g.About,
		&g.WebsiteSlug, &g.RatingAvg, &g.RatingCount, &g.PreferredContactMethod, &g.Phone, &g.Email,
		&g.Telegram, &g.Whatsapp, &g.Viber, &g.ResponseHours, &g.Status, &g.LastShownAt, &g.CreatedAt, &g.AvatarURL)
	return g, err
}

func (r *GuideRepo) UpdateProfile(ctx context.Context, g *domain.GuideProfile) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE guide_profiles SET guide_type=$2, first_name=$3, last_name=$4, display_name=$5, about=$6,
			preferred_contact_method=$7, phone=$8, email=$9, telegram=$10, whatsapp=$11, viber=$12, response_hours=$13, status=$14,
			avatar_url=$15, updated_at=NOW()
		WHERE id=$1
	`, g.ID, g.GuideType, g.FirstName, g.LastName, g.DisplayName, g.About, g.PreferredContactMethod,
		g.Phone, g.Email, g.Telegram, g.Whatsapp, g.Viber, g.ResponseHours, g.Status, g.AvatarURL)
	return err
}

func (r *GuideRepo) ListAdmin(ctx context.Context) ([]domain.GuideProfile, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT `+guideProfileSelect+` FROM guide_profiles ORDER BY display_name, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.GuideProfile
	for rows.Next() {
		g, err := scanGuideRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

func (r *GuideRepo) ActivateAllForCatalogFilling(ctx context.Context) (int64, error) {
	tag, err := r.db.Pool.Exec(ctx, `
		UPDATE guide_profiles
		SET status=$1, updated_at=NOW()
		WHERE status IN ($2, $3, $4)
	`, domain.GuideStatusActive, domain.GuideStatusDraft, domain.GuideStatusWaitingPayment, domain.GuideStatusExpired)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func (r *GuideRepo) SetStatus(ctx context.Context, id int64, status string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE guide_profiles SET status=$2, updated_at=NOW() WHERE id=$1`, id, status)
	return err
}

func (r *GuideRepo) AdminDelete(ctx context.Context, id int64) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, `DELETE FROM favorites WHERE target_type = 'GUIDE' AND target_id = $1`, id); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `
		DELETE FROM favorites
		WHERE target_type = 'EXCURSION'
		  AND target_id IN (SELECT id FROM excursions WHERE guide_id = $1)
	`, id); err != nil {
		return err
	}

	tag, err := tx.Exec(ctx, `DELETE FROM guide_profiles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return tx.Commit(ctx)
}

func (r *GuideRepo) ListPublic(ctx context.Context, cityID, countryID *int64, guideType string, limit, offset int) ([]domain.GuideProfile, error) {
	q := `SELECT ` + guideProfileSelect + ` FROM guide_profiles WHERE status=$1`
	args := []any{domain.GuideStatusActive}
	n := 2
	if cityID != nil {
		q += fmt.Sprintf(` AND id IN (
			SELECT guide_id FROM guide_cities WHERE city_id=$%d AND is_active=true
			UNION
			SELECT e.guide_id FROM excursions e WHERE e.city_id=$%d AND e.status='PUBLISHED'
		)`, n, n)
		args = append(args, *cityID)
		n++
	}
	if countryID != nil {
		q += fmt.Sprintf(` AND id IN (
			SELECT gc.guide_id FROM guide_cities gc
			JOIN cities c ON c.id = gc.city_id AND c.is_active=true
			WHERE c.country_id=$%d AND gc.is_active=true
			UNION
			SELECT e.guide_id FROM excursions e
			JOIN cities c ON c.id = e.city_id AND c.is_active=true
			WHERE c.country_id=$%d AND e.status='PUBLISHED'
		)`, n, n)
		args = append(args, *countryID)
		n++
	}
	if guideType != "" {
		q += fmt.Sprintf(` AND guide_type=$%d`, n)
		args = append(args, guideType)
		n++
	}
	q += fmt.Sprintf(` ORDER BY rating_avg DESC, rating_count DESC, last_shown_at ASC NULLS FIRST LIMIT $%d OFFSET $%d`, n, n+1)
	args = append(args, limit, offset)
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.GuideProfile
	for rows.Next() {
		g, err := scanGuideRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

func (r *GuideRepo) ListTopRated(ctx context.Context, limit int, exclude []int64) ([]domain.GuideProfile, error) {
	q := `SELECT ` + guideProfileSelect + ` FROM guide_profiles WHERE status=$1 AND rating_count > 0`
	args := []any{domain.GuideStatusActive}
	n := 2
	if len(exclude) > 0 {
		q += fmt.Sprintf(` AND NOT (id = ANY($%d))`, n)
		args = append(args, exclude)
		n++
	}
	q += fmt.Sprintf(` ORDER BY rating_avg DESC, rating_count DESC LIMIT $%d`, n)
	args = append(args, limit)
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.GuideProfile
	for rows.Next() {
		g, err := scanGuideRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

func (r *GuideRepo) ListPublicRandom(ctx context.Context, limit int, exclude []int64) ([]domain.GuideProfile, error) {
	q := `SELECT ` + guideProfileSelect + ` FROM guide_profiles WHERE status=$1`
	args := []any{domain.GuideStatusActive}
	n := 2
	if len(exclude) > 0 {
		q += fmt.Sprintf(` AND NOT (id = ANY($%d))`, n)
		args = append(args, exclude)
		n++
	}
	q += fmt.Sprintf(` ORDER BY RANDOM() LIMIT $%d`, n)
	args = append(args, limit)
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.GuideProfile
	for rows.Next() {
		g, err := scanGuideRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

func (r *GuideRepo) TouchShown(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.db.Pool.Exec(ctx, `UPDATE guide_profiles SET last_shown_at=NOW() WHERE id = ANY($1)`, ids)
	return err
}

func (r *GuideRepo) HasDocument(ctx context.Context, guideID int64, docType string) (bool, error) {
	var exists bool
	err := r.db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM guide_documents WHERE guide_id=$1 AND type=$2)`, guideID, docType).Scan(&exists)
	return exists, err
}

func (r *GuideRepo) DeleteDocumentByType(ctx context.Context, guideID int64, docType string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM guide_documents WHERE guide_id=$1 AND type=$2`, guideID, docType)
	return err
}

func (r *GuideRepo) DeleteLicenseDocuments(ctx context.Context, guideID int64) error {
	_, err := r.db.Pool.Exec(ctx, `
		DELETE FROM guide_documents
		WHERE guide_id=$1 AND type IN ($2, $3)
	`, guideID, domain.DocTypeGuideLicense, domain.DocTypeEntertainerLicense)
	return err
}

func (r *GuideRepo) AddDocument(ctx context.Context, guideID int64, docType, key, mime string, size int64, checksum string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM guide_documents WHERE guide_id=$1 AND type=$2`, guideID, docType)
	if err != nil {
		return err
	}
	_, err = r.db.Pool.Exec(ctx, `
		INSERT INTO guide_documents (guide_id, type, storage_key, mime_type, size, checksum) VALUES ($1,$2,$3,$4,$5,$6)
	`, guideID, docType, key, mime, size, checksum)
	return err
}

func (r *GuideRepo) ListDocuments(ctx context.Context, guideID int64) ([]domain.GuideDocument, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id, guide_id, type, storage_key, mime_type, size, checksum FROM guide_documents WHERE guide_id=$1`, guideID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.GuideDocument
	for rows.Next() {
		var d domain.GuideDocument
		if err := rows.Scan(&d.ID, &d.GuideID, &d.Type, &d.StorageKey, &d.MimeType, &d.Size, &d.Checksum); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *GuideRepo) ListDocumentsForModeration(ctx context.Context, limit int) ([]domain.GuideDocumentModerationItem, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT d.id, d.guide_id, g.display_name, g.status, g.guide_type,
		       d.type, d.mime_type, d.size, d.created_at
		FROM guide_documents d
		JOIN guide_profiles g ON g.id = d.guide_id
		ORDER BY d.created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.GuideDocumentModerationItem
	for rows.Next() {
		var item domain.GuideDocumentModerationItem
		var uploadedAt time.Time
		if err := rows.Scan(
			&item.ID, &item.GuideID, &item.GuideName, &item.GuideStatus, &item.GuideType,
			&item.Type, &item.MimeType, &item.Size, &uploadedAt,
		); err != nil {
			return nil, err
		}
		item.UploadedAt = uploadedAt.UTC().Format(time.RFC3339)
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *GuideRepo) AddCity(ctx context.Context, guideID, cityID int64, primary bool) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO guide_cities (guide_id, city_id, is_primary) VALUES ($1,$2,$3)
		ON CONFLICT (guide_id, city_id) DO UPDATE SET is_active=true, is_primary=EXCLUDED.is_primary
	`, guideID, cityID, primary)
	return err
}
