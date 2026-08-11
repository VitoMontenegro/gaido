package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

type CalendarRepo struct{ db *DB }

func NewCalendarRepo(db *DB) *CalendarRepo { return &CalendarRepo{db: db} }

type Slot struct {
	ID       int64     `json:"id"`
	GuideID  int64     `json:"guide_id"`
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
	Note     string    `json:"note"`
}

type ExcursionDate struct {
	ID          int64     `json:"id"`
	ExcursionID int64     `json:"excursion_id"`
	StartsAt    time.Time `json:"starts_at"`
	EndsAt      time.Time `json:"ends_at"`
}

type PublicDate struct {
	ID       int64     `json:"id"`
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
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

func (r *CalendarRepo) ListUpcomingByGuide(ctx context.Context, guideID int64, from, to time.Time) ([]PublicDate, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, starts_at, ends_at FROM guide_availability_slots
		WHERE guide_id=$1 AND ends_at > NOW() AND starts_at >= $2 AND starts_at < $3
		ORDER BY starts_at`, guideID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPublicDates(rows)
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

func (r *CalendarRepo) ListExcursionDates(ctx context.Context, excursionID int64) ([]ExcursionDate, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, excursion_id, starts_at, ends_at FROM excursion_dates
		WHERE excursion_id=$1 ORDER BY starts_at`, excursionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ExcursionDate
	for rows.Next() {
		var d ExcursionDate
		if err := rows.Scan(&d.ID, &d.ExcursionID, &d.StartsAt, &d.EndsAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *CalendarRepo) ListUpcomingExcursionDates(ctx context.Context, excursionID int64, from, to time.Time) ([]PublicDate, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, starts_at, ends_at FROM excursion_dates
		WHERE excursion_id=$1 AND ends_at > NOW() AND starts_at >= $2 AND starts_at < $3
		ORDER BY starts_at`, excursionID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPublicDates(rows)
}

func (r *CalendarRepo) CreateExcursionDate(ctx context.Context, excursionID int64, start, end time.Time) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO excursion_dates (excursion_id, starts_at, ends_at) VALUES ($1,$2,$3)
		ON CONFLICT (excursion_id, starts_at) DO NOTHING RETURNING id`, excursionID, start, end).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return id, nil
}

func (r *CalendarRepo) DeleteExcursionDate(ctx context.Context, excursionID, dateID int64) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM excursion_dates WHERE id=$1 AND excursion_id=$2`, dateID, excursionID)
	return err
}

func scanPublicDates(rows interface {
	Next() bool
	Scan(dest ...any) error
}) ([]PublicDate, error) {
	var out []PublicDate
	for rows.Next() {
		var d PublicDate
		if err := rows.Scan(&d.ID, &d.StartsAt, &d.EndsAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, nil
}
