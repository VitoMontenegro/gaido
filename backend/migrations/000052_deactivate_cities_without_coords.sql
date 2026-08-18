-- +goose Up
UPDATE cities
SET is_active = false, updated_at = NOW()
WHERE is_active = true
  AND (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0);

-- +goose Down
-- не відновлюємо міста без координат
