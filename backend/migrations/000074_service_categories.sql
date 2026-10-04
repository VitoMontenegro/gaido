-- +goose Up
INSERT INTO service_categories (slug, name, icon, sort_order)
VALUES
    ('tourism', 'Туризм', '🧳', 15),
    ('legal', 'Юридичні послуги', '⚖️', 16),
    ('cleaning', 'Клінінг', '🧹', 17),
    ('garden', 'Сад/город', '🌱', 18),
    ('it', 'IT послуги', '💻', 19),
    ('pets', 'Домашні улюбленці', '🐾', 20),
    ('celebrations', 'Організація свят', '🎉', 21),
    ('sport', 'Спорт', '⚽', 22),
    ('tech-repair', 'Ремонт техніки', '🔧', 23)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

UPDATE service_categories SET name = 'Переклад' WHERE slug = 'translation';

INSERT INTO services (category_id, slug, name, sort_order)
SELECT id, slug, name, 1
FROM service_categories
WHERE slug IN ('tourism', 'legal', 'cleaning', 'garden', 'it', 'pets', 'celebrations', 'sport', 'tech-repair')
ON CONFLICT (category_id, slug) DO UPDATE
SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- +goose Down
DELETE FROM service_categories
WHERE slug IN ('tourism', 'legal', 'cleaning', 'garden', 'it', 'pets', 'celebrations', 'sport', 'tech-repair');

UPDATE service_categories SET name = 'Перекладачі' WHERE slug = 'translation';
