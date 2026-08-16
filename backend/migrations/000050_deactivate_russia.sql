-- +goose Up
UPDATE cities
SET is_active = false, updated_at = NOW()
WHERE country_id = (SELECT id FROM countries WHERE slug = 'russia');

UPDATE regions
SET is_active = false, updated_at = NOW()
WHERE country_id = (SELECT id FROM countries WHERE slug = 'russia');

UPDATE countries
SET is_active = false, updated_at = NOW()
WHERE slug = 'russia';

-- +goose Down
UPDATE countries
SET is_active = true, updated_at = NOW()
WHERE slug = 'russia';

UPDATE regions
SET is_active = true, updated_at = NOW()
WHERE country_id = (SELECT id FROM countries WHERE slug = 'russia');

UPDATE cities
SET is_active = true, updated_at = NOW()
WHERE country_id = (SELECT id FROM countries WHERE slug = 'russia');
