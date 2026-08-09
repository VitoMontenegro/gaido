-- +goose Up
ALTER TABLE excursions
    ADD COLUMN duration_minutes INT NOT NULL DEFAULT 180,
    ADD COLUMN transport_mode VARCHAR(30) NOT NULL DEFAULT 'WALKING',
    ADD COLUMN children_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN language VARCHAR(10) NOT NULL DEFAULT 'ru',
    ADD COLUMN organizational_details TEXT NOT NULL DEFAULT '',
    ADD COLUMN meeting_point TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE excursions
    DROP COLUMN IF EXISTS duration_minutes,
    DROP COLUMN IF EXISTS transport_mode,
    DROP COLUMN IF EXISTS children_allowed,
    DROP COLUMN IF EXISTS language,
    DROP COLUMN IF EXISTS organizational_details,
    DROP COLUMN IF EXISTS meeting_point;
