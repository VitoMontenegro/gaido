package postgres

import (
	"context"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

type AuditRepo struct{ db *DB }

func NewAuditRepo(db *DB) *AuditRepo { return &AuditRepo{db: db} }

func (r *AuditRepo) Log(ctx context.Context, actorID *int64, action, entityType string, entityID *int64, oldVal, newVal, ip, ua string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, ip, user_agent)
		VALUES ($1,$2,$3,$4, NULLIF($5,'')::jsonb, NULLIF($6,'')::jsonb, $7, $8)
	`, actorID, action, entityType, entityID, oldVal, newVal, ip, ua)
	return err
}

func (r *AuditRepo) ListRecent(ctx context.Context, limit int) ([]domain.AuditLogEntry, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, actor_id, action, entity_type, entity_id, created_at
		FROM audit_logs ORDER BY id DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []domain.AuditLogEntry
	for rows.Next() {
		var e domain.AuditLogEntry
		if err := rows.Scan(&e.ID, &e.ActorID, &e.Action, &e.EntityType, &e.EntityID, &e.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	return items, rows.Err()
}
