package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type UserRepo struct{ db *DB }

func NewUserRepo(db *DB) *UserRepo { return &UserRepo{db: db} }

func (r *UserRepo) Create(ctx context.Context, email, login, hash string, roles []string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO users (email, login, password_hash, roles) VALUES ($1,$2,$3,$4) RETURNING id
	`, email, login, hash, roles).Scan(&id)
	return id, err
}

func (r *UserRepo) GetByLogin(ctx context.Context, login string) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx, `SELECT id, email, login, first_name, last_name, password_hash, roles, status, created_at FROM users WHERE login=$1`, login)
	return scanUser(row)
}

func (r *UserRepo) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx, `SELECT id, email, login, first_name, last_name, password_hash, roles, status, created_at FROM users WHERE id=$1`, id)
	return scanUser(row)
}

func scanUser(row pgx.Row) (*domain.User, error) {
	var u domain.User
	err := row.Scan(&u.ID, &u.Email, &u.Login, &u.FirstName, &u.LastName, &u.PasswordHash, &u.Roles, &u.Status, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &u, err
}

func (r *UserRepo) UpdateProfile(ctx context.Context, id int64, firstName, lastName string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE users SET first_name=$2, last_name=$3, updated_at=NOW() WHERE id=$1`, id, firstName, lastName)
	return err
}

func (r *UserRepo) List(ctx context.Context, limit, offset int) ([]domain.User, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id, email, login, first_name, last_name, password_hash, roles, status, created_at FROM users ORDER BY id LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Login, &u.FirstName, &u.LastName, &u.PasswordHash, &u.Roles, &u.Status, &u.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (r *UserRepo) SaveRefreshToken(ctx context.Context, userID int64, hash string, exp time.Time) error {
	_, err := r.db.Pool.Exec(ctx, `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`, userID, hash, exp)
	return err
}

func (r *UserRepo) GetRefreshToken(ctx context.Context, hash string) (userID int64, exp time.Time, err error) {
	err = r.db.Pool.QueryRow(ctx, `SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash=$1`, hash).Scan(&userID, &exp)
	return
}

func (r *UserRepo) DeleteRefreshToken(ctx context.Context, hash string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE token_hash=$1`, hash)
	return err
}

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
	rating_avg, rating_count, preferred_contact_method, phone, email, telegram, whatsapp,
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
		&g.Telegram, &g.Whatsapp, &g.Status, &g.LastShownAt, &g.CreatedAt, &g.AvatarURL)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &g, err
}

func scanGuideRow(rows pgx.Rows) (domain.GuideProfile, error) {
	var g domain.GuideProfile
	err := rows.Scan(&g.ID, &g.UserID, &g.GuideType, &g.FirstName, &g.LastName, &g.DisplayName, &g.About,
		&g.WebsiteSlug, &g.RatingAvg, &g.RatingCount, &g.PreferredContactMethod, &g.Phone, &g.Email,
		&g.Telegram, &g.Whatsapp, &g.Status, &g.LastShownAt, &g.CreatedAt, &g.AvatarURL)
	return g, err
}

func (r *GuideRepo) UpdateProfile(ctx context.Context, g *domain.GuideProfile) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE guide_profiles SET guide_type=$2, first_name=$3, last_name=$4, display_name=$5, about=$6,
			preferred_contact_method=$7, phone=$8, email=$9, telegram=$10, whatsapp=$11, status=$12,
			avatar_url=$13, updated_at=NOW()
		WHERE id=$1
	`, g.ID, g.GuideType, g.FirstName, g.LastName, g.DisplayName, g.About, g.PreferredContactMethod,
		g.Phone, g.Email, g.Telegram, g.Whatsapp, g.Status, g.AvatarURL)
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
		q += fmt.Sprintf(` AND id IN (SELECT guide_id FROM guide_cities WHERE city_id=$%d AND is_active=true)`, n)
		args = append(args, *cityID)
		n++
	}
	if countryID != nil {
		q += fmt.Sprintf(` AND id IN (
			SELECT gc.guide_id FROM guide_cities gc
			JOIN cities c ON c.id = gc.city_id AND c.is_active=true
			WHERE c.country_id=$%d AND gc.is_active=true
		)`, n)
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

func (r *GuideRepo) AddCity(ctx context.Context, guideID, cityID int64, primary bool) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO guide_cities (guide_id, city_id, is_primary) VALUES ($1,$2,$3)
		ON CONFLICT (guide_id, city_id) DO UPDATE SET is_active=true, is_primary=EXCLUDED.is_primary
	`, guideID, cityID, primary)
	return err
}

type SubscriptionRepo struct{ db *DB }

func NewSubscriptionRepo(db *DB) *SubscriptionRepo { return &SubscriptionRepo{db: db} }

func (r *SubscriptionRepo) GetActive(ctx context.Context, guideID int64) (*domain.GuideSubscription, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, guide_id, plan_id, status, starts_at, expires_at, paid_at, payment_id, activation_source
		FROM guide_subscriptions
		WHERE guide_id=$1 AND status=$2 AND expires_at > NOW()
		ORDER BY id DESC LIMIT 1
	`, guideID, domain.SubscriptionActive)
	var s domain.GuideSubscription
	err := row.Scan(&s.ID, &s.GuideID, &s.PlanID, &s.Status, &s.StartsAt, &s.ExpiresAt, &s.PaidAt, &s.PaymentID, &s.ActivationSource)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &s, err
}

func (r *SubscriptionRepo) ListPlans(ctx context.Context) ([]domain.SubscriptionPlan, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, code, name, description, price, currency, duration_days, is_active, plan_type
		FROM subscription_plans WHERE is_active=true ORDER BY sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.SubscriptionPlan
	for rows.Next() {
		var p domain.SubscriptionPlan
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.Price, &p.Currency, &p.DurationDays, &p.IsActive, &p.PlanType); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *SubscriptionRepo) ListPlansByType(ctx context.Context, planType string) ([]domain.SubscriptionPlan, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, code, name, description, price, currency, duration_days, is_active, plan_type
		FROM subscription_plans WHERE is_active=true AND plan_type=$1 ORDER BY sort_order, id`, planType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.SubscriptionPlan
	for rows.Next() {
		var p domain.SubscriptionPlan
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.Price, &p.Currency, &p.DurationDays, &p.IsActive, &p.PlanType); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *SubscriptionRepo) GetPlan(ctx context.Context, id int64) (*domain.SubscriptionPlan, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, code, name, description, price, currency, duration_days, is_active, plan_type
		FROM subscription_plans WHERE id=$1`, id)
	var p domain.SubscriptionPlan
	err := row.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.Price, &p.Currency, &p.DurationDays, &p.IsActive, &p.PlanType)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &p, err
}

func (r *SubscriptionRepo) UpsertActive(ctx context.Context, guideID, planID int64, starts, expires, paid time.Time, paymentID *int64, source string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO guide_subscriptions (guide_id, plan_id, status, starts_at, expires_at, paid_at, payment_id, activation_source)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	`, guideID, planID, domain.SubscriptionActive, starts, expires, paid, paymentID, source)
	return err
}

type PaymentRepo struct{ db *DB }

func NewPaymentRepo(db *DB) *PaymentRepo { return &PaymentRepo{db: db} }

func (r *PaymentRepo) Create(ctx context.Context, payerID int64, purpose string, amount float64, currency string, metadata map[string]any) (int64, error) {
	var id int64
	providerID := fmt.Sprintf("stub-%d-%d", payerID, time.Now().UnixNano())
	metaJSON, _ := json.Marshal(metadata)
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO payments (payer_id, payer_type, purpose, amount, currency, status, provider_payment_id, metadata)
		VALUES ($1,'GUIDE',$2,$3,$4,$5,$6,$7) RETURNING id
	`, payerID, purpose, amount, currency, domain.PaymentPending, providerID, metaJSON).Scan(&id)
	return id, err
}

func (r *PaymentRepo) GetByID(ctx context.Context, id int64) (*domain.Payment, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, payer_id, payer_type, purpose, amount, currency, status, provider_payment_id, metadata
		FROM payments WHERE id=$1`, id)
	var p domain.Payment
	var metaJSON []byte
	err := row.Scan(&p.ID, &p.PayerID, &p.PayerType, &p.Purpose, &p.Amount, &p.Currency, &p.Status, &p.ProviderPaymentID, &metaJSON)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(metaJSON) > 0 {
		_ = json.Unmarshal(metaJSON, &p.Metadata)
	}
	return &p, nil
}

func (r *PaymentRepo) MarkPaid(ctx context.Context, id int64) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE payments SET status=$2, updated_at=NOW() WHERE id=$1 AND status != $3`, id, domain.PaymentPaid, domain.PaymentPaid)
	return err
}

type GeoRepo struct{ db *DB }

func NewGeoRepo(db *DB) *GeoRepo { return &GeoRepo{db: db} }

type Country struct {
	ID       int64  `json:"id"`
	Slug     string `json:"slug"`
	Name     string `json:"name"`
	IsActive bool   `json:"is_active"`
}

type CountryWithGuideCount struct {
	ID         int64  `json:"id"`
	Slug       string `json:"slug"`
	Name       string `json:"name"`
	GuideCount int    `json:"guide_count"`
}

type Region struct {
	ID        int64  `json:"id"`
	CountryID int64  `json:"country_id"`
	Slug      string `json:"slug"`
	Name      string `json:"name"`
}

type City struct {
	ID          int64   `json:"id"`
	CountryID   int64   `json:"country_id"`
	RegionID    int64   `json:"region_id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	CountrySlug string  `json:"country_slug,omitempty"`
}

type MapPoint struct {
	ID          int64   `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	CountrySlug string  `json:"country_slug"`
	CountryName string  `json:"country_name"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
}

func (r *GeoRepo) GetCountryBySlug(ctx context.Context, slug string) (*Country, error) {
	row := r.db.Pool.QueryRow(ctx, `SELECT id, slug, name, is_active FROM countries WHERE slug=$1 AND is_active=true`, slug)
	var c Country
	err := row.Scan(&c.ID, &c.Slug, &c.Name, &c.IsActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

func (r *GeoRepo) ListCountries(ctx context.Context) ([]Country, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id, slug, name, is_active FROM countries WHERE is_active=true ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Country
	for rows.Next() {
		var c Country
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &c.IsActive); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *GeoRepo) ListCountriesWithGuideCount(ctx context.Context) ([]CountryWithGuideCount, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT co.id, co.slug, co.name, COUNT(DISTINCT gp.id)::int
		FROM countries co
		JOIN cities c ON c.country_id = co.id AND c.is_active = true
		JOIN guide_cities gc ON gc.city_id = c.id AND gc.is_active = true
		JOIN guide_profiles gp ON gp.id = gc.guide_id AND gp.status = $1
		WHERE co.is_active = true
		GROUP BY co.id, co.slug, co.name
		HAVING COUNT(DISTINCT gp.id) > 0
		ORDER BY COUNT(DISTINCT gp.id) DESC, co.name ASC
	`, domain.GuideStatusActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CountryWithGuideCount
	for rows.Next() {
		var c CountryWithGuideCount
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &c.GuideCount); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *GeoRepo) ListCities(ctx context.Context) ([]City, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id, country_id, region_id, slug, name, COALESCE(latitude,0), COALESCE(longitude,0) FROM cities WHERE is_active=true ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []City
	for rows.Next() {
		var c City
		if err := rows.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *GeoRepo) GetCityBySlug(ctx context.Context, slug string) (*City, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT c.id, c.country_id, c.region_id, c.slug, c.name, COALESCE(c.latitude,0), COALESCE(c.longitude,0), co.slug
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		WHERE c.slug=$1 AND c.is_active=true
	`, slug)
	var c City
	err := row.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude, &c.CountrySlug)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

func (r *GeoRepo) GetCityByID(ctx context.Context, id int64) (*City, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT c.id, c.country_id, c.region_id, c.slug, c.name, COALESCE(c.latitude,0), COALESCE(c.longitude,0), co.slug
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		WHERE c.id=$1 AND c.is_active=true
	`, id)
	var c City
	err := row.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude, &c.CountrySlug)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

func (r *GeoRepo) ListCitiesByCountry(ctx context.Context, countrySlug string) ([]City, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT c.id, c.country_id, c.region_id, c.slug, c.name, COALESCE(c.latitude,0), COALESCE(c.longitude,0), co.slug
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		WHERE co.slug=$1 AND c.is_active=true AND co.is_active=true
		ORDER BY c.name
	`, countrySlug)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []City
	for rows.Next() {
		var c City
		if err := rows.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude, &c.CountrySlug); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *GeoRepo) ListMapPoints(ctx context.Context) ([]MapPoint, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT DISTINCT c.id, c.slug, c.name, co.slug, co.name, c.latitude, c.longitude
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		JOIN excursions e ON e.city_id = c.id
		JOIN guide_profiles g ON g.id = e.guide_id
		WHERE c.is_active=true
		  AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
		  AND c.latitude <> 0 AND c.longitude <> 0
		  AND e.status = $1
		  AND g.status = $2
		ORDER BY co.name, c.name
	`, domain.ExcursionPublished, domain.GuideStatusActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []MapPoint
	for rows.Next() {
		var p MapPoint
		if err := rows.Scan(&p.ID, &p.Slug, &p.Name, &p.CountrySlug, &p.CountryName, &p.Lat, &p.Lng); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *GeoRepo) CreateCountry(ctx context.Context, slug, name string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `INSERT INTO countries (slug, name) VALUES ($1,$2) RETURNING id`, slug, name).Scan(&id)
	return id, err
}

func (r *GeoRepo) CreateRegion(ctx context.Context, countryID int64, slug, name string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `INSERT INTO regions (country_id, slug, name) VALUES ($1,$2,$3) RETURNING id`, countryID, slug, name).Scan(&id)
	return id, err
}

func (r *GeoRepo) CreateCity(ctx context.Context, countryID, regionID int64, slug, name string, lat, lng float64) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `INSERT INTO cities (country_id, region_id, slug, name, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, countryID, regionID, slug, name, lat, lng).Scan(&id)
	return id, err
}

func (r *GeoRepo) EnsureCountry(ctx context.Context, slug, name string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO countries (slug, name) VALUES ($1, $2)
		ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
		RETURNING id
	`, slug, name).Scan(&id)
	return id, err
}

func (r *GeoRepo) EnsureRegion(ctx context.Context, countryID int64, slug, name string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO regions (country_id, slug, name) VALUES ($1, $2, $3)
		ON CONFLICT (country_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
		RETURNING id
	`, countryID, slug, name).Scan(&id)
	return id, err
}

func (r *GeoRepo) EnsureCity(ctx context.Context, countryID, regionID int64, slug, name string, lat, lng float64) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO cities (country_id, region_id, slug, name, latitude, longitude)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (region_id, slug) DO UPDATE SET
			name = EXCLUDED.name,
			latitude = CASE WHEN EXCLUDED.latitude <> 0 THEN EXCLUDED.latitude ELSE cities.latitude END,
			longitude = CASE WHEN EXCLUDED.longitude <> 0 THEN EXCLUDED.longitude ELSE cities.longitude END,
			updated_at = NOW()
		RETURNING id
	`, countryID, regionID, slug, name, lat, lng).Scan(&id)
	return id, err
}

func (r *GeoRepo) FindCityInCountry(ctx context.Context, countryID int64, name, slug string) (*City, error) {
	name = strings.TrimSpace(name)
	row := r.db.Pool.QueryRow(ctx, `
		SELECT c.id, c.country_id, c.region_id, c.slug, c.name, COALESCE(c.latitude,0), COALESCE(c.longitude,0), co.slug
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		WHERE c.country_id = $1 AND c.is_active = true
		  AND (
		    lower(trim(c.name)) = lower(trim($2))
		    OR lower(c.slug) = lower($3)
		  )
		ORDER BY c.id
		LIMIT 1
	`, countryID, name, slug)
	var c City
	err := row.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude, &c.CountrySlug)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

// ResolveOrCreateCity повертає існуюче місто за назвою/slug у країні або створює нове.
func (r *GeoRepo) ResolveOrCreateCity(ctx context.Context, countryID, regionID int64, slug, name string, lat, lng float64) (id int64, created bool, err error) {
	if existing, err := r.FindCityInCountry(ctx, countryID, name, slug); err != nil {
		return 0, false, err
	} else if existing != nil {
		return existing.ID, false, nil
	}
	id, err = r.EnsureCity(ctx, countryID, regionID, slug, name, lat, lng)
	return id, true, err
}

type ExcursionRepo struct{ db *DB }

func NewExcursionRepo(db *DB) *ExcursionRepo { return &ExcursionRepo{db: db} }

const excursionSelectCols = `id, guide_id, city_id, category_id, title, slug, description, type, max_guests, price_from, currency, status,
duration_minutes, transport_mode, children_allowed, language, organizational_details, meeting_point,
cover_image_url, body_html, map_embed_url, included_items, excluded_items`

const excursionSelectColsAliased = `e.id, e.guide_id, e.city_id, e.category_id, e.title, e.slug, e.description, e.type, e.max_guests, e.price_from, e.currency, e.status,
	e.duration_minutes, e.transport_mode, e.children_allowed, e.language, e.organizational_details, e.meeting_point,
	e.cover_image_url, e.body_html, e.map_embed_url, e.included_items, e.excluded_items`

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

func scanExcursionFields(e *domain.Excursion, row pgx.Row) error {
	var includedRaw, excludedRaw []byte
	err := row.Scan(
		&e.ID, &e.GuideID, &e.CityID, &e.CategoryID, &e.Title, &e.Slug, &e.Description, &e.Type, &e.MaxGuests, &e.PriceFrom, &e.Currency, &e.Status,
		&e.DurationMinutes, &e.TransportMode, &e.ChildrenAllowed, &e.Language, &e.OrganizationalDetails, &e.MeetingPoint,
		&e.CoverImageURL, &e.BodyHTML, &e.MapEmbedURL, &includedRaw, &excludedRaw,
	)
	if err != nil {
		return err
	}
	e.IncludedItems = unmarshalStringSlice(includedRaw)
	e.ExcludedItems = unmarshalStringSlice(excludedRaw)
	return nil
}

func scanExcursionViewFields(v *domain.ExcursionView, row pgx.Row, withGuide, withRating bool) error {
	var includedRaw, excludedRaw []byte
	var err error
	if withGuide {
		if withRating {
			err = row.Scan(
				&v.ID, &v.GuideID, &v.CityID, &v.CategoryID, &v.Title, &v.Slug, &v.Description, &v.Type, &v.MaxGuests, &v.PriceFrom, &v.Currency, &v.Status,
				&v.DurationMinutes, &v.TransportMode, &v.ChildrenAllowed, &v.Language, &v.OrganizationalDetails, &v.MeetingPoint,
				&v.CoverImageURL, &v.BodyHTML, &v.MapEmbedURL, &includedRaw, &excludedRaw,
				&v.CityName, &v.CitySlug, &v.GuideName, &v.GuideSlug, &v.GuideAvatarURL, &v.RatingAvg, &v.RatingCount,
			)
		} else {
			err = row.Scan(
				&v.ID, &v.GuideID, &v.CityID, &v.CategoryID, &v.Title, &v.Slug, &v.Description, &v.Type, &v.MaxGuests, &v.PriceFrom, &v.Currency, &v.Status,
				&v.DurationMinutes, &v.TransportMode, &v.ChildrenAllowed, &v.Language, &v.OrganizationalDetails, &v.MeetingPoint,
				&v.CoverImageURL, &v.BodyHTML, &v.MapEmbedURL, &includedRaw, &excludedRaw,
				&v.CityName, &v.CitySlug, &v.GuideName, &v.GuideSlug, &v.GuideAvatarURL,
			)
		}
	} else if withRating {
		err = row.Scan(
			&v.ID, &v.GuideID, &v.CityID, &v.CategoryID, &v.Title, &v.Slug, &v.Description, &v.Type, &v.MaxGuests, &v.PriceFrom, &v.Currency, &v.Status,
			&v.DurationMinutes, &v.TransportMode, &v.ChildrenAllowed, &v.Language, &v.OrganizationalDetails, &v.MeetingPoint,
			&v.CoverImageURL, &v.BodyHTML, &v.MapEmbedURL, &includedRaw, &excludedRaw,
			&v.CityName, &v.CitySlug, &v.RatingAvg, &v.RatingCount,
		)
	} else {
		err = row.Scan(
			&v.ID, &v.GuideID, &v.CityID, &v.CategoryID, &v.Title, &v.Slug, &v.Description, &v.Type, &v.MaxGuests, &v.PriceFrom, &v.Currency, &v.Status,
			&v.DurationMinutes, &v.TransportMode, &v.ChildrenAllowed, &v.Language, &v.OrganizationalDetails, &v.MeetingPoint,
			&v.CoverImageURL, &v.BodyHTML, &v.MapEmbedURL, &includedRaw, &excludedRaw,
			&v.CityName, &v.CitySlug,
		)
	}
	if err != nil {
		return err
	}
	v.IncludedItems = unmarshalStringSlice(includedRaw)
	v.ExcludedItems = unmarshalStringSlice(excludedRaw)
	return nil
}

func (r *ExcursionRepo) Create(ctx context.Context, e *domain.Excursion) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO excursions (guide_id, city_id, category_id, title, slug, description, type, max_guests, price_from, currency, status,
			duration_minutes, transport_mode, children_allowed, language, organizational_details, meeting_point,
			cover_image_url, body_html, map_embed_url, included_items, excluded_items)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22::jsonb) RETURNING id
	`, e.GuideID, e.CityID, e.CategoryID, e.Title, e.Slug, e.Description, e.Type, e.MaxGuests, e.PriceFrom, e.Currency, e.Status,
		e.DurationMinutes, e.TransportMode, e.ChildrenAllowed, e.Language, e.OrganizationalDetails, e.MeetingPoint,
		e.CoverImageURL, e.BodyHTML, e.MapEmbedURL, string(marshalStringSlice(e.IncludedItems)), string(marshalStringSlice(e.ExcludedItems))).Scan(&id)
	return id, err
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
		SELECT e.id, e.guide_id, COALESCE(gp.display_name, ''), e.title, e.slug, e.status, e.price_from, e.currency
		FROM excursions e
		LEFT JOIN guide_profiles gp ON gp.id = e.guide_id`
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
	var out []AdminExcursionRow
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
	var includedRaw, excludedRaw []byte
	err := row.Scan(
		&v.ID, &v.GuideID, &v.CityID, &v.CategoryID, &v.Title, &v.Slug, &v.Description, &v.Type, &v.MaxGuests, &v.PriceFrom, &v.Currency, &v.Status,
		&v.DurationMinutes, &v.TransportMode, &v.ChildrenAllowed, &v.Language, &v.OrganizationalDetails, &v.MeetingPoint,
		&v.CoverImageURL, &v.BodyHTML, &v.MapEmbedURL, &includedRaw, &excludedRaw,
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

func (r *ExcursionRepo) ListPublicEnriched(ctx context.Context, cityID *int64, q string, limit, offset int) ([]domain.ExcursionView, error) {
	sql := `SELECT ` + excursionSelectColsAliased + `,
			`+excursionCityCols+`,
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
			`+excursionCityCols+`,
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
			cover_image_url=$16, body_html=$17, map_embed_url=$18, included_items=$19::jsonb, excluded_items=$20::jsonb, updated_at=NOW()
		WHERE id=$1 AND guide_id=$21
	`, e.ID, e.CityID, e.CategoryID, e.Title, e.Description, e.Type, e.MaxGuests, e.PriceFrom, e.Status,
		e.DurationMinutes, e.TransportMode, e.ChildrenAllowed, e.Language, e.OrganizationalDetails, e.MeetingPoint,
		e.CoverImageURL, e.BodyHTML, e.MapEmbedURL,
		string(marshalStringSlice(e.IncludedItems)), string(marshalStringSlice(e.ExcludedItems)), e.GuideID)
	return err
}

func (r *ExcursionRepo) SetStatus(ctx context.Context, id int64, status string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE excursions SET status=$2, updated_at=NOW() WHERE id=$1`, id, status)
	return err
}

func (r *ExcursionRepo) PublishPendingByGuide(ctx context.Context, guideID int64) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE excursions SET status=$1, updated_at=NOW()
		WHERE guide_id=$2 AND status=$3
	`, domain.ExcursionPublished, guideID, domain.ExcursionPendingModeration)
	return err
}

func (r *ExcursionRepo) PublishAllPending(ctx context.Context) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE excursions SET status=$1, updated_at=NOW() WHERE status=$2
	`, domain.ExcursionPublished, domain.ExcursionPendingModeration)
	return err
}

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

type FavoriteRepo struct{ db *DB }

func NewFavoriteRepo(db *DB) *FavoriteRepo { return &FavoriteRepo{db: db} }

func (r *FavoriteRepo) Toggle(ctx context.Context, userID int64, targetType string, targetID int64) (bool, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `SELECT id FROM favorites WHERE user_id=$1 AND target_type=$2 AND target_id=$3`, userID, targetType, targetID).Scan(&id)
	if err == nil {
		_, err = r.db.Pool.Exec(ctx, `DELETE FROM favorites WHERE id=$1`, id)
		return false, err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	_, err = r.db.Pool.Exec(ctx, `INSERT INTO favorites (user_id, target_type, target_id) VALUES ($1,$2,$3)`, userID, targetType, targetID)
	return true, err
}

func (r *FavoriteRepo) List(ctx context.Context, userID int64) ([]struct {
	TargetType string
	TargetID   int64
}, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT target_type, target_id FROM favorites WHERE user_id=$1 ORDER BY id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []struct {
		TargetType string
		TargetID   int64
	}
	for rows.Next() {
		var item struct {
			TargetType string
			TargetID   int64
		}
		if err := rows.Scan(&item.TargetType, &item.TargetID); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

type NotificationRepo struct{ db *DB }

func NewNotificationRepo(db *DB) *NotificationRepo { return &NotificationRepo{db: db} }

func (r *NotificationRepo) Create(ctx context.Context, userID int64, ntype string, payload []byte) error {
	_, err := r.db.Pool.Exec(ctx, `INSERT INTO notifications (user_id, type, payload) VALUES ($1,$2,$3)`, userID, ntype, payload)
	return err
}

func (r *NotificationRepo) ListAfter(ctx context.Context, userID, after int64, limit int) ([]map[string]any, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, type, payload, read_at, created_at FROM notifications
		WHERE user_id=$1 AND id > $2 ORDER BY id ASC LIMIT $3
	`, userID, after, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var id int64
		var ntype string
		var payload []byte
		var readAt *time.Time
		var createdAt time.Time
		if err := rows.Scan(&id, &ntype, &payload, &readAt, &createdAt); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id": id, "type": ntype, "payload": string(payload), "read_at": readAt, "created_at": createdAt,
		})
	}
	return out, rows.Err()
}

type FeaturedPlacementRepo struct{ db *DB }

func NewFeaturedPlacementRepo(db *DB) *FeaturedPlacementRepo { return &FeaturedPlacementRepo{db: db} }

func scanFeaturedPlacement(row pgx.Row) (*domain.FeaturedPlacement, error) {
	var fp domain.FeaturedPlacement
	var excursionID *int64
	var planID *int64
	var paidAt *time.Time
	var paymentID *int64
	err := row.Scan(&fp.ID, &fp.GuideID, &excursionID, &fp.SlotType, &planID, &fp.Status, &fp.StartsAt, &fp.ExpiresAt, &paidAt, &paymentID)
	if err != nil {
		return nil, err
	}
	fp.ExcursionID = excursionID
	fp.PlanID = planID
	fp.PaidAt = paidAt
	fp.PaymentID = paymentID
	return &fp, nil
}

func (r *FeaturedPlacementRepo) Upsert(ctx context.Context, guideID int64, excursionID *int64, slotType string, planID int64, durationDays int, paymentID *int64) error {
	now := time.Now().UTC()
	expires := now.Add(time.Duration(durationDays) * 24 * time.Hour)

	var existingID int64
	var existingExpires time.Time
	q := `
		SELECT id, expires_at FROM featured_placements
		WHERE guide_id=$1 AND slot_type=$2 AND status=$3 AND expires_at > NOW()`
	args := []any{guideID, slotType, domain.FeaturedPlacementActive}
	if excursionID != nil {
		q += ` AND excursion_id=$4`
		args = append(args, *excursionID)
	} else {
		q += ` AND excursion_id IS NULL`
	}
	q += ` ORDER BY id DESC LIMIT 1`
	err := r.db.Pool.QueryRow(ctx, q, args...).Scan(&existingID, &existingExpires)
	if err == nil {
		base := existingExpires
		if base.Before(now) {
			base = now
		}
		expires = base.Add(time.Duration(durationDays) * 24 * time.Hour)
		_, err = r.db.Pool.Exec(ctx, `
			UPDATE featured_placements
			SET plan_id=$2, expires_at=$3, paid_at=$4, payment_id=$5, updated_at=NOW()
			WHERE id=$1
		`, existingID, planID, expires, now, paymentID)
		return err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	_, err = r.db.Pool.Exec(ctx, `
		INSERT INTO featured_placements (guide_id, excursion_id, slot_type, plan_id, status, starts_at, expires_at, paid_at, payment_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
	`, guideID, excursionID, slotType, planID, domain.FeaturedPlacementActive, now, expires, now, paymentID)
	return err
}

func (r *FeaturedPlacementRepo) ListActiveBySlotType(ctx context.Context, slotType string, limit int) ([]domain.FeaturedPlacement, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, guide_id, excursion_id, slot_type, plan_id, status, starts_at, expires_at, paid_at, payment_id
		FROM featured_placements
		WHERE slot_type=$1 AND status=$2 AND expires_at > NOW()
		ORDER BY expires_at DESC
	`, slotType, domain.FeaturedPlacementActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.FeaturedPlacement, 0, limit)
	seen := map[string]bool{}
	for rows.Next() {
		fp, err := scanFeaturedPlacement(rows)
		if err != nil {
			return nil, err
		}
		key := fmt.Sprintf("g%d", fp.GuideID)
		if fp.ExcursionID != nil {
			key = fmt.Sprintf("e%d", *fp.ExcursionID)
		}
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, *fp)
		if len(out) >= limit {
			break
		}
	}
	return out, rows.Err()
}

func (r *FeaturedPlacementRepo) GetActiveGuideSlot(ctx context.Context, guideID int64) (*domain.FeaturedPlacement, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, guide_id, excursion_id, slot_type, plan_id, status, starts_at, expires_at, paid_at, payment_id
		FROM featured_placements
		WHERE guide_id=$1 AND slot_type=$2 AND excursion_id IS NULL AND status=$3 AND expires_at > NOW()
		ORDER BY expires_at DESC LIMIT 1
	`, guideID, domain.FeaturedSlotGuide, domain.FeaturedPlacementActive)
	fp, err := scanFeaturedPlacement(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return fp, err
}

func (r *FeaturedPlacementRepo) ListActiveExcursionSlotsByGuide(ctx context.Context, guideID int64) ([]domain.FeaturedExcursionPlacement, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT fp.id, fp.guide_id, fp.excursion_id, fp.slot_type, fp.plan_id, fp.status, fp.starts_at, fp.expires_at, fp.paid_at, fp.payment_id,
			e.title, e.slug
		FROM featured_placements fp
		JOIN excursions e ON e.id = fp.excursion_id
		WHERE fp.guide_id=$1 AND fp.slot_type=$2 AND fp.status=$3 AND fp.expires_at > NOW()
		ORDER BY fp.expires_at DESC
	`, guideID, domain.FeaturedSlotExcursion, domain.FeaturedPlacementActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.FeaturedExcursionPlacement
	for rows.Next() {
		var item domain.FeaturedExcursionPlacement
		var excursionID *int64
		var planID *int64
		var paidAt *time.Time
		var paymentID *int64
		if err := rows.Scan(
			&item.ID, &item.GuideID, &excursionID, &item.SlotType, &planID, &item.Status,
			&item.StartsAt, &item.ExpiresAt, &paidAt, &paymentID,
			&item.ExcursionTitle, &item.ExcursionSlug,
		); err != nil {
			return nil, err
		}
		item.ExcursionID = excursionID
		item.PlanID = planID
		item.PaidAt = paidAt
		item.PaymentID = paymentID
		out = append(out, item)
	}
	return out, rows.Err()
}

type SettingsRepo struct{ db *DB }

func NewSettingsRepo(db *DB) *SettingsRepo { return &SettingsRepo{db: db} }

func (r *SettingsRepo) GetBool(ctx context.Context, key string, def bool) (bool, error) {
	var val string
	err := r.db.Pool.QueryRow(ctx, `SELECT value::text FROM site_settings WHERE key=$1`, key).Scan(&val)
	if errors.Is(err, pgx.ErrNoRows) {
		return def, nil
	}
	if err != nil {
		return def, err
	}
	return val == "true" || val == `"true"`, nil
}

func (r *SettingsRepo) Set(ctx context.Context, key string, value string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO site_settings (key, value, updated_at) VALUES ($1, to_jsonb($2::text), NOW())
		ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
	`, key, value)
	return err
}

func (r *SettingsRepo) GetJSON(ctx context.Context, key string, dest any) error {
	var raw []byte
	err := r.db.Pool.QueryRow(ctx, `SELECT value FROM site_settings WHERE key=$1`, key).Scan(&raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return pgx.ErrNoRows
	}
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, dest)
}

func (r *SettingsRepo) SetJSON(ctx context.Context, key string, v any) error {
	raw, err := json.Marshal(v)
	if err != nil {
		return err
	}
	_, err = r.db.Pool.Exec(ctx, `
		INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
		ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
	`, key, raw)
	return err
}

type AuditRepo struct{ db *DB }

func NewAuditRepo(db *DB) *AuditRepo { return &AuditRepo{db: db} }

func (r *AuditRepo) Log(ctx context.Context, actorID *int64, action, entityType string, entityID *int64, oldVal, newVal, ip, ua string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, ip, user_agent)
		VALUES ($1,$2,$3,$4, NULLIF($5,'')::jsonb, NULLIF($6,'')::jsonb, $7, $8)
	`, actorID, action, entityType, entityID, oldVal, newVal, ip, ua)
	return err
}

type CalendarRepo struct{ db *DB }

func NewCalendarRepo(db *DB) *CalendarRepo { return &CalendarRepo{db: db} }

type Slot struct {
	ID       int64     `json:"id"`
	GuideID  int64     `json:"guide_id"`
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
	Note     string    `json:"note"`
}

func (r *CalendarRepo) List(ctx context.Context, guideID int64) ([]Slot, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id, guide_id, starts_at, ends_at, note FROM guide_availability_slots WHERE guide_id=$1 ORDER BY starts_at`, guideID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Slot
	for rows.Next() {
		var s Slot
		if err := rows.Scan(&s.ID, &s.GuideID, &s.StartsAt, &s.EndsAt, &s.Note); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *CalendarRepo) Create(ctx context.Context, guideID int64, start, end time.Time, note string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `INSERT INTO guide_availability_slots (guide_id, starts_at, ends_at, note) VALUES ($1,$2,$3,$4) RETURNING id`, guideID, start, end, note).Scan(&id)
	return id, err
}

func (r *CalendarRepo) Delete(ctx context.Context, guideID, slotID int64) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM guide_availability_slots WHERE id=$1 AND guide_id=$2`, slotID, guideID)
	return err
}
