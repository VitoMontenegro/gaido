package telegram

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

type Client struct {
	TelegramUserID int64
	Username       string
	FirstName      string
	ThreadID       *int64
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type MessageLink struct {
	ID                 int64
	TelegramUserID     int64
	OriginalMessageID  int64
	ForwardedMessageID *int64
	ThreadID           *int64
	CreatedAt          time.Time
}

type Repo struct {
	db *postgres.DB
}

func NewRepo(db *postgres.DB) *Repo {
	return &Repo{db: db}
}

func advisoryLockKey(userID int64) int64 {
	return int64(0x7467626F74000000) ^ userID
}

func (r *Repo) execInTx(ctx context.Context, userID int64, fn func(ctx context.Context, tx pgx.Tx) error) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock($1)`, advisoryLockKey(userID)); err != nil {
		return err
	}
	if err := fn(ctx, tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repo) UpsertClient(ctx context.Context, tx pgx.Tx, userID int64, username, firstName string) (*Client, error) {
	row := tx.QueryRow(ctx, `
		INSERT INTO telegram_clients (telegram_user_id, username, first_name)
		VALUES ($1, $2, $3)
		ON CONFLICT (telegram_user_id) DO UPDATE SET
			username = EXCLUDED.username,
			first_name = EXCLUDED.first_name,
			updated_at = NOW()
		RETURNING telegram_user_id, username, first_name, thread_id, created_at, updated_at
	`, userID, nullIfEmpty(username), nullIfEmpty(firstName))

	return scanClient(row)
}

func (r *Repo) GetClient(ctx context.Context, tx pgx.Tx, userID int64) (*Client, error) {
	row := tx.QueryRow(ctx, `
		SELECT telegram_user_id, username, first_name, thread_id, created_at, updated_at
		FROM telegram_clients WHERE telegram_user_id = $1
	`, userID)
	return scanClient(row)
}

func (r *Repo) SetClientThread(ctx context.Context, tx pgx.Tx, userID int64, threadID *int64) error {
	_, err := tx.Exec(ctx, `
		UPDATE telegram_clients SET thread_id = $2, updated_at = NOW()
		WHERE telegram_user_id = $1
	`, userID, threadID)
	return err
}

func (r *Repo) SaveMessageLink(ctx context.Context, tx pgx.Tx, userID, originalMsgID int64, threadID *int64) (int64, error) {
	var id int64
	err := tx.QueryRow(ctx, `
		INSERT INTO telegram_message_links (telegram_user_id, original_message_id, thread_id)
		VALUES ($1, $2, $3)
		RETURNING id
	`, userID, originalMsgID, threadID).Scan(&id)
	return id, err
}

func (r *Repo) UpdateForwardedMessageID(ctx context.Context, tx pgx.Tx, linkID int64, forwardedID int64, threadID *int64) error {
	_, err := tx.Exec(ctx, `
		UPDATE telegram_message_links
		SET forwarded_message_id = $2, thread_id = COALESCE($3, thread_id)
		WHERE id = $1
	`, linkID, forwardedID, threadID)
	return err
}

func (r *Repo) GetClientByForwardedMessage(ctx context.Context, forwardedID int64) (*Client, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT c.telegram_user_id, c.username, c.first_name, c.thread_id, c.created_at, c.updated_at
		FROM telegram_message_links l
		JOIN telegram_clients c ON c.telegram_user_id = l.telegram_user_id
		WHERE l.forwarded_message_id = $1
		ORDER BY l.id DESC
		LIMIT 1
	`, forwardedID)
	return scanClient(row)
}

func (r *Repo) GetClientByThreadID(ctx context.Context, threadID int64) (*Client, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT telegram_user_id, username, first_name, thread_id, created_at, updated_at
		FROM telegram_clients
		WHERE thread_id = $1
	`, threadID)
	return scanClient(row)
}

func scanClient(row pgx.Row) (*Client, error) {
	var c Client
	var username, firstName *string
	err := row.Scan(&c.TelegramUserID, &username, &firstName, &c.ThreadID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if username != nil {
		c.Username = *username
	}
	if firstName != nil {
		c.FirstName = *firstName
	}
	return &c, nil
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
