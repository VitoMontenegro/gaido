package postgres

import (
	"context"
	"time"
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
