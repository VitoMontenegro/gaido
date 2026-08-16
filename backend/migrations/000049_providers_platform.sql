-- +goose Up
CREATE TABLE service_categories (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE services (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category_id, slug)
);

CREATE TABLE providers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL DEFAULT '',
    business_name VARCHAR(255) NOT NULL DEFAULT '',
    profession VARCHAR(255) NOT NULL DEFAULT '',
    about TEXT NOT NULL DEFAULT '',
    website_slug VARCHAR(150) NOT NULL UNIQUE,
    avatar_url VARCHAR(500) NOT NULL DEFAULT '',
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count INT NOT NULL DEFAULT 0,
    response_hours VARCHAR(30) NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'new',
    phone VARCHAR(50) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    telegram VARCHAR(100) NOT NULL DEFAULT '',
    whatsapp VARCHAR(50) NOT NULL DEFAULT '',
    viber VARCHAR(50) NOT NULL DEFAULT '',
    instagram VARCHAR(100) NOT NULL DEFAULT '',
    facebook VARCHAR(100) NOT NULL DEFAULT '',
    website VARCHAR(500) NOT NULL DEFAULT '',
    primary_city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    languages TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_providers_status ON providers(status);
CREATE INDEX idx_providers_slug ON providers(website_slug);
CREATE INDEX idx_providers_city ON providers(primary_city_id);

CREATE TABLE provider_documents (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL DEFAULT 'other',
    storage_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT '',
    size BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'unchecked',
    expires_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_offerings (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
    category_id BIGINT NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    formats TEXT[] NOT NULL DEFAULT '{}',
    languages TEXT[] NOT NULL DEFAULT '{uk}',
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    has_availability BOOLEAN NOT NULL DEFAULT FALSE,
    event_at TIMESTAMPTZ,
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider_id, slug)
);

CREATE INDEX idx_offerings_provider ON service_offerings(provider_id);
CREATE INDEX idx_offerings_category ON service_offerings(category_id);
CREATE INDEX idx_offerings_status ON service_offerings(status);

CREATE TABLE service_points (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL DEFAULT '',
    address_text VARCHAR(500) NOT NULL DEFAULT '',
    district VARCHAR(255) NOT NULL DEFAULT '',
    address_visibility VARCHAR(20) NOT NULL DEFAULT 'district',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    hours_text VARCHAR(500) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    photo_url VARCHAR(500) NOT NULL DEFAULT '',
    city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_points_provider ON service_points(provider_id);
CREATE INDEX idx_service_points_location ON service_points USING GIST (location);

CREATE TABLE offering_points (
    offering_id BIGINT NOT NULL REFERENCES service_offerings(id) ON DELETE CASCADE,
    point_id BIGINT NOT NULL REFERENCES service_points(id) ON DELETE CASCADE,
    PRIMARY KEY (offering_id, point_id)
);

CREATE TABLE service_zones (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    offering_id BIGINT REFERENCES service_offerings(id) ON DELETE CASCADE,
    zone_kind VARCHAR(20) NOT NULL DEFAULT 'service_area',
    zone_type VARCHAR(30) NOT NULL,
    label VARCHAR(255) NOT NULL DEFAULT '',
    city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    region_id BIGINT REFERENCES regions(id) ON DELETE SET NULL,
    radius_km INT,
    from_city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    to_city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    geom GEOGRAPHY,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_zones_provider ON service_zones(provider_id);
CREATE INDEX idx_service_zones_geom ON service_zones USING GIST (geom);

CREATE TABLE offering_media (
    id BIGSERIAL PRIMARY KEY,
    offering_id BIGINT NOT NULL REFERENCES service_offerings(id) ON DELETE CASCADE,
    media_type VARCHAR(30) NOT NULL DEFAULT 'portfolio',
    storage_key VARCHAR(500) NOT NULL,
    caption VARCHAR(500) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE provider_availability_slots (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    point_id BIGINT REFERENCES service_points(id) ON DELETE CASCADE,
    offering_id BIGINT REFERENCES service_offerings(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    note VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_availability ON provider_availability_slots(provider_id, slot_date);

CREATE TABLE provider_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    plan_id BIGINT NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_id BIGINT REFERENCES payments(id),
    activation_source VARCHAR(30) NOT NULL DEFAULT 'PAYMENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_reviews (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(30) NOT NULL,
    target_id BIGINT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    body TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
    provider_reply TEXT NOT NULL DEFAULT '',
    provider_reply_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(author_id, target_type, target_id)
);

CREATE INDEX idx_platform_reviews_target ON platform_reviews(target_type, target_id);

CREATE TABLE complaints (
    id BIGSERIAL PRIMARY KEY,
    reporter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(30) NOT NULL,
    target_id BIGINT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT REFERENCES providers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL DEFAULT '',
    city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    region_id BIGINT REFERENCES regions(id) ON DELETE SET NULL,
    description TEXT NOT NULL DEFAULT '',
    requirements TEXT NOT NULL DEFAULT '',
    schedule_text VARCHAR(255) NOT NULL DEFAULT '',
    salary_text VARCHAR(255) NOT NULL DEFAULT '',
    language VARCHAR(50) NOT NULL DEFAULT 'uk',
    employment_type VARCHAR(50) NOT NULL DEFAULT '',
    contact_text VARCHAR(500) NOT NULL DEFAULT '',
    contact_url VARCHAR(500) NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_city ON jobs(city_id);
CREATE INDEX idx_jobs_status ON jobs(status);

CREATE TABLE looking_requests (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    region_id BIGINT REFERENCES regions(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    formats TEXT[] NOT NULL DEFAULT '{}',
    languages TEXT[] NOT NULL DEFAULT '{uk}',
    needed_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE looking_responses (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES looking_requests(id) ON DELETE CASCADE,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    message TEXT NOT NULL DEFAULT '',
    offering_id BIGINT REFERENCES service_offerings(id) ON DELETE SET NULL,
    availability_note VARCHAR(500) NOT NULL DEFAULT '',
    formats TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(request_id, provider_id)
);

CREATE TABLE service_suggestions (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category_id BIGINT REFERENCES service_categories(id) ON DELETE SET NULL,
    suggested_category VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to sync location from lat/lng
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION sync_service_point_location() RETURNS TRIGGER AS $func$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_point_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON service_points
    FOR EACH ROW EXECUTE FUNCTION sync_service_point_location();
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER IF EXISTS trg_service_point_location ON service_points;
DROP FUNCTION IF EXISTS sync_service_point_location();
DROP TABLE IF EXISTS service_suggestions;
DROP TABLE IF EXISTS looking_responses;
DROP TABLE IF EXISTS looking_requests;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS platform_reviews;
DROP TABLE IF EXISTS provider_subscriptions;
DROP TABLE IF EXISTS provider_availability_slots;
DROP TABLE IF EXISTS offering_media;
DROP TABLE IF EXISTS service_zones;
DROP TABLE IF EXISTS offering_points;
DROP TABLE IF EXISTS service_points;
DROP TABLE IF EXISTS service_offerings;
DROP TABLE IF EXISTS provider_documents;
DROP TABLE IF EXISTS providers;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS service_categories;
