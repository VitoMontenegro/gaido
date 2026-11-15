-- +goose Up
ALTER TABLE excursions ADD COLUMN IF NOT EXISTS description_html TEXT;

-- +goose Down
ALTER TABLE excursions DROP COLUMN IF EXISTS description_html;
