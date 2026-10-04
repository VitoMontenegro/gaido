-- +goose Up
INSERT INTO service_categories (slug, name, icon, sort_order)
VALUES ('translation', 'Переклад', '🗣', 14)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO services (category_id, slug, name, sort_order)
SELECT c.id, s.slug, s.name, s.sort_order
FROM service_categories c
JOIN (
    VALUES
        ('translator', 'Перекладач', 1::int),
        ('interpreter', 'Інтерпретатор', 2::int),
        ('translation-other', 'Інші послуги перекладу', 3::int)
) AS s(slug, name, sort_order) ON TRUE
WHERE c.slug = 'translation'
ON CONFLICT (category_id, slug) DO UPDATE
SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- +goose Down
DELETE FROM services
WHERE category_id = (SELECT id FROM service_categories WHERE slug = 'translation')
  AND slug IN ('translator', 'interpreter', 'translation-other');
