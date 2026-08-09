-- +goose Up
ALTER TABLE guide_reviews DROP CONSTRAINT IF EXISTS guide_reviews_author_id_guide_id_key;

UPDATE guide_reviews gr
SET excursion_id = (
    SELECT e.id FROM excursions e
    WHERE e.guide_id = gr.guide_id AND e.status = 'PUBLISHED'
    ORDER BY e.id
    LIMIT 1
)
WHERE gr.excursion_id IS NULL;

DELETE FROM guide_reviews a
USING guide_reviews b
WHERE a.excursion_id IS NOT NULL
  AND b.excursion_id IS NOT NULL
  AND a.author_id = b.author_id
  AND a.excursion_id = b.excursion_id
  AND a.id < b.id;

DELETE FROM guide_reviews WHERE excursion_id IS NULL;

ALTER TABLE guide_reviews ALTER COLUMN excursion_id SET NOT NULL;

ALTER TABLE guide_reviews
    ADD CONSTRAINT guide_reviews_author_excursion_unique UNIQUE (author_id, excursion_id);

-- +goose Down
ALTER TABLE guide_reviews DROP CONSTRAINT IF EXISTS guide_reviews_author_excursion_unique;
ALTER TABLE guide_reviews ALTER COLUMN excursion_id DROP NOT NULL;
ALTER TABLE guide_reviews ADD CONSTRAINT guide_reviews_author_id_guide_id_key UNIQUE (author_id, guide_id);
