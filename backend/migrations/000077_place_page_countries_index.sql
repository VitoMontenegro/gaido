-- +goose Up
ALTER TABLE place_pages DROP CONSTRAINT IF EXISTS place_pages_place_type_check;
ALTER TABLE place_pages ADD CONSTRAINT place_pages_place_type_check
    CHECK (place_type IN ('country', 'city', 'countries_index'));

ALTER TABLE place_pages ADD COLUMN IF NOT EXISTS heading VARCHAR(120) NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE place_pages DROP COLUMN IF EXISTS heading;

ALTER TABLE place_pages DROP CONSTRAINT IF EXISTS place_pages_place_type_check;
ALTER TABLE place_pages ADD CONSTRAINT place_pages_place_type_check
    CHECK (place_type IN ('country', 'city'));
