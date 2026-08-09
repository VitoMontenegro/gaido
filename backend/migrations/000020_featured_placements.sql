-- +goose Up
ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS plan_type VARCHAR(30) NOT NULL DEFAULT 'GUIDE_PLACEMENT';

UPDATE subscription_plans SET plan_type = 'GUIDE_PLACEMENT' WHERE plan_type IS NULL OR plan_type = '';

INSERT INTO subscription_plans (code, name, description, price, currency, duration_days, sort_order, plan_type) VALUES
('featured_guide_week', 'Гід на головній — тиждень', 'Розміщення в блоці «Гіди за покликанням»', 490.00, 'UAH', 7, 10, 'FEATURED_GUIDE'),
('featured_guide_month', 'Гід на головній — місяць', 'Розміщення в блоці «Гіди за покликанням»', 1490.00, 'UAH', 30, 11, 'FEATURED_GUIDE'),
('featured_guide_year', 'Гід на головній — рік', 'Розміщення в блоці «Гіди за покликанням»', 12900.00, 'UAH', 365, 12, 'FEATURED_GUIDE'),
('featured_excursion_week', 'Екскурсія на головній — тиждень', 'Розміщення в блоці «Популярні екскурсії»', 390.00, 'UAH', 7, 20, 'FEATURED_EXCURSION'),
('featured_excursion_month', 'Екскурсія на головній — місяць', 'Розміщення в блоці «Популярні екскурсії»', 1190.00, 'UAH', 30, 21, 'FEATURED_EXCURSION'),
('featured_excursion_year', 'Екскурсія на головній — рік', 'Розміщення в блоці «Популярні екскурсії»', 9900.00, 'UAH', 365, 22, 'FEATURED_EXCURSION')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE featured_placements (
    id BIGSERIAL PRIMARY KEY,
    guide_id BIGINT NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
    excursion_id BIGINT REFERENCES excursions(id) ON DELETE CASCADE,
    slot_type VARCHAR(30) NOT NULL,
    plan_id BIGINT REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_id BIGINT REFERENCES payments(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_featured_placements_slot_active ON featured_placements(slot_type, status, expires_at);
CREATE INDEX idx_featured_placements_guide ON featured_placements(guide_id, slot_type, status);
CREATE INDEX idx_featured_placements_excursion ON featured_placements(excursion_id) WHERE excursion_id IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS featured_placements;
DELETE FROM subscription_plans WHERE code IN (
    'featured_guide_week', 'featured_guide_month', 'featured_guide_year',
    'featured_excursion_week', 'featured_excursion_month', 'featured_excursion_year'
);
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS plan_type;
