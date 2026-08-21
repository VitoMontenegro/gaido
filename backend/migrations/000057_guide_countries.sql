-- +goose Up
CREATE TABLE guide_countries (
    id BIGSERIAL PRIMARY KEY,
    guide_id BIGINT NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
    country_id BIGINT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(guide_id, country_id)
);

CREATE INDEX idx_guide_countries_guide_id ON guide_countries(guide_id);
CREATE INDEX idx_guide_countries_country_id ON guide_countries(country_id);

INSERT INTO guide_countries (guide_id, country_id, is_primary)
SELECT id, country_id, true
FROM guide_profiles
WHERE country_id IS NOT NULL
ON CONFLICT (guide_id, country_id) DO NOTHING;

INSERT INTO guide_countries (guide_id, country_id, is_primary)
SELECT DISTINCT gc.guide_id, c.country_id, false
FROM guide_cities gc
JOIN cities c ON c.id = gc.city_id
WHERE gc.is_active = true
ON CONFLICT (guide_id, country_id) DO NOTHING;

-- +goose Down
DROP INDEX IF EXISTS idx_guide_countries_country_id;
DROP INDEX IF EXISTS idx_guide_countries_guide_id;
DROP TABLE IF EXISTS guide_countries;
