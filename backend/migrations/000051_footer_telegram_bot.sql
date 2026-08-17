-- +goose Up
UPDATE site_settings
SET value = jsonb_set(value, '{telegram}', '"gaido_ua_bot"'::jsonb)
WHERE key = 'footer_content';

-- +goose Down
UPDATE site_settings
SET value = jsonb_set(value, '{telegram}', '"@gaido"'::jsonb)
WHERE key = 'footer_content';
