-- +goose Up
CREATE TABLE email_tokens (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL,
    last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_tokens_email_purpose ON email_tokens (email, purpose);

-- +goose Down
DROP TABLE IF EXISTS email_tokens;
