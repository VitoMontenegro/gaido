-- +goose Up
UPDATE site_settings
SET value = 'false'::jsonb, updated_at = NOW()
WHERE key = 'guide_placement_payments_enabled';

INSERT INTO site_settings (key, value)
VALUES ('guide_placement_payments_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

DELETE FROM site_settings WHERE key = 'contacts_require_subscription';

CREATE UNIQUE INDEX IF NOT EXISTS guide_subscriptions_payment_id_uidx
    ON guide_subscriptions (payment_id)
    WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS featured_placements_payment_id_uidx
    ON featured_placements (payment_id)
    WHERE payment_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS featured_placements_payment_id_uidx;
DROP INDEX IF EXISTS guide_subscriptions_payment_id_uidx;
INSERT INTO site_settings (key, value)
VALUES ('contacts_require_subscription', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
