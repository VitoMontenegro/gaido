-- +goose Up
INSERT INTO site_settings (key, value)
VALUES (
  'legal_content',
  '{
    "privacy_policy": {"title": "Політика конфіденційності", "body_html": ""},
    "site_rules": {"title": "Правила сайту", "body_html": ""},
    "placement_rules": {"title": "Правила розміщення", "body_html": ""}
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DELETE FROM site_settings WHERE key = 'legal_content';
