-- +goose Up
INSERT INTO site_settings (key, value) VALUES
    ('body_font', '"rubik"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DELETE FROM site_settings WHERE key = 'body_font';
