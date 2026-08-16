-- +goose Up
CREATE EXTENSION IF NOT EXISTS postgis;

-- +goose Down
-- PostGIS extension kept; tables dropped in later migrations
