-- +goose Up
CREATE TABLE media (
    id BIGSERIAL PRIMARY KEY,
    owner_type VARCHAR(30) NOT NULL,
    owner_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL,
    storage_key TEXT NOT NULL,
    public_storage_key TEXT NOT NULL DEFAULT '',
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    checksum VARCHAR(128) NOT NULL DEFAULT '',
    width INT,
    height INT,
    status VARCHAR(20) NOT NULL DEFAULT 'READY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_owner ON media(owner_type, owner_id);

-- +goose Down
DROP TABLE IF EXISTS media;
