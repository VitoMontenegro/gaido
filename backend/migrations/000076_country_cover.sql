-- +goose Up
ALTER TABLE countries
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE countries
    DROP COLUMN IF EXISTS cover_image_url;
