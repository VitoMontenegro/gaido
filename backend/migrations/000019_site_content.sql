-- +goose Up
INSERT INTO site_settings (key, value) VALUES
('home_content', '{
  "hero_title": "Не звичайні екскурсії по всьому світу",
  "hero_subtitle": "Авторські маршрути від місцевих гідів — обирайте програму та зв''язуйтеся напряму",
  "stats": [
    {"value": "2 млн+", "label": "мандрівників на рік"},
    {"value": "5000+", "label": "гідів"},
    {"value": "800+", "label": "міст"}
  ],
  "benefits": [
    {"title": "Прямий контакт", "text": "Бронювання на платформі не потрібне — пишіть гіду напряму"},
    {"title": "Авторські маршрути", "text": "Не стандартні тури, а живі історії від місцевих експертів"},
    {"title": "Перевірені гіди", "text": "Ліцензії, відгуки та бейджі в каталозі"},
    {"title": "Гнучкий формат", "text": "Індивідуальні та групові екскурсії на будь-який бюджет"}
  ],
  "faq": [
    {"question": "Як забронювати екскурсію?", "answer": "Оберіть екскурсію, перейдіть на профіль гіда та зв''яжіться через Telegram, телефон або email. Оплата та деталі — напряму з гідом."},
    {"question": "Чи безпечно бронювати через платформу?", "answer": "Ми перевіряємо профілі та модеруємо контент. Контакти гіда доступні після активації розміщення."},
    {"question": "Що робити, якщо потрібного міста немає?", "answer": "Гід може додати місто вручну під час створення екскурсії — воно з''явиться в каталозі."}
  ],
  "featured_guide_slugs": [],
  "featured_excursion_slugs": [],
  "popular_city_slugs": []
}'::jsonb),
('footer_content', '{
  "phone": "+380 44 000 00 00",
  "email": "hello@experts-tourister.example",
  "telegram": "@experts_tourister",
  "description": "Каталог гідів та авторських екскурсій. Прямий контакт без посередників.",
  "columns": [
    {"title": "Мандрівникам", "links": [{"label": "Екскурсії", "url": "/excursions"}, {"label": "Гіди", "url": "/guides"}, {"label": "Карта", "url": "/map"}]},
    {"title": "Гідам", "links": [{"label": "Стати гідом", "url": "/register"}, {"label": "Кабінет гіда", "url": "/account/guide"}]}
  ],
  "copyright": "Experts Tourister"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DELETE FROM site_settings WHERE key IN ('home_content', 'footer_content');
