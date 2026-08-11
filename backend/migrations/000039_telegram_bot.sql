-- +goose Up
CREATE TABLE telegram_clients (
    telegram_user_id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    thread_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telegram_clients_thread ON telegram_clients (thread_id) WHERE thread_id IS NOT NULL;

CREATE TABLE telegram_message_links (
    id BIGSERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL REFERENCES telegram_clients (telegram_user_id) ON DELETE CASCADE,
    original_message_id BIGINT NOT NULL,
    forwarded_message_id BIGINT,
    thread_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telegram_message_links_forwarded ON telegram_message_links (forwarded_message_id)
    WHERE forwarded_message_id IS NOT NULL;

CREATE INDEX idx_telegram_message_links_user_created ON telegram_message_links (telegram_user_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS telegram_message_links;
DROP TABLE IF EXISTS telegram_clients;
