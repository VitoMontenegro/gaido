-- Allow re-registration after soft delete: uniqueness only for active users.
-- +goose Up
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_login_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active ON users (email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_active ON users (login) WHERE deleted_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_users_login_active;
DROP INDEX IF EXISTS idx_users_email_active;

ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT users_login_key UNIQUE (login);
