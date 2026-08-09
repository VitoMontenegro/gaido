-- +goose Up
UPDATE site_settings
SET value = jsonb_set(
  jsonb_set(value, '{hero_title}', '"Знайди свій спосіб мандрувати"'::jsonb),
  '{hero_subtitle}',
  '"Авторські маршрути від місцевих гідів — обирайте програму та звʼязуйтеся напряму"'::jsonb
)
WHERE key = 'home_content';

UPDATE site_settings
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(value, '{copyright}', '"Gaido"'::jsonb),
    '{email}',
    '"hello@gaido.example"'::jsonb
  ),
  '{telegram}',
  '"@gaido"'::jsonb
)
WHERE key = 'footer_content';

-- +goose Down
UPDATE site_settings
SET value = jsonb_set(
  jsonb_set(value, '{hero_title}', '"Не звичайні екскурсії по всьому світу"'::jsonb),
  '{hero_subtitle}',
  '"Авторські маршрути від місцевих гідів — обирайте програму та зв''язуйтеся напряму"'::jsonb
)
WHERE key = 'home_content';

UPDATE site_settings
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(value, '{copyright}', '"Experts Tourister"'::jsonb),
    '{email}',
    '"hello@experts-tourister.example"'::jsonb
  ),
  '{telegram}',
  '"@experts_tourister"'::jsonb
)
WHERE key = 'footer_content';
