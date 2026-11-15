package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type UserIdentityRepo struct{ db *DB }

func NewUserIdentityRepo(db *DB) *UserIdentityRepo { return &UserIdentityRepo{db: db} }

func (r *UserIdentityRepo) Get(ctx context.Context, provider, issuer, subject string) (*domain.UserIdentity, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, user_id, provider, issuer, subject, connected_at, last_login_at
		FROM user_identities WHERE provider=$1 AND issuer=$2 AND subject=$3
	`, provider, issuer, subject)
	return scanIdentity(row)
}

func (r *UserIdentityRepo) ListByUser(ctx context.Context, userID int64) ([]domain.UserIdentity, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, user_id, provider, issuer, subject, connected_at, last_login_at
		FROM user_identities WHERE user_id=$1 ORDER BY connected_at
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.UserIdentity, 0)
	for rows.Next() {
		var it domain.UserIdentity
		if err := rows.Scan(&it.ID, &it.UserID, &it.Provider, &it.Issuer, &it.Subject, &it.ConnectedAt, &it.LastLoginAt); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (r *UserIdentityRepo) Insert(ctx context.Context, userID int64, provider, issuer, subject string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO user_identities (user_id, provider, issuer, subject)
		VALUES ($1,$2,$3,$4)
	`, userID, provider, issuer, subject)
	return err
}

func (r *UserIdentityRepo) TouchLogin(ctx context.Context, id int64) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE user_identities SET last_login_at=NOW() WHERE id=$1`, id)
	return err
}

func (r *UserIdentityRepo) Delete(ctx context.Context, userID int64, provider string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM user_identities WHERE user_id=$1 AND provider=$2`, userID, provider)
	return err
}

func (r *UserIdentityRepo) DeleteBySubject(ctx context.Context, provider, issuer, subject string) error {
	_, err := r.db.Pool.Exec(ctx, `
		DELETE FROM user_identities WHERE provider=$1 AND issuer=$2 AND subject=$3
	`, provider, issuer, subject)
	return err
}

func scanIdentity(row pgx.Row) (*domain.UserIdentity, error) {
	var it domain.UserIdentity
	err := row.Scan(&it.ID, &it.UserID, &it.Provider, &it.Issuer, &it.Subject, &it.ConnectedAt, &it.LastLoginAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &it, err
}

func (r *UserIdentityRepo) RecordConsent(ctx context.Context, userID int64, documentKey, version string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO user_consents (user_id, document_key, version) VALUES ($1,$2,$3)
	`, userID, documentKey, version)
	return err
}

func (r *UserIdentityRepo) LegalVersion(ctx context.Context) (string, error) {
	var at time.Time
	err := r.db.Pool.QueryRow(ctx, `SELECT COALESCE(updated_at, NOW()) FROM site_settings WHERE key='legal_content'`).Scan(&at)
	if errors.Is(err, pgx.ErrNoRows) {
		return "unknown", nil
	}
	if err != nil {
		return "", err
	}
	return at.UTC().Format(time.RFC3339), nil
}
