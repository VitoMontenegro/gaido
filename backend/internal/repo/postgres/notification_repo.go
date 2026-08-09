package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

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

func (r *NotificationRepo) MarkRead(ctx context.Context, userID, id int64) error {
	tag, err := r.db.Pool.Exec(ctx, `
		UPDATE notifications SET read_at = COALESCE(read_at, NOW())
		WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *NotificationRepo) ListRecent(ctx context.Context, userID int64, limit int) ([]map[string]any, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, type, payload, read_at, created_at FROM notifications
		WHERE user_id=$1 ORDER BY id DESC LIMIT $2
	`, userID, limit)
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
