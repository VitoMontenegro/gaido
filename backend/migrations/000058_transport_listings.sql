-- +goose Up
CREATE TABLE transport_listings (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL DEFAULT 'regular',
    company_name VARCHAR(255) NOT NULL DEFAULT '',
    driver_names VARCHAR(500) NOT NULL DEFAULT '',
    vehicle_brand VARCHAR(255) NOT NULL DEFAULT '',
    vehicle_photo_url VARCHAR(500) NOT NULL DEFAULT '',
    phone VARCHAR(50) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    telegram VARCHAR(100) NOT NULL DEFAULT '',
    whatsapp VARCHAR(50) NOT NULL DEFAULT '',
    viber VARCHAR(50) NOT NULL DEFAULT '',
    price_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    seats_total INT NOT NULL DEFAULT 1,
    parcels_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    parcels_terms TEXT NOT NULL DEFAULT '',
    depart_time TIME NOT NULL DEFAULT '08:00',
    arrive_time_approx TIME,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transport_listings_provider ON transport_listings(provider_id);
CREATE INDEX idx_transport_listings_status ON transport_listings(status);

CREATE TABLE transport_listing_stops (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES transport_listings(id) ON DELETE CASCADE,
    city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    sort_order INT NOT NULL,
    UNIQUE(listing_id, city_id),
    UNIQUE(listing_id, sort_order)
);

CREATE INDEX idx_transport_listing_stops_city ON transport_listing_stops(city_id);
CREATE INDEX idx_transport_listing_stops_listing ON transport_listing_stops(listing_id);

CREATE TABLE transport_listing_departures (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES transport_listings(id) ON DELETE CASCADE,
    depart_on DATE NOT NULL,
    arrive_on DATE,
    seats_left INT,
    UNIQUE(listing_id, depart_on)
);

CREATE INDEX idx_transport_listing_departures_date ON transport_listing_departures(listing_id, depart_on);

-- +goose Down
DROP TABLE IF EXISTS transport_listing_departures;
DROP TABLE IF EXISTS transport_listing_stops;
DROP TABLE IF EXISTS transport_listings;
