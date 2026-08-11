-- +goose Up
ALTER TABLE guide_profiles
    ADD COLUMN IF NOT EXISTS response_hours VARCHAR(200) NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE guide_profiles
    DROP COLUMN IF EXISTS response_hours;
