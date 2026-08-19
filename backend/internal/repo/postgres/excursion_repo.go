package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type ExcursionRepo struct{ db *DB }

func NewExcursionRepo(db *DB) *ExcursionRepo { return &ExcursionRepo{db: db} }

const excursionSelectCols = `id, guide_id, city_id, category_id, title, slug, description, type, max_guests, price_from, currency, status,
duration_minutes, transport_mode, children_allowed, language, organizational_details, meeting_point,
cover_image_url, body_html, map_embed_url, included_items, excluded_items, structured_content`

const excursionSelectColsAliased = `e.id, e.guide_id, e.city_id, e.category_id, e.title, e.slug, e.description, e.type, e.max_guests, e.price_from, e.currency, e.status,
	e.duration_minutes, e.transport_mode, e.children_allowed, e.language, e.organizational_details, e.meeting_point,
	e.cover_image_url, e.body_html, e.map_embed_url, e.included_items, e.excluded_items, e.structured_content`

const excursionReviewRatingCols = `,
COALESCE((SELECT AVG(r.rating)::float8 FROM guide_reviews r WHERE r.excursion_id=e.id AND r.status='PUBLISHED'), 0),
COALESCE((SELECT COUNT(*)::int FROM guide_reviews r WHERE r.excursion_id=e.id AND r.status='PUBLISHED'), 0)`

const excursionCityCols = `COALESCE(c.name, '') AS city_name, COALESCE(c.slug, '') AS city_slug`

func marshalStringSlice(v []string) []byte {
	if v == nil {
		v = []string{}
	}
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("[]")
	}
	return b
}

func unmarshalStringSlice(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal(raw, &out); err != nil || out == nil {
		return []string{}
	}
	return out
}

func marshalStructuredContent(v domain.ExcursionStructuredContent) []byte {
	if v.Gallery == nil {
		v.Gallery = []string{}
	}
	if v.RouteStops == nil {
		v.RouteStops = []string{}
	}
	if v.PhotoLocations == nil {
		v.PhotoLocations = []string{}
	}
	if v.ComfortItems == nil {
		v.ComfortItems = []domain.ExcursionComfortItem{}
	}
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("{}")
	}
	return b
}

func unmarshalStructuredContent(raw []byte) domain.ExcursionStructuredContent {
	if len(raw) == 0 {
		return domain.ExcursionStructuredContent{}
	}
	var out domain.ExcursionStructuredContent
	if err := json.Unmarshal(raw, &out); err != nil {
		return domain.ExcursionStructuredContent{}
	}
	if out.Gallery == nil {
		out.Gallery = []string{}
	}
	if out.RouteStops == nil {
		out.RouteStops = []string{}
	}
	if out.PhotoLocations == nil {
		out.PhotoLocations = []string{}
	}
	if out.ComfortItems == nil {
		out.ComfortItems = []domain.ExcursionComfortItem{}
	}
	return out
}

func scanExcursionFields(e *domain.Excursion, row pgx.Row) error {
	var includedRaw, excludedRaw, structuredRaw []byte
	err := row.Scan(
		&e.ID, &e.GuideID, &e.CityID, &e.CategoryID, &e.Title, &e.Slug, &e.Description, &e.Type, &e.MaxGuests, &e.PriceFrom, &e.Currency, &e.Status,
		&e.DurationMinutes, &e.TransportMode, &e.ChildrenAllowed, &e.Language, &e.OrganizationalDetails, &e.MeetingPoint,
		&e.CoverImageURL, &e.BodyHTML, &e.MapEmbedURL, &includedRaw, &excludedRaw, &structuredRaw,
	)
	if err != nil {
		return err
	}
	e.IncludedItems = unmarshalStringSlice(includedRaw)
	e.ExcludedItems = unmarshalStringSlice(excludedRaw)
	e.StructuredContent = unmarshalStructuredContent(structuredRaw)
	return nil
}

func scanExcursionViewFields(v *domain.ExcursionView, row pgx.Row, withGuide, withRating bool) error {
	var includedRaw, excludedRaw, structuredRaw []byte
	var err error
	if withGuide {
		if withRating {
			err = row.Scan(
				&v.ID, &v.GuideID, &v.CityID, &v.CategoryID, &v.Title, &v.Slug, &v.Description, &v.Type, &v.MaxGuests, &v.PriceFrom, &v.Currency, &v.Status,
				&v.DurationMinutes, &v.TransportMode, &v.ChildrenAllowed, &v.Language, &v.OrganizationalDetails, &v.MeetingPoint,
				&v.CoverImageURL, &v.BodyHTML, &v.MapEmbedURL, &includedRaw, &excludedRaw, &structuredRaw,
				&v.CityName, &v.CitySlug, &v.GuideName, &v.GuideSlug, &v.GuideAvatarURL, &v.RatingAvg, &v.RatingCount,
			)
		} else {
			err = row.Scan(
				&v.ID, &v.GuideID, &v.CityID, &v.CategoryID, &v.Title, &v.Slug, &v.Description, &v.Type, &v.MaxGuests, &v.PriceFrom, &v.Currency, &v.Status,
				&v.DurationMinutes, &v.TransportMode, &v.ChildrenAllowed, &v.Language, &v.OrganizationalDetails, &v.MeetingPoint,
				&v.CoverImageURL, &v.BodyHTML, &v.MapEmbedURL, &includedRaw, &excludedRaw, &structuredRaw,
				&v.CityName, &v.CitySlug, &v.GuideName, &v.GuideSlug, &v.GuideAvatarURL,
			)
		}
	} else if withRating {
		err = row.Scan(
			&v.ID, &v.GuideID, &v.CityID, &v.CategoryID, &v.Title, &v.Slug, &v.Description, &v.Type, &v.MaxGuests, &v.PriceFrom, &v.Currency, &v.Status,
			&v.DurationMinutes, &v.TransportMode, &v.ChildrenAllowed, &v.Language, &v.OrganizationalDetails, &v.MeetingPoint,
			&v.CoverImageURL, &v.BodyHTML, &v.MapEmbedURL, &includedRaw, &excludedRaw, &structuredRaw,
			&v.CityName, &v.CitySlug, &v.RatingAvg, &v.RatingCount,
		)
	} else {
		err = row.Scan(
			&v.ID, &v.GuideID, &v.CityID, &v.CategoryID, &v.Title, &v.Slug, &v.Description, &v.Type, &v.MaxGuests, &v.PriceFrom, &v.Currency, &v.Status,
			&v.DurationMinutes, &v.TransportMode, &v.ChildrenAllowed, &v.Language, &v.OrganizationalDetails, &v.MeetingPoint,
			&v.CoverImageURL, &v.BodyHTML, &v.MapEmbedURL, &includedRaw, &excludedRaw, &structuredRaw,
			&v.CityName, &v.CitySlug,
		)
	}
	if err != nil {
		return err
	}
	v.IncludedItems = unmarshalStringSlice(includedRaw)
	v.ExcludedItems = unmarshalStringSlice(excludedRaw)
	v.StructuredContent = unmarshalStructuredContent(structuredRaw)
	return nil
}

func (r *ExcursionRepo) Create(ctx context.Context, e *domain.Excursion) (int64, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	placeholder := fmt.Sprintf("_%d", time.Now().UnixNano())
	var id int64
	err = tx.QueryRow(ctx, `
		INSERT INTO excursions (guide_id, city_id, category_id, title, slug, description, type, max_guests, price_from, currency, status,
			duration_minutes, transport_mode, children_allowed, language, organizational_details, meeting_point,
			cover_image_url, body_html, map_embed_url, included_items, excluded_items, structured_content)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22::jsonb,$23::jsonb) RETURNING id
	`, e.GuideID, e.CityID, e.CategoryID, e.Title, placeholder, e.Description, e.Type, e.MaxGuests, e.PriceFrom, e.Currency, e.Status,
		e.DurationMinutes, e.TransportMode, e.ChildrenAllowed, e.Language, e.OrganizationalDetails, e.MeetingPoint,
		e.CoverImageURL, e.BodyHTML, e.MapEmbedURL, string(marshalStringSlice(e.IncludedItems)), string(marshalStringSlice(e.ExcludedItems)), string(marshalStructuredContent(e.StructuredContent))).Scan(&id)
	if err != nil {
		return 0, err
	}

	slug := strconv.FormatInt(id, 10)
	if _, err = tx.Exec(ctx, `UPDATE excursions SET slug=$1, updated_at=NOW() WHERE id=$2`, slug, id); err != nil {
		return 0, err
	}
	if err = tx.Commit(ctx); err != nil {
		return 0, err
	}
	e.ID = id
	e.Slug = slug
	return id, nil
}

func (r *ExcursionRepo) GetBySlug(ctx context.Context, slug string) (*domain.Excursion, error) {
	row := r.db.Pool.QueryRow(ctx, `SELECT `+excursionSelectCols+` FROM excursions WHERE slug=$1`, slug)
	return scanExcursion(row)
}

func (r *ExcursionRepo) GetByID(ctx context.Context, id int64) (*domain.Excursion, error) {
	row := r.db.Pool.QueryRow(ctx, `SELECT `+excursionSelectCols+` FROM excursions WHERE id=$1`, id)
	return scanExcursion(row)
}

func scanExcursion(row pgx.Row) (*domain.Excursion, error) {
	var e domain.Excursion
	err := scanExcursionFields(&e, row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &e, err
}

func (r *ExcursionRepo) ListByGuide(ctx context.Context, guideID int64) ([]domain.Excursion, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT `+excursionSelectCols+` FROM excursions WHERE guide_id=$1 ORDER BY id DESC`, guideID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanExcursions(rows)
}

func (r *ExcursionRepo) Delete(ctx context.Context, guideID, id int64) error {
	tag, err := r.db.Pool.Exec(ctx, `DELETE FROM excursions WHERE id=$1 AND guide_id=$2`, id, guideID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *ExcursionRepo) AdminDelete(ctx context.Context, id int64) (guideID int64, err error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx, `SELECT guide_id FROM excursions WHERE id=$1`, id).Scan(&guideID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, pgx.ErrNoRows
	}
	if err != nil {
		return 0, err
	}

	if _, err = tx.Exec(ctx, `
		DELETE FROM review_comments
		WHERE review_id IN (SELECT id FROM guide_reviews WHERE excursion_id = $1)
	`, id); err != nil {
		return 0, err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM guide_reviews WHERE excursion_id = $1`, id); err != nil {
		return 0, err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM favorites WHERE target_type = 'EXCURSION' AND target_id = $1`, id); err != nil {
		return 0, err
	}

	tag, err := tx.Exec(ctx, `DELETE FROM excursions WHERE id = $1`, id)
	if err != nil {
		return 0, err
	}
	if tag.RowsAffected() == 0 {
		return 0, pgx.ErrNoRows
	}
	return guideID, tx.Commit(ctx)
}

func (r *ExcursionRepo) DeleteAllByGuide(ctx context.Context, guideID int64) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, `
		DELETE FROM review_comments
		WHERE review_id IN (
			SELECT id FROM guide_reviews
			WHERE guide_id = $1
			   OR excursion_id IN (SELECT id FROM excursions WHERE guide_id = $1)
		)
	`, guideID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `
		DELETE FROM guide_reviews
		WHERE guide_id = $1
		   OR excursion_id IN (SELECT id FROM excursions WHERE guide_id = $1)
	`, guideID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `
		DELETE FROM favorites
		WHERE (target_type = 'GUIDE' AND target_id = $1)
		   OR (target_type = 'EXCURSION' AND target_id IN (SELECT id FROM excursions WHERE guide_id = $1))
	`, guideID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `
		DELETE FROM featured_placements
		WHERE guide_id = $1
		   OR excursion_id IN (SELECT id FROM excursions WHERE guide_id = $1)
	`, guideID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM excursions WHERE guide_id = $1`, guideID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type AdminExcursionRow struct {
	ID        int64   `json:"id"`
	GuideID   int64   `json:"guide_id"`
	GuideName string  `json:"guide_name"`
	Title     string  `json:"title"`
	Slug      string  `json:"slug"`
	Status    string  `json:"status"`
	PriceFrom float64 `json:"price_from"`
	Currency  string  `json:"currency"`
}

func (r *ExcursionRepo) ListAdmin(ctx context.Context, status string, limit int) ([]AdminExcursionRow, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	q := `
		SELECT e.id, e.guide_id, gp.display_name, e.title, e.slug, e.status, e.price_from, e.currency
		FROM excursions e
		INNER JOIN guide_profiles gp ON gp.id = e.guide_id`
	args := []any{}
	if status != "" {
		q += ` WHERE e.status=$1`
		args = append(args, status)
	}
	q += ` ORDER BY e.id DESC LIMIT ` + fmt.Sprintf("%d", limit)
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]AdminExcursionRow, 0)
	for rows.Next() {
		var row AdminExcursionRow
		if err := rows.Scan(&row.ID, &row.GuideID, &row.GuideName, &row.Title, &row.Slug, &row.Status, &row.PriceFrom, &row.Currency); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *ExcursionRepo) ListByGuideEnriched(ctx context.Context, guideID int64) ([]domain.ExcursionView, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT `+excursionSelectColsAliased+`,
			`+excursionCityCols+`
		FROM excursions e
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE e.guide_id=$1
		ORDER BY e.id DESC
	`, guideID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanExcursionViews(rows, false)
}

func (r *ExcursionRepo) ListPublishedByGuide(ctx context.Context, guideID int64) ([]domain.ExcursionView, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT `+excursionSelectColsAliased+`,
			`+excursionCityCols+excursionReviewRatingCols+`
		FROM excursions e
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE e.guide_id=$1 AND e.status=$2
		ORDER BY e.id DESC
	`, guideID, domain.ExcursionPublished)
	if err != nil {
		return nil, err
	}
	return scanExcursionViews(rows, true)
}

func (r *ExcursionRepo) GetViewBySlug(ctx context.Context, slug string) (*domain.ExcursionView, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT `+excursionSelectColsAliased+`,
			`+excursionCityCols+`,
			g.display_name,
			g.website_slug,
			COALESCE(g.avatar_url, ''),
			COALESCE((SELECT AVG(r.rating)::float8 FROM guide_reviews r WHERE r.excursion_id=e.id AND r.status=$2), 0),
			COALESCE((SELECT COUNT(*)::int FROM guide_reviews r WHERE r.excursion_id=e.id AND r.status=$2), 0)
		FROM excursions e
		LEFT JOIN cities c ON c.id = e.city_id
		JOIN guide_profiles g ON g.id = e.guide_id
		WHERE e.slug=$1
	`, slug, domain.ReviewPublished)
	var v domain.ExcursionView
	var includedRaw, excludedRaw, structuredRaw []byte
	err := row.Scan(
		&v.ID, &v.GuideID, &v.CityID, &v.CategoryID, &v.Title, &v.Slug, &v.Description, &v.Type, &v.MaxGuests, &v.PriceFrom, &v.Currency, &v.Status,
		&v.DurationMinutes, &v.TransportMode, &v.ChildrenAllowed, &v.Language, &v.OrganizationalDetails, &v.MeetingPoint,
		&v.CoverImageURL, &v.BodyHTML, &v.MapEmbedURL, &includedRaw, &excludedRaw, &structuredRaw,
		&v.CityName, &v.CitySlug, &v.GuideName, &v.GuideSlug, &v.GuideAvatarURL, &v.RatingAvg, &v.RatingCount,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	v.IncludedItems = unmarshalStringSlice(includedRaw)
	v.ExcludedItems = unmarshalStringSlice(excludedRaw)
	v.StructuredContent = unmarshalStructuredContent(structuredRaw)
	return &v, nil
}

func (r *ExcursionRepo) GetViewByID(ctx context.Context, id int64) (*domain.ExcursionView, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT `+excursionSelectColsAliased+`,
			`+excursionCityCols+`,
			g.display_name,
			g.website_slug,
			COALESCE(g.avatar_url, '')`+excursionReviewRatingCols+`
		FROM excursions e
		LEFT JOIN cities c ON c.id = e.city_id
		JOIN guide_profiles g ON g.id = e.guide_id
		WHERE e.id=$1 AND e.status=$2 AND g.status=$3
	`, id, domain.ExcursionPublished, domain.GuideStatusActive)
	var v domain.ExcursionView
	err := scanExcursionViewFields(&v, row, true, true)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &v, err
}

func scanExcursionViews(rows pgx.Rows, withRating bool) ([]domain.ExcursionView, error) {
	defer rows.Close()
	var out []domain.ExcursionView
	for rows.Next() {
		var v domain.ExcursionView
		if err := scanExcursionViewFields(&v, rows, false, withRating); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (r *ExcursionRepo) ListPublicEnriched(ctx context.Context, cityID *int64, q string, date *time.Time, limit, offset int) ([]domain.ExcursionView, error) {
	sql := `SELECT ` + excursionSelectColsAliased + `,
			` + excursionCityCols + `,
			g.display_name,
			g.website_slug,
			COALESCE(g.avatar_url, '')` + excursionReviewRatingCols + `
		FROM excursions e
		JOIN guide_profiles g ON g.id=e.guide_id
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE e.status=$1 AND g.status=$2`
	args := []any{domain.ExcursionPublished, domain.GuideStatusActive}
	n := 3
	if cityID != nil {
		sql += fmt.Sprintf(` AND e.city_id=$%d`, n)
		args = append(args, *cityID)
		n++
	}
	if strings.TrimSpace(q) != "" {
		sql, args, n = appendExcursionTextSearch(sql, args, n, q, true)
	}
	if date != nil {
		dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
		dayEnd := dayStart.Add(24 * time.Hour)
		sql += fmt.Sprintf(` AND (
			(e.type='GROUP' AND EXISTS (
				SELECT 1 FROM excursion_dates ed
				WHERE ed.excursion_id=e.id AND ed.starts_at >= $%d AND ed.starts_at < $%d AND ed.ends_at > NOW()
			))
			OR (e.type='INDIVIDUAL' AND EXISTS (
				SELECT 1 FROM guide_availability_slots gas
				WHERE gas.guide_id=e.guide_id AND gas.starts_at >= $%d AND gas.starts_at < $%d AND gas.ends_at > NOW()
			))
		)`, n, n+1, n, n+1)
		args = append(args, dayStart, dayEnd)
		n += 2
	}
	sql += fmt.Sprintf(` ORDER BY e.id DESC LIMIT $%d OFFSET $%d`, n, n+1)
	args = append(args, limit, offset)
	rows, err := r.db.Pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.ExcursionView
	for rows.Next() {
		var v domain.ExcursionView
		if err := scanExcursionViewFields(&v, rows, true, true); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (r *ExcursionRepo) ListPublicEnrichedRandom(ctx context.Context, limit int, exclude []int64) ([]domain.ExcursionView, error) {
	sql := `SELECT ` + excursionSelectColsAliased + `,
			` + excursionCityCols + `,
			g.display_name,
			g.website_slug,
			COALESCE(g.avatar_url, '')` + excursionReviewRatingCols + `
		FROM excursions e
		JOIN guide_profiles g ON g.id=e.guide_id
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE e.status=$1 AND g.status=$2`
	args := []any{domain.ExcursionPublished, domain.GuideStatusActive}
	n := 3
	if len(exclude) > 0 {
		sql += fmt.Sprintf(` AND NOT (e.id = ANY($%d))`, n)
		args = append(args, exclude)
		n++
	}
	sql += fmt.Sprintf(` ORDER BY RANDOM() LIMIT $%d`, n)
	args = append(args, limit)
	rows, err := r.db.Pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.ExcursionView
	for rows.Next() {
		var v domain.ExcursionView
		if err := scanExcursionViewFields(&v, rows, true, true); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (r *ExcursionRepo) ListPublic(ctx context.Context, cityID *int64, q string, limit, offset int) ([]domain.Excursion, error) {
	sql := `SELECT ` + excursionSelectColsAliased + `
		FROM excursions e JOIN guide_profiles g ON g.id=e.guide_id
		LEFT JOIN cities c ON c.id = e.city_id
		WHERE e.status=$1 AND g.status=$2`
	args := []any{domain.ExcursionPublished, domain.GuideStatusActive}
	n := 3
	if cityID != nil {
		sql += fmt.Sprintf(` AND e.city_id=$%d`, n)
		args = append(args, *cityID)
		n++
	}
	if strings.TrimSpace(q) != "" {
		sql, args, n = appendExcursionTextSearch(sql, args, n, q, true)
	}
	sql += fmt.Sprintf(` ORDER BY e.id DESC LIMIT $%d OFFSET $%d`, n, n+1)
	args = append(args, limit, offset)
	rows, err := r.db.Pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanExcursions(rows)
}

func scanExcursions(rows pgx.Rows) ([]domain.Excursion, error) {
	defer rows.Close()
	var out []domain.Excursion
	for rows.Next() {
		var e domain.Excursion
		if err := scanExcursionFields(&e, rows); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *ExcursionRepo) Update(ctx context.Context, e *domain.Excursion) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE excursions SET city_id=$2, category_id=$3, title=$4, description=$5, type=$6, max_guests=$7, price_from=$8, status=$9,
			duration_minutes=$10, transport_mode=$11, children_allowed=$12, language=$13, organizational_details=$14, meeting_point=$15,
			cover_image_url=$16, body_html=$17, map_embed_url=$18, included_items=$19::jsonb, excluded_items=$20::jsonb,
			structured_content=$21::jsonb, updated_at=NOW()
		WHERE id=$1 AND guide_id=$22
	`, e.ID, e.CityID, e.CategoryID, e.Title, e.Description, e.Type, e.MaxGuests, e.PriceFrom, e.Status,
		e.DurationMinutes, e.TransportMode, e.ChildrenAllowed, e.Language, e.OrganizationalDetails, e.MeetingPoint,
		e.CoverImageURL, e.BodyHTML, e.MapEmbedURL,
		string(marshalStringSlice(e.IncludedItems)), string(marshalStringSlice(e.ExcludedItems)),
		string(marshalStructuredContent(e.StructuredContent)), e.GuideID)
	return err
}

func (r *ExcursionRepo) SetStatus(ctx context.Context, id int64, status string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE excursions SET status=$2, updated_at=NOW() WHERE id=$1`, id, status)
	return err
}

func (r *ExcursionRepo) PublishPendingByGuide(ctx context.Context, guideID int64) error {
	return r.PublishCatalogReadyByGuide(ctx, guideID)
}

func (r *ExcursionRepo) PublishCatalogReadyByGuide(ctx context.Context, guideID int64) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE excursions SET status=$1, updated_at=NOW()
		WHERE guide_id=$2 AND status=$3
	`, domain.ExcursionPublished, guideID, domain.ExcursionPendingModeration)
	return err
}

func (r *ExcursionRepo) PublishAllPending(ctx context.Context) error {
	return r.PublishAllCatalogReady(ctx)
}

func (r *ExcursionRepo) PublishAllCatalogReady(ctx context.Context) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE excursions SET status=$1, updated_at=NOW()
		WHERE status=$2
	`, domain.ExcursionPublished, domain.ExcursionPendingModeration)
	return err
}

func (r *ExcursionRepo) ListByStatus(ctx context.Context, status string, limit int) ([]domain.Excursion, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT e.id, e.guide_id, e.city_id, e.category_id, e.title, e.slug, e.description, e.type, e.max_guests, e.price_from, e.currency, e.status
		FROM excursions e
		INNER JOIN guide_profiles gp ON gp.id = e.guide_id
		WHERE e.status=$1
		ORDER BY e.id DESC
		LIMIT $2`, status, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanExcursions(rows)
}
