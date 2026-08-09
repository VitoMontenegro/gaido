-- +goose Up
CREATE TABLE excursion_categories (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE excursions (
    id BIGSERIAL PRIMARY KEY,
    guide_id BIGINT NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
    city_id BIGINT NOT NULL REFERENCES cities(id),
    category_id BIGINT REFERENCES excursion_categories(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    max_guests INT NOT NULL DEFAULT 1 CHECK (max_guests >= 1),
    price_from NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(guide_id, slug)
);

CREATE INDEX idx_excursions_status ON excursions(status);
CREATE INDEX idx_excursions_city ON excursions(city_id);
CREATE INDEX idx_excursions_guide ON excursions(guide_id);

-- +goose Down
DROP TABLE IF EXISTS excursions;
DROP TABLE IF EXISTS excursion_categories;
