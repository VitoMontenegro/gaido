-- +goose Up
ALTER TABLE guide_profiles
    ADD COLUMN IF NOT EXISTS viber VARCHAR(50) NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE guide_profiles
    DROP COLUMN IF EXISTS viber;
