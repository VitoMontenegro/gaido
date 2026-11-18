package postgres

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

type WizardEvent struct {
	ExcursionID *int64
	SessionID   string
	Event       string
	Step        string
	Meta        json.RawMessage
}

type WizardEventsRepo struct{ db *DB }

func NewWizardEventsRepo(db *DB) *WizardEventsRepo { return &WizardEventsRepo{db: db} }

// InsertBatch записує пачку подій одним round-trip.
func (r *WizardEventsRepo) InsertBatch(ctx context.Context, guideID int64, events []WizardEvent) error {
	if len(events) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	for _, e := range events {
		meta := e.Meta
		if len(meta) == 0 {
			meta = json.RawMessage(`{}`)
		}
		batch.Queue(`
			INSERT INTO excursion_wizard_events (guide_id, excursion_id, session_id, event, step, meta)
			VALUES ($1, (SELECT id FROM excursions WHERE id=$2 AND guide_id=$1), $3, $4, $5, $6)`,
			guideID, e.ExcursionID, e.SessionID, e.Event, e.Step, meta)
	}
	res := r.db.Pool.SendBatch(ctx, batch)
	defer res.Close()
	for range events {
		if _, err := res.Exec(); err != nil {
			return err
		}
	}
	return nil
}
