-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NOT NULL DEFAULT '';

ALTER TABLE guide_reviews
    ADD COLUMN IF NOT EXISTS excursion_id BIGINT REFERENCES excursions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_guide_reviews_excursion ON guide_reviews(excursion_id);

-- +goose Down
ALTER TABLE guide_reviews DROP COLUMN IF EXISTS excursion_id;
ALTER TABLE users DROP COLUMN IF EXISTS first_name;
ALTER TABLE users DROP COLUMN IF EXISTS last_name;
