-- +goose Up
CREATE TABLE site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES
    ('guide_placement_payments_enabled', 'false'::jsonb);

-- +goose Down
DROP TABLE IF EXISTS site_settings;
