-- +goose Up
ALTER TABLE excursions
    ADD COLUMN IF NOT EXISTS included_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS excluded_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- +goose Down
ALTER TABLE excursions
    DROP COLUMN IF EXISTS included_items,
    DROP COLUMN IF EXISTS excluded_items;
