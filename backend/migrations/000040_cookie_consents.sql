-- +goose Up
CREATE TABLE cookie_consents (
    id BIGSERIAL PRIMARY KEY,
    consent_token VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT REFERENCES users(id),
    ip VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    accept_language TEXT,
    referer TEXT,
    page_url TEXT,
    browser_info JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cookie_consents_created ON cookie_consents(created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS cookie_consents;
