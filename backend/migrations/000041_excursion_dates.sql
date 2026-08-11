-- +goose Up
CREATE TABLE excursion_dates (
    id BIGSERIAL PRIMARY KEY,
    excursion_id BIGINT NOT NULL REFERENCES excursions(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at > starts_at)
);

CREATE INDEX idx_excursion_dates_excursion ON excursion_dates(excursion_id, starts_at);
CREATE UNIQUE INDEX idx_excursion_dates_unique ON excursion_dates(excursion_id, starts_at);

-- +goose Down
DROP TABLE IF EXISTS excursion_dates;
