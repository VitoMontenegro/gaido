-- +goose Up
ALTER TABLE place_pages ADD COLUMN excerpt TEXT NOT NULL DEFAULT '';

UPDATE place_pages
SET excerpt = trim(regexp_replace(regexp_replace(intro_html, '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g')),
    intro_html = ''
WHERE excerpt = '' AND intro_html <> '';

-- +goose Down
ALTER TABLE place_pages DROP COLUMN IF EXISTS excerpt;
