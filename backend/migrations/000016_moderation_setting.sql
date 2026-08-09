-- +goose Up
INSERT INTO site_settings (key, value) VALUES
    ('moderation_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DELETE FROM site_settings WHERE key = 'moderation_enabled';
