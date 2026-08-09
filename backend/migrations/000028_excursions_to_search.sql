-- +goose Up
UPDATE site_settings
SET value = replace(value::text, '"/excursions"', '"/search"')::jsonb
WHERE key IN ('footer_content', 'home_content')
  AND value::text LIKE '%/excursions%';

-- +goose Down
UPDATE site_settings
SET value = replace(value::text, '"/search"', '"/excursions"')::jsonb
WHERE key IN ('footer_content', 'home_content')
  AND value::text LIKE '%"/search"%'
  AND value::text LIKE '%"label": "Екскурсії"%';
