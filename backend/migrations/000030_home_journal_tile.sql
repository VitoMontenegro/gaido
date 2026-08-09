-- +goose Up
UPDATE site_settings
SET value = CASE
    WHEN value->'category_tiles' IS NULL
        OR jsonb_typeof(value->'category_tiles') <> 'array'
        OR jsonb_array_length(value->'category_tiles') = 0 THEN
        jsonb_set(
            value,
            '{category_tiles}',
            '[
                {"label": "Пошук", "url": "/search", "image_url": "/images/home/search.jpg"},
                {"label": "Карта", "url": "/map", "image_url": "/images/home/map.jpg"},
                {"label": "Гіди", "url": "/guides", "image_url": "/images/home/guides.jpg"},
                {"label": "Журнал", "url": "/journal", "image_url": "/images/home/journal.jpg"}
            ]'::jsonb,
            true
        )
    WHEN NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(value->'category_tiles') AS tile
        WHERE tile->>'url' = '/journal'
    ) THEN
        jsonb_set(
            value,
            '{category_tiles}',
            (value->'category_tiles') || '[{"label": "Журнал", "url": "/journal", "image_url": "/images/home/journal.jpg"}]'::jsonb,
            true
        )
    ELSE value
END,
updated_at = NOW()
WHERE key = 'home_content';

-- +goose Down
UPDATE site_settings
SET value = (
    SELECT COALESCE(jsonb_agg(tile), '[]'::jsonb)
    FROM jsonb_array_elements(value->'category_tiles') AS tile
    WHERE tile->>'url' <> '/journal'
),
updated_at = NOW()
WHERE key = 'home_content'
  AND value->'category_tiles' IS NOT NULL;
