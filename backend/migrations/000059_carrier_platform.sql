-- +goose Up
INSERT INTO subscription_plans (code, name, description, price, currency, duration_days, sort_order, plan_type) VALUES
('carrier-3m', 'Vezu — 3 місяці', 'Публікація контактів і профілю перевізника на Vezu', 99.00, 'EUR', 90, 30, 'PROVIDER_PLACEMENT'),
('carrier-6m', 'Vezu — 6 місяців', 'Публікація контактів і профілю перевізника на Vezu', 179.00, 'EUR', 180, 31, 'PROVIDER_PLACEMENT'),
('carrier-12m', 'Vezu — 12 місяців', 'Публікація контактів і профілю перевізника на Vezu', 299.00, 'EUR', 365, 32, 'PROVIDER_PLACEMENT')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE carrier_profiles (
    provider_id BIGINT PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
    carrier_type VARCHAR(30) NOT NULL DEFAULT 'private',
    citizenship VARCHAR(2) NOT NULL DEFAULT 'UA',
    base_city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    about TEXT NOT NULL DEFAULT '',
    experience_years INT NOT NULL DEFAULT 0,
    trips_count INT NOT NULL DEFAULT 0,
    trust_level VARCHAR(20) NOT NULL DEFAULT 'new',
    identity_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    ukrainian_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    business_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    documents_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    hours_text VARCHAR(255) NOT NULL DEFAULT '',
    contact_person VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carrier_profiles_status ON carrier_profiles(status);
CREATE INDEX idx_carrier_profiles_type ON carrier_profiles(carrier_type);
CREATE INDEX idx_carrier_profiles_base_city ON carrier_profiles(base_city_id);

CREATE TABLE carrier_vehicles (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    brand VARCHAR(100) NOT NULL DEFAULT '',
    model VARCHAR(100) NOT NULL DEFAULT '',
    year INT,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'minivan',
    seats INT NOT NULL DEFAULT 4,
    photo_url VARCHAR(500) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    verification_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carrier_vehicles_provider ON carrier_vehicles(provider_id);

CREATE TABLE carrier_vehicle_photos (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES carrier_vehicles(id) ON DELETE CASCADE,
    storage_key VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_carrier_vehicle_photos_vehicle ON carrier_vehicle_photos(vehicle_id);

ALTER TABLE transport_listings
    ADD COLUMN IF NOT EXISTS vehicle_id BIGINT REFERENCES carrier_vehicles(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE transport_listings DROP COLUMN IF EXISTS vehicle_id;
DROP TABLE IF EXISTS carrier_vehicle_photos;
DROP TABLE IF EXISTS carrier_vehicles;
DROP TABLE IF EXISTS carrier_profiles;
DELETE FROM subscription_plans WHERE code IN ('carrier-3m', 'carrier-6m', 'carrier-12m');
