-- +goose Up
ALTER TABLE excursions
    ADD COLUMN IF NOT EXISTS structured_content JSONB NOT NULL DEFAULT '{}'::jsonb;

-- +goose Down
ALTER TABLE excursions
    DROP COLUMN IF EXISTS structured_content;
