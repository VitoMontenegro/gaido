-- +goose Up
ALTER TABLE transport_listings
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

CREATE TABLE transport_bookings (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES transport_listings(id) ON DELETE CASCADE,
    departure_id BIGINT REFERENCES transport_listing_departures(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    seats INT NOT NULL DEFAULT 1 CHECK (seats > 0 AND seats <= 20),
    passenger_name VARCHAR(255) NOT NULL DEFAULT '',
    passenger_phone VARCHAR(50) NOT NULL DEFAULT '',
    passenger_email VARCHAR(255) NOT NULL DEFAULT '',
    comment TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transport_bookings_listing ON transport_bookings(listing_id);
CREATE INDEX idx_transport_bookings_user ON transport_bookings(user_id);
CREATE INDEX idx_transport_bookings_provider ON transport_bookings(provider_id);
CREATE INDEX idx_transport_bookings_status ON transport_bookings(status);

-- +goose Down
DROP TABLE IF EXISTS transport_bookings;
ALTER TABLE transport_listings DROP COLUMN IF EXISTS description;
