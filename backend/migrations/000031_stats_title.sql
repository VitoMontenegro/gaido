-- +goose Up
UPDATE site_settings
SET value = jsonb_set(
    value,
    '{stats_title}',
    '"З нами подорожують мільйони"'::jsonb,
    true
),
updated_at = NOW()
WHERE key = 'home_content'
  AND (value->>'stats_title' IS NULL OR value->>'stats_title' = '');

-- +goose Down
UPDATE site_settings
SET value = value - 'stats_title',
    updated_at = NOW()
WHERE key = 'home_content';
