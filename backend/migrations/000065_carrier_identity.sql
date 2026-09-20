-- +goose Up
ALTER TABLE carrier_profiles
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS website_slug VARCHAR(150) NOT NULL DEFAULT '';

UPDATE carrier_profiles cp
SET display_name = p.display_name,
    website_slug = p.website_slug
FROM providers p
WHERE p.id = cp.provider_id
  AND (cp.display_name = '' OR cp.website_slug = '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_carrier_profiles_slug
    ON carrier_profiles (website_slug)
    WHERE website_slug <> '';

-- +goose Down
DROP INDEX IF EXISTS idx_carrier_profiles_slug;
ALTER TABLE carrier_profiles
    DROP COLUMN IF EXISTS display_name,
    DROP COLUMN IF EXISTS website_slug;
