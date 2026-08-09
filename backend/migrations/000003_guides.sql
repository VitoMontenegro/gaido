-- +goose Up
CREATE TABLE guide_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    guide_type VARCHAR(20) NOT NULL DEFAULT 'GUIDE',
    first_name VARCHAR(100) NOT NULL DEFAULT '',
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    display_name VARCHAR(255) NOT NULL DEFAULT '',
    about TEXT NOT NULL DEFAULT '',
    website_slug VARCHAR(150) NOT NULL UNIQUE,
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count INT NOT NULL DEFAULT 0,
    preferred_contact_method VARCHAR(20) NOT NULL DEFAULT 'phone',
    phone VARCHAR(50) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    telegram VARCHAR(100) NOT NULL DEFAULT '',
    whatsapp VARCHAR(50) NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    last_shown_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE guide_cities (
    id BIGSERIAL PRIMARY KEY,
    guide_id BIGINT NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
    city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(guide_id, city_id)
);

CREATE TABLE guide_languages (
    guide_id BIGINT NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    PRIMARY KEY (guide_id, language)
);

CREATE TABLE guide_specializations (
    guide_id BIGINT NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
    specialization VARCHAR(100) NOT NULL,
    PRIMARY KEY (guide_id, specialization)
);

CREATE INDEX idx_guide_profiles_status ON guide_profiles(status);
CREATE INDEX idx_guide_profiles_slug ON guide_profiles(website_slug);

-- +goose Down
DROP TABLE IF EXISTS guide_specializations;
DROP TABLE IF EXISTS guide_languages;
DROP TABLE IF EXISTS guide_cities;
DROP TABLE IF EXISTS guide_profiles;
