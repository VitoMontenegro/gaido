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

type TransportRepo struct{ db *DB }

func NewTransportRepo(db *DB) *TransportRepo { return &TransportRepo{db: db} }

type TransportSearchParams struct {
	FromCityID        int64
	ToCityID          int64
	DateFrom          string // YYYY-MM-DD
	Kind              string
	CarrierType       string
	VerifiedUkrainian bool
	Limit             int
	Offset            int
}

func (r *TransportRepo) Search(ctx context.Context, p TransportSearchParams) ([]domain.TransportListing, int, error) {
	if p.Limit <= 0 {
		p.Limit = 20
	}
	if p.Limit > 100 {
		p.Limit = 100
	}

	args := []any{domain.TransportListingPublished}
	where := []string{"l.status = $1"}
	argN := 2

	if p.FromCityID > 0 && p.ToCityID > 0 {
		where = append(where, fmt.Sprintf(`
			EXISTS (
				SELECT 1 FROM transport_listing_stops sf
				JOIN transport_listing_stops st ON st.listing_id = sf.listing_id
				WHERE sf.listing_id = l.id AND sf.city_id = $%d AND st.city_id = $%d
				AND sf.sort_order < st.sort_order
			)`, argN, argN+1))
		args = append(args, p.FromCityID, p.ToCityID)
		argN += 2
	} else if p.FromCityID > 0 {
		where = append(where, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM transport_listing_stops sf WHERE sf.listing_id = l.id AND sf.city_id = $%d
		)`, argN))
		args = append(args, p.FromCityID)
		argN++
	} else if p.ToCityID > 0 {
		where = append(where, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM transport_listing_stops st WHERE st.listing_id = l.id AND st.city_id = $%d
		)`, argN))
		args = append(args, p.ToCityID)
		argN++
	}

	if p.Kind != "" {
		where = append(where, fmt.Sprintf("l.kind = $%d", argN))
		args = append(args, p.Kind)
		argN++
	}

	joinCarrier := ""
	if p.CarrierType != "" || p.VerifiedUkrainian {
		joinCarrier = " JOIN carrier_profiles cp ON cp.provider_id = l.provider_id AND cp.status = 'published'"
	}
	if p.CarrierType != "" {
		where = append(where, fmt.Sprintf("cp.carrier_type = $%d", argN))
		args = append(args, p.CarrierType)
		argN++
	}
	if p.VerifiedUkrainian {
		where = append(where, "cp.ukrainian_status = 'verified'")
	}

	if p.DateFrom != "" {
		where = append(where, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM transport_listing_departures d
			WHERE d.listing_id = l.id AND d.depart_on >= $%d::date
		)`, argN))
		args = append(args, p.DateFrom)
		argN++
	}

	whereSQL := strings.Join(where, " AND ")
	countQ := fmt.Sprintf(`
		SELECT COUNT(*) FROM transport_listings l%s WHERE %s`, joinCarrier, whereSQL)
	var total int
	if err := r.db.Pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQ := fmt.Sprintf(`
		SELECT l.id, l.provider_id, l.kind, l.company_name, l.driver_names, l.vehicle_brand,
			l.vehicle_photo_url, l.price_amount, l.price_currency, l.seats_total,
			l.parcels_accepted, l.parcels_terms, l.depart_time::text, l.arrive_time_approx::text,
			l.status, l.created_at, l.updated_at,
			COALESCE(NULLIF(l.company_name, ''), p.display_name) AS provider_name,
			p.website_slug
		FROM transport_listings l
		JOIN providers p ON p.id = l.provider_id%s
		WHERE %s
		ORDER BY l.updated_at DESC
		LIMIT $%d OFFSET $%d`, joinCarrier, whereSQL, argN, argN+1)
	args = append(args, p.Limit, p.Offset)

	rows, err := r.db.Pool.Query(ctx, listQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []domain.TransportListing
	for rows.Next() {
		var item domain.TransportListing
		var arriveTime *string
		if err := rows.Scan(
			&item.ID, &item.ProviderID, &item.Kind, &item.CompanyName, &item.DriverNames,
			&item.VehicleBrand, &item.VehiclePhotoURL, &item.PriceAmount, &item.PriceCurrency,
			&item.SeatsTotal, &item.ParcelsAccepted, &item.ParcelsTerms, &item.DepartTime, &arriveTime,
			&item.Status, &item.CreatedAt, &item.UpdatedAt, &item.ProviderName, &item.ProviderSlug,
		); err != nil {
			return nil, 0, err
		}
		if arriveTime != nil {
			item.ArriveTimeApprox = *arriveTime
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	for i := range items {
		stops, err := r.ListStops(ctx, items[i].ID)
		if err != nil {
			return nil, 0, err
		}
		items[i].Stops = stops
		deps, err := r.ListDepartures(ctx, items[i].ID)
		if err != nil {
			return nil, 0, err
		}
		items[i].Departures = deps
	}

	return items, total, nil
}

func (r *TransportRepo) GetByID(ctx context.Context, id int64) (*domain.TransportListing, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT l.id, l.provider_id, l.kind, l.company_name, l.driver_names, l.vehicle_brand,
			l.vehicle_photo_url, l.phone, l.email, l.telegram, l.whatsapp, l.viber,
			l.price_amount, l.price_currency, l.seats_total, l.parcels_accepted, l.parcels_terms,
			l.depart_time::text, l.arrive_time_approx::text, l.status, l.description, l.created_at, l.updated_at,
			COALESCE(NULLIF(l.company_name, ''), p.display_name), p.website_slug
		FROM transport_listings l
		JOIN providers p ON p.id = l.provider_id
		WHERE l.id = $1`, id)
	var item domain.TransportListing
	var arriveTime *string
	err := row.Scan(
		&item.ID, &item.ProviderID, &item.Kind, &item.CompanyName, &item.DriverNames,
		&item.VehicleBrand, &item.VehiclePhotoURL, &item.Phone, &item.Email, &item.Telegram,
		&item.Whatsapp, &item.Viber, &item.PriceAmount, &item.PriceCurrency, &item.SeatsTotal,
		&item.ParcelsAccepted, &item.ParcelsTerms, &item.DepartTime, &arriveTime,
		&item.Status, &item.Description, &item.CreatedAt, &item.UpdatedAt, &item.ProviderName, &item.ProviderSlug,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if arriveTime != nil {
		item.ArriveTimeApprox = *arriveTime
	}
	stops, err := r.ListStops(ctx, id)
	if err != nil {
		return nil, err
	}
	item.Stops = stops
	deps, err := r.ListDepartures(ctx, id)
	if err != nil {
		return nil, err
	}
	item.Departures = deps
	return &item, nil
}

func (r *TransportRepo) ListByProvider(ctx context.Context, providerID int64) ([]domain.TransportListing, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, provider_id, kind, company_name, driver_names, vehicle_brand, vehicle_photo_url,
			phone, email, telegram, whatsapp, viber, price_amount, price_currency, seats_total,
			parcels_accepted, parcels_terms, depart_time::text, arrive_time_approx::text,
			status, created_at, updated_at
		FROM transport_listings WHERE provider_id = $1 ORDER BY updated_at DESC`, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []domain.TransportListing
	for rows.Next() {
		var item domain.TransportListing
		var arriveTime *string
		if err := rows.Scan(
			&item.ID, &item.ProviderID, &item.Kind, &item.CompanyName, &item.DriverNames,
			&item.VehicleBrand, &item.VehiclePhotoURL, &item.Phone, &item.Email, &item.Telegram,
			&item.Whatsapp, &item.Viber, &item.PriceAmount, &item.PriceCurrency, &item.SeatsTotal,
			&item.ParcelsAccepted, &item.ParcelsTerms, &item.DepartTime, &arriveTime,
			&item.Status, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if arriveTime != nil {
			item.ArriveTimeApprox = *arriveTime
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for i := range items {
		stops, err := r.ListStops(ctx, items[i].ID)
		if err != nil {
			return nil, err
		}
		items[i].Stops = stops
		deps, err := r.ListDepartures(ctx, items[i].ID)
		if err != nil {
			return nil, err
		}
		items[i].Departures = deps
	}
	return items, nil
}

func (r *TransportRepo) ListStops(ctx context.Context, listingID int64) ([]domain.TransportStop, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT s.id, s.listing_id, s.city_id, c.name, c.slug, co.name, s.sort_order
		FROM transport_listing_stops s
		JOIN cities c ON c.id = s.city_id
		LEFT JOIN countries co ON co.id = c.country_id
		WHERE s.listing_id = $1 ORDER BY s.sort_order`, listingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.TransportStop
	for rows.Next() {
		var s domain.TransportStop
		var countryName *string
		if err := rows.Scan(&s.ID, &s.ListingID, &s.CityID, &s.CityName, &s.CitySlug, &countryName, &s.SortOrder); err != nil {
			return nil, err
		}
		if countryName != nil {
			s.CountryName = *countryName
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *TransportRepo) ListDepartures(ctx context.Context, listingID int64) ([]domain.TransportDeparture, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, listing_id, depart_on::text, arrive_on::text, seats_left
		FROM transport_listing_departures
		WHERE listing_id = $1 ORDER BY depart_on`, listingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.TransportDeparture
	for rows.Next() {
		var d domain.TransportDeparture
		var arriveOn *string
		if err := rows.Scan(&d.ID, &d.ListingID, &d.DepartOn, &arriveOn, &d.SeatsLeft); err != nil {
			return nil, err
		}
		if arriveOn != nil {
			d.ArriveOn = *arriveOn
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *TransportRepo) Create(ctx context.Context, listing *domain.TransportListing) (int64, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	var id int64
	var arriveTime *string
	if listing.ArriveTimeApprox != "" {
		arriveTime = &listing.ArriveTimeApprox
	}
	err = tx.QueryRow(ctx, `
		INSERT INTO transport_listings (
			provider_id, kind, company_name, driver_names, vehicle_brand, vehicle_photo_url,
			phone, email, telegram, whatsapp, viber, price_amount, price_currency, seats_total,
			parcels_accepted, parcels_terms, depart_time, arrive_time_approx, status, description
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::time,$18::time,$19,$20)
		RETURNING id`,
		listing.ProviderID, listing.Kind, listing.CompanyName, listing.DriverNames,
		listing.VehicleBrand, listing.VehiclePhotoURL, listing.Phone, listing.Email,
		listing.Telegram, listing.Whatsapp, listing.Viber, listing.PriceAmount, listing.PriceCurrency,
		listing.SeatsTotal, listing.ParcelsAccepted, listing.ParcelsTerms, listing.DepartTime,
		arriveTime, listing.Status, listing.Description,
	).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := r.replaceStopsTx(ctx, tx, id, listing.Stops); err != nil {
		return 0, err
	}
	if err := r.replaceDeparturesTx(ctx, tx, id, listing.Departures); err != nil {
		return 0, err
	}
	return id, tx.Commit(ctx)
}

func (r *TransportRepo) Update(ctx context.Context, listing *domain.TransportListing) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var arriveTime *string
	if listing.ArriveTimeApprox != "" {
		arriveTime = &listing.ArriveTimeApprox
	}
	tag, err := tx.Exec(ctx, `
		UPDATE transport_listings SET
			kind=$2, company_name=$3, driver_names=$4, vehicle_brand=$5, vehicle_photo_url=$6,
			phone=$7, email=$8, telegram=$9, whatsapp=$10, viber=$11,
			price_amount=$12, price_currency=$13, seats_total=$14,
			parcels_accepted=$15, parcels_terms=$16, depart_time=$17::time,
			arrive_time_approx=$18::time, status=$19, description=$20, updated_at=NOW()
		WHERE id=$1 AND provider_id=$21`,
		listing.ID, listing.Kind, listing.CompanyName, listing.DriverNames, listing.VehicleBrand,
		listing.VehiclePhotoURL, listing.Phone, listing.Email, listing.Telegram, listing.Whatsapp,
		listing.Viber, listing.PriceAmount, listing.PriceCurrency, listing.SeatsTotal,
		listing.ParcelsAccepted, listing.ParcelsTerms, listing.DepartTime, arriveTime,
		listing.Status, listing.Description, listing.ProviderID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	if err := r.replaceStopsTx(ctx, tx, listing.ID, listing.Stops); err != nil {
		return err
	}
	if err := r.replaceDeparturesTx(ctx, tx, listing.ID, listing.Departures); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *TransportRepo) Delete(ctx context.Context, providerID, listingID int64) error {
	tag, err := r.db.Pool.Exec(ctx, `DELETE FROM transport_listings WHERE id=$1 AND provider_id=$2`, listingID, providerID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *TransportRepo) SetStatus(ctx context.Context, listingID int64, status string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE transport_listings SET status=$2, updated_at=NOW() WHERE id=$1`, listingID, status)
	return err
}

func (r *TransportRepo) replaceStopsTx(ctx context.Context, tx pgx.Tx, listingID int64, stops []domain.TransportStop) error {
	if _, err := tx.Exec(ctx, `DELETE FROM transport_listing_stops WHERE listing_id=$1`, listingID); err != nil {
		return err
	}
	for _, s := range stops {
		if s.CityID == 0 {
			continue
		}
		order := s.SortOrder
		if order <= 0 {
			order = 1
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO transport_listing_stops (listing_id, city_id, sort_order) VALUES ($1,$2,$3)`,
			listingID, s.CityID, order); err != nil {
			return err
		}
	}
	return nil
}

func (r *TransportRepo) replaceDeparturesTx(ctx context.Context, tx pgx.Tx, listingID int64, deps []domain.TransportDeparture) error {
	if _, err := tx.Exec(ctx, `DELETE FROM transport_listing_departures WHERE listing_id=$1`, listingID); err != nil {
		return err
	}
	for _, d := range deps {
		if d.DepartOn == "" {
			continue
		}
		var arriveOn *string
		if d.ArriveOn != "" {
			arriveOn = &d.ArriveOn
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO transport_listing_departures (listing_id, depart_on, arrive_on, seats_left)
			VALUES ($1, $2::date, $3::date, $4)`,
			listingID, d.DepartOn, arriveOn, d.SeatsLeft); err != nil {
			return err
		}
	}
	return nil
}

func (r *TransportRepo) ListPendingModeration(ctx context.Context) ([]domain.TransportListing, error) {
	return r.ListAdmin(ctx, domain.TransportListingPending, 200)
}

func (r *TransportRepo) ListAdmin(ctx context.Context, status string, limit int) ([]domain.TransportListing, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	q := `
		SELECT l.id, l.provider_id, l.kind, l.company_name, l.driver_names, l.vehicle_brand,
			l.vehicle_photo_url, l.price_amount, l.price_currency, l.seats_total,
			l.parcels_accepted, l.parcels_terms, l.depart_time::text, l.arrive_time_approx::text,
			l.status, l.created_at, l.updated_at,
			COALESCE(NULLIF(l.company_name, ''), p.display_name), p.website_slug
		FROM transport_listings l
		JOIN providers p ON p.id = l.provider_id`
	args := []any{}
	if status != "" {
		q += ` WHERE l.status = $1`
		args = append(args, status)
	}
	q += fmt.Sprintf(` ORDER BY l.created_at DESC LIMIT %d`, limit)
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []domain.TransportListing
	for rows.Next() {
		var item domain.TransportListing
		var arriveTime *string
		if err := rows.Scan(
			&item.ID, &item.ProviderID, &item.Kind, &item.CompanyName, &item.DriverNames,
			&item.VehicleBrand, &item.VehiclePhotoURL, &item.PriceAmount, &item.PriceCurrency,
			&item.SeatsTotal, &item.ParcelsAccepted, &item.ParcelsTerms, &item.DepartTime, &arriveTime,
			&item.Status, &item.CreatedAt, &item.UpdatedAt, &item.ProviderName, &item.ProviderSlug,
		); err != nil {
			return nil, err
		}
		if arriveTime != nil {
			item.ArriveTimeApprox = *arriveTime
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func ParseTransportDate(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}
