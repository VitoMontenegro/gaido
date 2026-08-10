-- +goose Up
-- Backfill guide_cities from published excursions (map already used excursions; /guides used guide_cities).
INSERT INTO guide_cities (guide_id, city_id, is_primary)
SELECT DISTINCT e.guide_id, e.city_id, false
FROM excursions e
WHERE e.status = 'PUBLISHED'
  AND e.city_id IS NOT NULL
  AND e.city_id > 0
ON CONFLICT (guide_id, city_id) DO UPDATE SET is_active = true;

-- +goose Down
-- Data backfill — no rollback.
