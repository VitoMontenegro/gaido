-- +goose Up
ALTER TABLE guide_profiles ADD COLUMN country_id BIGINT REFERENCES countries(id) ON DELETE SET NULL;
CREATE INDEX idx_guide_profiles_country_id ON guide_profiles(country_id);

-- +goose Down
DROP INDEX IF EXISTS idx_guide_profiles_country_id;
ALTER TABLE guide_profiles DROP COLUMN IF EXISTS country_id;
