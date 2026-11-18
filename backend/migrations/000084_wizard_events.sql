-- +goose Up
-- Події майстра створення екскурсії (воронка кроків, причини блокувань, публікації).
CREATE TABLE IF NOT EXISTS excursion_wizard_events (
    id BIGSERIAL PRIMARY KEY,
    guide_id BIGINT NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
    excursion_id BIGINT NULL REFERENCES excursions(id) ON DELETE SET NULL,
    session_id VARCHAR(64) NOT NULL DEFAULT '',
    event VARCHAR(40) NOT NULL,
    step VARCHAR(20) NOT NULL DEFAULT '',
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wizard_events_event_created ON excursion_wizard_events (event, created_at);
CREATE INDEX IF NOT EXISTS idx_wizard_events_guide_created ON excursion_wizard_events (guide_id, created_at);

-- +goose Down
DROP TABLE IF EXISTS excursion_wizard_events;
