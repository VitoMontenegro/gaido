-- +goose Up
-- Remove excursions whose guide profile was deleted outside CASCADE (admin UI crash).
DELETE FROM review_comments
WHERE review_id IN (
    SELECT gr.id
    FROM guide_reviews gr
    LEFT JOIN guide_profiles gp ON gp.id = gr.guide_id
    WHERE gp.id IS NULL
       OR (
           gr.excursion_id IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM guide_profiles gp2
               JOIN excursions e ON e.guide_id = gp2.id
               WHERE e.id = gr.excursion_id
           )
       )
);

DELETE FROM guide_reviews gr
WHERE NOT EXISTS (SELECT 1 FROM guide_profiles gp WHERE gp.id = gr.guide_id)
   OR (
       gr.excursion_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM excursions e WHERE e.id = gr.excursion_id)
   );

DELETE FROM favorites f
WHERE (f.target_type = 'GUIDE' AND NOT EXISTS (SELECT 1 FROM guide_profiles gp WHERE gp.id = f.target_id))
   OR (f.target_type = 'EXCURSION' AND NOT EXISTS (SELECT 1 FROM excursions e WHERE e.id = f.target_id));

DELETE FROM featured_placements fp
WHERE NOT EXISTS (SELECT 1 FROM guide_profiles gp WHERE gp.id = fp.guide_id)
   OR (
       fp.excursion_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM excursions e WHERE e.id = fp.excursion_id)
   );

DELETE FROM excursions e
WHERE NOT EXISTS (SELECT 1 FROM guide_profiles gp WHERE gp.id = e.guide_id);

-- +goose Down
-- Data cleanup — no rollback.
