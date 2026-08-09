-- +goose Up
ALTER TABLE excursions
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS body_html TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS map_embed_url TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE excursions
    DROP COLUMN IF EXISTS cover_image_url,
    DROP COLUMN IF EXISTS body_html,
    DROP COLUMN IF EXISTS map_embed_url;
