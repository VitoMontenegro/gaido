-- +goose Up
-- Bluemonday HTML sanitizer was applied to plain text fields and stored entities like &#39;.
UPDATE guide_profiles
SET about = replace(replace(replace(replace(replace(about,
    '&#39;', ''''),
    '&quot;', '"'),
    '&lt;', '<'),
    '&gt;', '>'),
    '&amp;', '&')
WHERE about LIKE '%&%';

UPDATE excursions
SET description = replace(replace(replace(replace(replace(description,
    '&#39;', ''''),
    '&quot;', '"'),
    '&lt;', '<'),
    '&gt;', '>'),
    '&amp;', '&')
WHERE description LIKE '%&%';

-- +goose Down
-- Irreversible: decoded plain text cannot be restored to entity form reliably.
