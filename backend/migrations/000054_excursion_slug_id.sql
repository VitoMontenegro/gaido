-- +goose Up
UPDATE excursions SET slug = id::text WHERE slug IS DISTINCT FROM id::text;

-- +goose Down
-- Irreversible: old title-based slugs cannot be restored.
