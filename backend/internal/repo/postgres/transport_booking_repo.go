package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type TransportBookingRepo struct{ db *DB }

func NewTransportBookingRepo(db *DB) *TransportBookingRepo { return &TransportBookingRepo{db: db} }

func (r *TransportBookingRepo) Create(ctx context.Context, b domain.TransportBooking) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO transport_bookings (
			listing_id, departure_id, user_id, provider_id, seats,
			passenger_name, passenger_phone, passenger_email, comment, status
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
		b.ListingID, b.DepartureID, b.UserID, b.ProviderID, b.Seats,
		b.PassengerName, b.PassengerPhone, b.PassengerEmail, b.Comment, b.Status,
	).Scan(&id)
	return id, err
}

func (r *TransportBookingRepo) GetByID(ctx context.Context, id int64) (*domain.TransportBooking, error) {
	return r.scanBooking(r.db.Pool.QueryRow(ctx, bookingSelectSQL+` WHERE b.id=$1`, id))
}

const bookingSelectSQL = `
	SELECT b.id, b.listing_id, b.departure_id, b.user_id, b.provider_id, b.seats,
		b.passenger_name, b.passenger_phone, b.passenger_email, b.comment, b.status,
		b.created_at, b.updated_at,
		COALESCE(d.depart_on::text, ''),
		COALESCE(NULLIF(l.company_name, ''), l.driver_names, NULLIF(cp.display_name, ''), p.display_name),
		l.price_amount, l.price_currency,
		COALESCE(NULLIF(cp.display_name, ''), p.display_name),
		COALESCE(NULLIF(cp.website_slug, ''), p.website_slug)
	FROM transport_bookings b
	JOIN transport_listings l ON l.id = b.listing_id
	JOIN providers p ON p.id = b.provider_id
	LEFT JOIN carrier_profiles cp ON cp.provider_id = p.id
	LEFT JOIN transport_listing_departures d ON d.id = b.departure_id`

func (r *TransportBookingRepo) scanBooking(row pgx.Row) (*domain.TransportBooking, error) {
	var b domain.TransportBooking
	var depID *int64
	err := row.Scan(
		&b.ID, &b.ListingID, &depID, &b.UserID, &b.ProviderID, &b.Seats,
		&b.PassengerName, &b.PassengerPhone, &b.PassengerEmail, &b.Comment, &b.Status,
		&b.CreatedAt, &b.UpdatedAt, &b.DepartOn, &b.ListingTitle,
		&b.PriceAmount, &b.PriceCurrency, &b.ProviderName, &b.ProviderSlug,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	b.DepartureID = depID
	return &b, nil
}

func (r *TransportBookingRepo) ListByUser(ctx context.Context, userID int64) ([]domain.TransportBooking, error) {
	rows, err := r.db.Pool.Query(ctx, bookingSelectSQL+`
		WHERE b.user_id=$1 ORDER BY b.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanBookings(rows)
}

func (r *TransportBookingRepo) ListByProviderID(ctx context.Context, providerID int64) ([]domain.TransportBooking, error) {
	rows, err := r.db.Pool.Query(ctx, bookingSelectSQL+`
		WHERE b.provider_id=$1 ORDER BY b.created_at DESC`, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanBookings(rows)
}

func (r *TransportBookingRepo) scanBookings(rows pgx.Rows) ([]domain.TransportBooking, error) {
	var items []domain.TransportBooking
	for rows.Next() {
		var b domain.TransportBooking
		var depID *int64
		if err := rows.Scan(
			&b.ID, &b.ListingID, &depID, &b.UserID, &b.ProviderID, &b.Seats,
			&b.PassengerName, &b.PassengerPhone, &b.PassengerEmail, &b.Comment, &b.Status,
			&b.CreatedAt, &b.UpdatedAt, &b.DepartOn, &b.ListingTitle,
			&b.PriceAmount, &b.PriceCurrency, &b.ProviderName, &b.ProviderSlug,
		); err != nil {
			return nil, err
		}
		b.DepartureID = depID
		items = append(items, b)
	}
	return items, rows.Err()
}

func (r *TransportBookingRepo) SetStatus(ctx context.Context, id, providerID int64, status string) error {
	tag, err := r.db.Pool.Exec(ctx, `
		UPDATE transport_bookings SET status=$3, updated_at=NOW()
		WHERE id=$1 AND provider_id=$2`, id, providerID, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *TransportBookingRepo) CountActiveSeats(ctx context.Context, listingID int64, departureID *int64) (int, error) {
	var n int
	if departureID != nil && *departureID > 0 {
		err := r.db.Pool.QueryRow(ctx, `
			SELECT COALESCE(SUM(seats), 0) FROM transport_bookings
			WHERE listing_id=$1 AND departure_id=$2 AND status IN ('pending', 'confirmed')`,
			listingID, *departureID).Scan(&n)
		return n, err
	}
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(seats), 0) FROM transport_bookings
		WHERE listing_id=$1 AND status IN ('pending', 'confirmed')`, listingID).Scan(&n)
	return n, err
}

func (r *TransportBookingRepo) ListCompanions(ctx context.Context, listingID int64, departureID *int64, limit int) ([]map[string]any, error) {
	if limit <= 0 {
		limit = 10
	}
	args := []any{listingID, domain.TransportBookingCancelled}
	q := `
		SELECT b.seats, b.passenger_name, b.status
		FROM transport_bookings b
		WHERE b.listing_id=$1 AND b.status <> $2`
	argN := 3
	if departureID != nil && *departureID > 0 {
		q += fmt.Sprintf(` AND b.departure_id=$%d`, argN)
		args = append(args, *departureID)
		argN++
	}
	q += fmt.Sprintf(` ORDER BY b.created_at DESC LIMIT $%d`, argN)
	args = append(args, limit)

	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var seats int
		var name, status string
		if err := rows.Scan(&seats, &name, &status); err != nil {
			return nil, err
		}
		initials := "?"
		if name != "" {
			runes := []rune(name)
			if len(runes) > 0 {
				initials = string(runes[0]) + "."
			}
		}
		out = append(out, map[string]any{
			"seats": seats, "name": initials, "status": status,
		})
	}
	return out, rows.Err()
}
