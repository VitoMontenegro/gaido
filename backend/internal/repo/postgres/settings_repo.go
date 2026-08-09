package postgres

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
)

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
