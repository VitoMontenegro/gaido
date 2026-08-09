-- +goose Up
ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE guide_profiles DROP COLUMN IF EXISTS avatar_url;
