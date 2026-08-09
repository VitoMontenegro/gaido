-- +goose Up
UPDATE cities SET latitude = 55.7558, longitude = 37.6173
WHERE slug = 'moscow' AND (latitude IS NULL OR latitude = 0);

UPDATE cities SET latitude = 59.9343, longitude = 30.3351
WHERE slug = 'spb' AND (latitude IS NULL OR latitude = 0);

-- +goose Down
-- no-op
