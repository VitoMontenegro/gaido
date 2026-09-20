package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type CarrierRepo struct{ db *DB }

func NewCarrierRepo(db *DB) *CarrierRepo { return &CarrierRepo{db: db} }

type CarrierSearchParams struct {
	CarrierType       string
	BaseCityID        int64
	VerifiedUkrainian bool
	Limit             int
	Offset            int
}

func (r *CarrierRepo) UpsertProfile(ctx context.Context, p domain.CarrierProfile) error {
	var baseCity any
	if p.BaseCityID != nil && *p.BaseCityID > 0 {
		baseCity = *p.BaseCityID
	}
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO carrier_profiles (
			provider_id, carrier_type, citizenship, base_city_id, about, experience_years, trips_count,
			trust_level, identity_status, ukrainian_status, business_status, documents_status,
			hours_text, contact_person, status, display_name, website_slug, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
		ON CONFLICT (provider_id) DO UPDATE SET
			carrier_type=EXCLUDED.carrier_type,
			citizenship=EXCLUDED.citizenship,
			base_city_id=EXCLUDED.base_city_id,
			about=EXCLUDED.about,
			experience_years=EXCLUDED.experience_years,
			trips_count=EXCLUDED.trips_count,
			hours_text=EXCLUDED.hours_text,
			contact_person=EXCLUDED.contact_person,
			status=EXCLUDED.status,
			display_name=EXCLUDED.display_name,
			website_slug=EXCLUDED.website_slug,
			updated_at=NOW()`,
		p.ProviderID, p.CarrierType, p.Citizenship, baseCity, p.About, p.ExperienceYears, p.TripsCount,
		p.TrustLevel, p.IdentityStatus, p.UkrainianStatus, p.BusinessStatus, p.DocumentsStatus,
		p.HoursText, p.ContactPerson, p.Status, p.DisplayName, p.WebsiteSlug,
	)
	return err
}

func (r *CarrierRepo) GetProfileByProviderID(ctx context.Context, providerID int64) (*domain.CarrierProfile, error) {
	return r.scanProfile(r.db.Pool.QueryRow(ctx, profileSelectSQL+` WHERE cp.provider_id = $1`, providerID))
}

func (r *CarrierRepo) GetProfileByUserID(ctx context.Context, userID int64) (*domain.CarrierProfile, error) {
	return r.scanProfile(r.db.Pool.QueryRow(ctx, profileSelectSQL+` WHERE p.user_id = $1`, userID))
}

func (r *CarrierRepo) GetProfileBySlug(ctx context.Context, slug string) (*domain.CarrierProfile, error) {
	return r.scanProfile(r.db.Pool.QueryRow(ctx, profileSelectSQL+`
		WHERE COALESCE(NULLIF(cp.website_slug, ''), p.website_slug) = $1`, slug))
}

func (r *CarrierRepo) SlugTaken(ctx context.Context, slug string, exceptProviderID int64) (bool, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM carrier_profiles
		WHERE website_slug=$1 AND provider_id<>$2`, slug, exceptProviderID).Scan(&n)
	return n > 0, err
}

const profileSelectSQL = `
	SELECT cp.provider_id, cp.carrier_type, cp.citizenship, cp.base_city_id,
		COALESCE(bc.name, ''), COALESCE(bc.slug, ''),
		cp.about, cp.experience_years, cp.trips_count, cp.trust_level,
		cp.identity_status, cp.ukrainian_status, cp.business_status, cp.documents_status,
		cp.hours_text, cp.contact_person, cp.status, cp.created_at, cp.updated_at,
		COALESCE(NULLIF(cp.display_name, ''), p.display_name), p.business_name,
		COALESCE(NULLIF(cp.website_slug, ''), p.website_slug), p.avatar_url,
		p.rating_avg, p.rating_count,
		p.phone, p.email, p.telegram, p.whatsapp, p.viber, p.user_id
	FROM carrier_profiles cp
	JOIN providers p ON p.id = cp.provider_id
	LEFT JOIN cities bc ON bc.id = cp.base_city_id`

func (r *CarrierRepo) scanProfile(row pgx.Row) (*domain.CarrierProfile, error) {
	var p domain.CarrierProfile
	var baseCityID *int64
	err := row.Scan(
		&p.ProviderID, &p.CarrierType, &p.Citizenship, &baseCityID,
		&p.BaseCityName, &p.BaseCitySlug,
		&p.About, &p.ExperienceYears, &p.TripsCount, &p.TrustLevel,
		&p.IdentityStatus, &p.UkrainianStatus, &p.BusinessStatus, &p.DocumentsStatus,
		&p.HoursText, &p.ContactPerson, &p.Status, &p.CreatedAt, &p.UpdatedAt,
		&p.DisplayName, &p.BusinessName, &p.WebsiteSlug, &p.AvatarURL,
		&p.RatingAvg, &p.RatingCount,
		&p.Phone, &p.Email, &p.Telegram, &p.Whatsapp, &p.Viber, &p.UserID,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p.BaseCityID = baseCityID
	return &p, nil
}

func (r *CarrierRepo) ListPublished(ctx context.Context, p CarrierSearchParams) ([]domain.CarrierProfile, int, error) {
	if p.Limit <= 0 {
		p.Limit = 20
	}
	if p.Limit > 100 {
		p.Limit = 100
	}
	args := []any{domain.CarrierStatusPublished}
	where := []string{"cp.status = $1"}
	argN := 2
	if p.CarrierType != "" {
		where = append(where, fmt.Sprintf("cp.carrier_type = $%d", argN))
		args = append(args, p.CarrierType)
		argN++
	}
	if p.BaseCityID > 0 {
		where = append(where, fmt.Sprintf("cp.base_city_id = $%d", argN))
		args = append(args, p.BaseCityID)
		argN++
	}
	if p.VerifiedUkrainian {
		where = append(where, "cp.ukrainian_status = '"+domain.VerificationVerified+"'")
	}
	whereSQL := strings.Join(where, " AND ")
	var total int
	if err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM carrier_profiles cp WHERE `+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	q := profileSelectSQL + ` WHERE ` + whereSQL + fmt.Sprintf(`
		ORDER BY p.rating_avg DESC, cp.updated_at DESC
		LIMIT $%d OFFSET $%d`, argN, argN+1)
	args = append(args, p.Limit, p.Offset)
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var items []domain.CarrierProfile
	for rows.Next() {
		prof, err := r.scanProfile(rows)
		if err != nil {
			return nil, 0, err
		}
		if prof != nil {
			items = append(items, *prof)
		}
	}
	return items, total, rows.Err()
}

func (r *CarrierRepo) ListPendingModeration(ctx context.Context) ([]domain.CarrierProfile, error) {
	return r.ListAdmin(ctx, domain.CarrierStatusPending, 200)
}

func (r *CarrierRepo) ListAdmin(ctx context.Context, status string, limit int) ([]domain.CarrierProfile, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	q := profileSelectSQL
	args := []any{}
	if status != "" {
		q += ` WHERE cp.status = $1`
		args = append(args, status)
	}
	q += fmt.Sprintf(` ORDER BY cp.updated_at DESC LIMIT %d`, limit)
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []domain.CarrierProfile
	for rows.Next() {
		prof, err := r.scanProfile(rows)
		if err != nil {
			return nil, err
		}
		if prof != nil {
			items = append(items, *prof)
		}
	}
	return items, rows.Err()
}

func (r *CarrierRepo) SetStatus(ctx context.Context, providerID int64, status string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE carrier_profiles SET status=$2, updated_at=NOW() WHERE provider_id=$1`, providerID, status)
	return err
}

func (r *CarrierRepo) SetVerification(ctx context.Context, providerID int64, field, status string) error {
	col := map[string]string{
		"identity":  "identity_status",
		"ukrainian": "ukrainian_status",
		"business":  "business_status",
		"documents": "documents_status",
	}[field]
	if col == "" {
		return fmt.Errorf("unknown verification field")
	}
	q := fmt.Sprintf(`UPDATE carrier_profiles SET %s=$2, updated_at=NOW() WHERE provider_id=$1`, col)
	_, err := r.db.Pool.Exec(ctx, q, providerID, status)
	return err
}

func (r *CarrierRepo) ListVehicles(ctx context.Context, providerID int64) ([]domain.CarrierVehicle, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, provider_id, brand, model, year, vehicle_type, seats, photo_url,
			description, verification_status, is_primary
		FROM carrier_vehicles WHERE provider_id=$1 ORDER BY is_primary DESC, id`, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []domain.CarrierVehicle
	for rows.Next() {
		var v domain.CarrierVehicle
		if err := rows.Scan(
			&v.ID, &v.ProviderID, &v.Brand, &v.Model, &v.Year, &v.VehicleType, &v.Seats,
			&v.PhotoURL, &v.Description, &v.VerificationStatus, &v.IsPrimary,
		); err != nil {
			return nil, err
		}
		items = append(items, v)
	}
	return items, rows.Err()
}

func (r *CarrierRepo) CreateVehicle(ctx context.Context, v domain.CarrierVehicle) (int64, error) {
	if v.IsPrimary {
		_, _ = r.db.Pool.Exec(ctx, `UPDATE carrier_vehicles SET is_primary=false WHERE provider_id=$1`, v.ProviderID)
	}
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO carrier_vehicles (provider_id, brand, model, year, vehicle_type, seats, photo_url, description, verification_status, is_primary)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
		v.ProviderID, v.Brand, v.Model, v.Year, v.VehicleType, v.Seats, v.PhotoURL, v.Description, v.VerificationStatus, v.IsPrimary,
	).Scan(&id)
	return id, err
}

func (r *CarrierRepo) UpdateVehicle(ctx context.Context, v domain.CarrierVehicle) error {
	if v.IsPrimary {
		_, _ = r.db.Pool.Exec(ctx, `UPDATE carrier_vehicles SET is_primary=false WHERE provider_id=$1 AND id<>$2`, v.ProviderID, v.ID)
	}
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE carrier_vehicles SET brand=$2, model=$3, year=$4, vehicle_type=$5, seats=$6,
			photo_url=$7, description=$8, is_primary=$9, updated_at=NOW()
		WHERE id=$1 AND provider_id=$10`,
		v.ID, v.Brand, v.Model, v.Year, v.VehicleType, v.Seats, v.PhotoURL, v.Description, v.IsPrimary, v.ProviderID,
	)
	return err
}

func (r *CarrierRepo) DeleteVehicle(ctx context.Context, providerID, vehicleID int64) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM carrier_vehicles WHERE id=$1 AND provider_id=$2`, vehicleID, providerID)
	return err
}

func (r *CarrierRepo) ListReviews(ctx context.Context, providerID int64) ([]domain.PlatformReview, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT pr.id, pr.author_id, pr.rating, pr.body, pr.status, pr.created_at,
			COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.login)
		FROM platform_reviews pr
		JOIN users u ON u.id = pr.author_id
		WHERE pr.target_type='provider' AND pr.target_id=$1 AND pr.status='PUBLISHED'
		ORDER BY pr.created_at DESC LIMIT 20`, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []domain.PlatformReview
	for rows.Next() {
		var rv domain.PlatformReview
		if err := rows.Scan(&rv.ID, &rv.AuthorID, &rv.Rating, &rv.Body, &rv.Status, &rv.CreatedAt, &rv.AuthorName); err != nil {
			return nil, err
		}
		items = append(items, rv)
	}
	return items, rows.Err()
}

func (r *CarrierRepo) EnsureDemoSubscription(ctx context.Context, providerID int64, planCode string, months int) error {
	var planID int64
	err := r.db.Pool.QueryRow(ctx, `SELECT id FROM subscription_plans WHERE code=$1`, planCode).Scan(&planID)
	if err != nil {
		return err
	}
	var exists int
	_ = r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM provider_subscriptions
		WHERE provider_id=$1 AND status='ACTIVE' AND expires_at > NOW()`, providerID).Scan(&exists)
	if exists > 0 {
		return nil
	}
	starts := time.Now().UTC()
	expires := starts.AddDate(0, months, 0)
	_, err = r.db.Pool.Exec(ctx, `
		INSERT INTO provider_subscriptions (provider_id, plan_id, status, starts_at, expires_at, paid_at, activation_source)
		VALUES ($1,$2,'ACTIVE',$3,$4,$3,'DEMO')`, providerID, planID, starts, expires)
	return err
}

func (r *CarrierRepo) GetCarrierMetaByProviderIDs(ctx context.Context, providerIDs []int64) (map[int64]domain.CarrierProfile, error) {
	out := map[int64]domain.CarrierProfile{}
	if len(providerIDs) == 0 {
		return out, nil
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT provider_id, carrier_type, ukrainian_status, identity_status
		FROM carrier_profiles WHERE provider_id = ANY($1)`, providerIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var p domain.CarrierProfile
		if err := rows.Scan(&p.ProviderID, &p.CarrierType, &p.UkrainianStatus, &p.IdentityStatus); err != nil {
			return nil, err
		}
		out[p.ProviderID] = p
	}
	return out, rows.Err()
}
