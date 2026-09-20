-- +goose Up
CREATE TABLE place_pages (
    id BIGSERIAL PRIMARY KEY,
    place_type VARCHAR(16) NOT NULL CHECK (place_type IN ('country', 'city')),
    place_id BIGINT NOT NULL,
    intro_html TEXT NOT NULL DEFAULT '',
    seo_title VARCHAR(255) NOT NULL DEFAULT '',
    seo_description VARCHAR(512) NOT NULL DEFAULT '',
    seo_image_url TEXT NOT NULL DEFAULT '',
    faq JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (place_type, place_id)
);

CREATE INDEX idx_place_pages_type_id ON place_pages (place_type, place_id);

-- +goose Down
DROP TABLE IF EXISTS place_pages;
