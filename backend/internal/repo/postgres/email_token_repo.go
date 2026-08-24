package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type EmailTokenRepo struct{ db *DB }

func NewEmailTokenRepo(db *DB) *EmailTokenRepo { return &EmailTokenRepo{db: db} }

func (r *EmailTokenRepo) Upsert(ctx context.Context, email, purpose, hash string, payload []byte, exp, sent time.Time) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `DELETE FROM email_tokens WHERE email=$1 AND purpose=$2`, email, purpose); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `
		INSERT INTO email_tokens (email, purpose, token_hash, payload, expires_at, last_sent_at)
		VALUES ($1,$2,$3,$4,$5,$6)
	`, email, purpose, hash, payload, exp, sent); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *EmailTokenRepo) GetByHash(ctx context.Context, hash string) (*domain.EmailToken, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, email, purpose, token_hash, payload, expires_at, last_sent_at
		FROM email_tokens WHERE token_hash=$1
	`, hash)
	return scanEmailToken(row)
}

func (r *EmailTokenRepo) GetLatest(ctx context.Context, email, purpose string) (*domain.EmailToken, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, email, purpose, token_hash, payload, expires_at, last_sent_at
		FROM email_tokens WHERE email=$1 AND purpose=$2
		ORDER BY created_at DESC LIMIT 1
	`, email, purpose)
	return scanEmailToken(row)
}

func (r *EmailTokenRepo) ReplaceToken(ctx context.Context, id int64, hash string, exp, sent time.Time) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE email_tokens SET token_hash=$2, expires_at=$3, last_sent_at=$4
		WHERE id=$1
	`, id, hash, exp, sent)
	return err
}

func (r *EmailTokenRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM email_tokens WHERE id=$1`, id)
	return err
}

func scanEmailToken(row pgx.Row) (*domain.EmailToken, error) {
	var t domain.EmailToken
	err := row.Scan(&t.ID, &t.Email, &t.Purpose, &t.TokenHash, &t.Payload, &t.ExpiresAt, &t.LastSentAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &t, err
}
