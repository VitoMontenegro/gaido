-- +goose Up
INSERT INTO countries (slug, name) VALUES
    ('russia', 'Росія'),
    ('turkey', 'Туреччина'),
    ('italy', 'Італія'),
    ('georgia', 'Грузія'),
    ('spain', 'Іспанія')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

INSERT INTO regions (country_id, slug, name)
SELECT c.id, v.slug, v.name
FROM (VALUES
    ('russia', 'moscow-region', 'Московская область'),
    ('russia', 'south', 'Юг России'),
    ('russia', 'volga', 'Поволжье'),
    ('russia', 'karelia', 'Карелия'),
    ('turkey', 'main', 'Турция'),
    ('italy', 'main', 'Италия'),
    ('georgia', 'main', 'Грузия'),
    ('spain', 'main', 'Испания')
) AS v(country_slug, slug, name)
JOIN countries c ON c.slug = v.country_slug
ON CONFLICT (country_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

INSERT INTO cities (country_id, region_id, slug, name, latitude, longitude)
SELECT c.id, r.id, v.city_slug, v.city_name, v.lat, v.lng
FROM (VALUES
    ('russia', 'moscow-region', 'moscow', 'Москва', 55.7558, 37.6173),
    ('russia', 'moscow-region', 'spb', 'Санкт-Петербург', 59.9343, 30.3351),
    ('russia', 'south', 'sochi', 'Сочи', 43.6028, 39.7342),
    ('russia', 'volga', 'kazan', 'Казань', 55.7887, 49.1221),
    ('russia', 'karelia', 'petrozavodsk', 'Петрозаводск', 61.7850, 34.3469),
    ('turkey', 'main', 'istanbul', 'Стамбул', 41.0082, 28.9784),
    ('italy', 'main', 'rome', 'Рим', 41.9028, 12.4964),
    ('georgia', 'main', 'tbilisi', 'Тбилиси', 41.7151, 44.8271),
    ('spain', 'main', 'barcelona', 'Барселона', 41.3874, 2.1686)
) AS v(country_slug, region_slug, city_slug, city_name, lat, lng)
JOIN countries c ON c.slug = v.country_slug
JOIN regions r ON r.country_id = c.id AND r.slug = v.region_slug
ON CONFLICT (region_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = NOW();

-- +goose Down
DELETE FROM cities WHERE slug IN ('sochi', 'kazan', 'petrozavodsk', 'istanbul', 'rome', 'tbilisi', 'barcelona');
DELETE FROM regions WHERE slug IN ('south', 'volga', 'karelia', 'main') AND country_id IN (
    SELECT id FROM countries WHERE slug IN ('turkey', 'italy', 'georgia', 'spain')
);
DELETE FROM regions WHERE slug IN ('south', 'volga', 'karelia') AND country_id = (SELECT id FROM countries WHERE slug = 'russia');
DELETE FROM countries WHERE slug IN ('turkey', 'italy', 'georgia', 'spain');
