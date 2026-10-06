# SEO baseline: Gaido UA (gaido-ua.com)

Дата фиксации: 2026-10-06  
Источники: crawl Screaming Frog (экспорт `seo/`, ~831 URL), live-проверки, `robots.txt` / `sitemap.xml`, API `GET /api/v1/seo/page-meta`, код GA4/GTM в `apps/web/app/layout.tsx`.

GSC и GA4: доступа к кабинетам в момент аудита не было - ниже чек-листы и рекомендуемые события. Частотности в семантике - ориентировочные тиры (ВЧ/СЧ/НЧ); точные цифры - из GSC или бесплатного Google Trends.

---

## 1. Технический аудит (Screaming Frog + live)

### 1.1. Сводка crawl

| Метрика | Значение |
|--------|----------|
| URL в отчёте | 831 |
| HTTP 200 | 775 |
| HTTP 308 | 56 (legacy `/city/*` → `/svit/city/*`, `/svit/map` → `/countries`) |
| 4xx / 5xx | 0 |
| Индексируемые HTML (выборка `indexable.json`) | ~460 |
| noindex (явный) | `/svit/search` + ложные маршруты (см. P0) |
| Макс. глубина | 4-5 |
| Orphan (indexable, 0 inlinks) | по сути только главная портала |
| Дубли Title (indexable) | 3 группы (микрогосударства) |
| Страницы &lt;100 слов (crawl text) | ~178 (в основном карточки экскурсий/гидов) |

### 1.2. robots.txt

- `Allow: /`
- Закрыты: `account`, `login`, `register`, `admin`, `moderator`, `downloads`, `favorites` (и зеркала под `/svit`, `/servis`, `/vezu`).
- Закрыты параметры поиска: `Disallow: .../search?`
- Закрыты programmatic SEO: `/ukrainians-in/`, `/svit/ukrainians-in/`
- Sitemap: `https://gaido-ua.com/sitemap.xml`

### 1.3. Sitemap (Go, динамический)

Генерация: `backend/internal/http/handlers/seo.go`.

Ориентировочный состав на дату аудита:

- ~75 городов (`/svit/city/{slug}`)
- ~153 гида (`/svit/guide/{slug}`)
- ~183 экскурсии (`/svit/excursion/{slug}`)
- ~50 стран (`/svit/countries/{slug}`)
- Хабы: `/`, `/svit/`, `/servis/`, `/vezu/`, `/news`, журнал, legal, forums

Условие попадания города в sitemap: активный город + опубликованная экскурсия + активный гид.

В sitemap нет коротких путей вида `/svit/rome` (только `/svit/city/rome`).

### 1.4. Canonical и hreflang

- На indexable URL в целом self-referencing canonical.
- `hreflang`: `uk` + `x-default` на тот же URL (одноязычный сайт - нормально).
- Проблема: у «фантомных» URL canonical указывает на себя при `found: false` (см. P0).

### 1.5. svit.gaido-ua.com vs gaido-ua.com/svit/

| URL | Поведение |
|-----|-----------|
| `https://svit.gaido-ua.com/` | 301 → `https://gaido-ua.com/svit/` |
| `https://svit.gaido-ua.com/city/rome` | 301 → `https://gaido-ua.com/svit/city/rome` |
| `https://svit.gaido-ua.com/rome` | 301 → `https://gaido-ua.com/svit/rome` (не на `/city/rome`) |
| `https://gaido-ua.com/svit/city/rome` | 200, нормальный title/H1 в `page-meta` |
| `https://gaido-ua.com/svit/rome` | 200, title «Gaido UA», `no_index: true`, `found: false` |
| `https://gaido-ua.com/svit/city/rome/guides` | 200, title «Gaido UA», noindex, маршрута в SPA нет |

Поддомен в SF crawl не попадал (редиректы на apex) - дублей host-level в crawl нет. Риск: старые ссылки `svit.gaido-ua.com/{slug}` без префикса `city/`.

Логика редиректа поддомена: `backend/internal/http/router.go` (`legacySectionRedirect`).

### 1.6. Редиректы legacy

- `/city/{slug}` → `/svit/city/{slug}` (308) - корректно.
- `/svit/map` → `/svit/countries` (308).

### 1.7. Title / H1

- Города/страны: шаблон «Екскурсії українською у {місто}» + H1 в crawl-body.
- Все 183 URL экскурсий в sitemap вида `/svit/excursion/{id}` (числовой slug).
- Часть городов с одинаковым title (Ватикан, Монако, Люксембург - по 2 URL).

### 1.8. Параметры и фильтры

- `/svit/search` - noindex (ок).
- `/svit/guides?city=rome` - canonical `/svit/guides` (параметр отбрасывается) - риск при будущей индексации фильтров.

### 1.9. Структура indexable (выборка SF)

| Тип | Кол-во (indexable.json) |
|-----|-------------------------|
| excursion | 183 |
| guide | 114 |
| city | 75 |
| country | 50 |

---

## 2. Технические проблемы P0 / P1 / P2

### P0 (до активного SEO-пилота)

1. **`/svit/{slug}` без `city/` отдаёт 200** с generic title и noindex вместо **301 → `/svit/city/{slug}`** (пример: `/svit/rome`). Поддомен: `svit.gaido-ua.com/rome` → `/svit/rome`.
2. **Числовые slug экскурсий** (`/excursion/208`) во всём sitemap - нет ЧПУ, слабая семантика URL.
3. **«Фантомные» URL** `/svit/city/{slug}/guides|excursions` - 200, self-canonical, noindex, **нет роутов** в `packages/guides/src/routes.tsx`.
4. **Тонкий контент в HTML** (~178 URL &lt;100 слов в SF) - усилить crawl-body / SSR-текст на карточках гидов и экскурсий.

### P1

5. Дубли title на близких гео-сущностях (Ватикан / Vatican City и т.п.).
6. **`/svit/guides` + `?city=`** - canonical без параметра.
7. Страны с очень тонким текстом (~79 слов) и близким simhash (кластер EC/PE в SF).
8. Некорректный `website_slug` гида с зашитым Instagram-URL в path (видно в sitemap).

### P2

9. `HEAD` на `sitemap.xml` → 405.
10. `/svit/search` без H1 в SF (страница noindex).
11. Нет sitemap index при росте &gt;50k URL (запас есть).

---

## 3. GSC и GA4

### 3.1. GSC - что зафиксировать (baseline)

- Покрытие: проиндексировано vs sitemap.
- Страницы с impressions: `/svit/city/*`, `/svit/guide/*`, `/svit/excursion/*`, `/svit/countries/*`.
- Запросы: «екскурсії українською», «гід українською», «+ {місто}».
- Ошибки: Soft 404 на `/svit/{city}` если Google игнорирует noindex.
- Canonical / Duplicate: группы с legacy `/city/` (должны сойтись на `/svit/city/`).

### 3.2. GA4 - текущее состояние

- GTM: `GTM-M76JH7SB`
- GA4: `G-CKPR5WS4PL`
- В коде только `gtag('config')` - **кастомных событий в репозитории нет**.

### 3.3. Рекомендуемые события (воронка «звернення до гіда»)

| Событие | Когда | Параметры |
|--------|--------|-----------|
| `view_item` | Просмотр экскурсии | `item_id`, `item_name`, `city`, `country` |
| `view_item_list` | Листинг города/поиска | `item_list_name`, `city` |
| `select_item` | Клик по карточке | `item_id`, `list_name` |
| `contact_guide_click` | Клик Telegram/WhatsApp/Viber/phone/email | `contact_type`, `guide_id`, `source_page` |
| `contact_guide_open` | Открытие sheet контактов (mobile) | `guide_id` |
| `generate_lead` | Успешная отправка формы/чата | `guide_id`, `excursion_id` |
| `search` | Поиск | `search_term`, `results_count` |
| `add_to_wishlist` | Избранное | `item_id`, `item_type` |
| `sign_up` | Регистрация | `method`, `role` |

Дополнительно в GTM: consent mode при использовании баннера cookies.

---

## 4. Приоритетные города (пилот TOP-20)

Критерии: есть в sitemap (контент), сила crawl-текста, туристический спрос для украинской аудитории.

| # | Город (slug) | Зачем в пилоте |
|---|----------------|----------------|
| 1 | rome | Ядро спроса, много гидов/экскурсий |
| 2 | prague | Сильный текст в crawl, Чехия |
| 3 | paris | ВЧ направление |
| 4 | amsterdam | ВЧ |
| 5 | london | ВЧ (UK) |
| 6 | barcelona | Испания |
| 7 | vienna | Австрия |
| 8 | budapest | Венгрия |
| 9 | krakow | Польша |
| 10 | wroclaw | Польша |
| 11 | athens | Греция |
| 12 | venetsiia | Италия |
| 13 | florentsiia | Италия |
| 14 | istanbul | Турция |
| 15 | tbilisi | Грузия |
| 16 | edynburh | UK |
| 17 | berlin | Германия |
| 18 | lisbon / porto | Португалия |
| 19 | teneryfe / madryd | Испания |
| 20 | niu-york / chykago / bajabe / miches | США / Доминикана (есть контент) |

Всего в sitemap 75 городов - остальные волной 2 после пилота.

Города с наибольшим объёмом crawl-текста (слова в SF): prague, wroclaw, chykago, rome, amsterdam, paris, athens, london, madryd, venetsiia.

---

## 5. SERP и конкуренты (украинские коммерческие кластеры)

Ориентир по типу выдачи Google UA (ручная оценка; не замена полного SERP-скрининга).

| Кластер | Что чаще в TOP-10 | Типичные конкуренты / форматы |
|--------|-------------------|-------------------------------|
| «екскурсії українською {місто}» | Агрегаторы, каталоги, карточка тура | GetYourGuide, Tripster-подобные, личные сайты гидов, FB/Instagram |
| «гід українською {місто}» | Профиль гида, соцсети, агрегаторы | «Гід у …» в соцсетях, страницы на маркетплейсах |
| «україномовний гід {місто}» | Близко к предыдущему | Те же + журнальные статьи |
| «індивідуальна / приватна екскурсія {місто}» | Карточки с ценой | Агрегаторы с private tour |
| «групова екскурсія …» | Групповые предложения | Операторы, гиды с фикс. датами |
| Типы: «ватикан», «колізей», «гастро» … | Конкретная экскурсия или POI-лендинг | Сильные landing под один объект |

**Вывод «гіди» vs «екскурсії»:** для одного города в украинской нише выдача часто смешанная. Отдельные indexable URL `/city/{slug}/guides` и `/excursions` **не обязательны на старте**, если одна страница города закрывает оба блока (H1 + секции + FAQ). Отдельные посадочные - когда в GSC разные запросы стабильно ведут на разные URL у конкурентов и есть объём.

**Паттерны сильных страниц:** Title с городом + УТП («українською», «індивідуально»), H1 = ключ, цена/длительность, отзывы, FAQ, schema, перелинковка.

---

## 6. Карта кластер → страница (семантическое ядро пилота)

Частотность: **ВЧ** - сотни-тысячи+/мес (оценка), **СЧ** - десятки-сотни, **НЧ** - единичные-десятки.

| Кластер / примеры запросов | Частот. | Интент | Страница | URL (рекоменд.) | Приор. |
|---------------------------|---------|--------|----------|-----------------|--------|
| екскурсії українською {місто} | ВЧ-СЧ | Каталог туров | Город | `/svit/city/{slug}` | P0 |
| гід українською {місто} | СЧ | Выбор гида | Секция на городе | `/svit/city/{slug}` | P0 |
| україномовний гід {місто} | СЧ | Выбор гида | Город | `/svit/city/{slug}` | P0 |
| український гід {місто} | СЧ | Выбор гида | Город | `/svit/city/{slug}` | P1 |
| гіди {місто} | СЧ | Список гидов | Город или каталог | `/svit/city/{slug}`; `/svit/guides` + noindex `?city=` | P1 |
| індивідуальна екскурсія {місто} | СЧ | Транзакция | Город + тип на карточках | facet noindex | P2 |
| приватна екскурсія {місто} | НЧ-СЧ | Транзакция | Как выше | | P2 |
| групова екскурсія {місто} | СЧ | Групповые слоты | Карточки | `/svit/excursion/{semantic-slug}` | P2 |
| екскурсії {країна} українською | СЧ | Каталог по стране | Страна | `/svit/countries/{slug}` | P1 |
| {місто} ватикан / колізей … | НЧ-СЧ | POI | Карточка экскурсии | `/svit/excursion/{semantic-slug}` | P1 |
| як обрати гіда {місто} | НЧ | Инфо | Журнал / FAQ города | `/svit/journal/...` | P3 |
| gaido / гайдо | НЧ | Бренд | Хаб | `/svit/` | P3 |

Кластеры для сбора семантики (полный список направлений работы):

- україномовний / український гід + місто
- гід українською + місто
- екскурсії українською + місто
- індивідуальні / приватні / групові екскурсії
- типовые экскурсии по спросу (гастро, вино, музеи, однодневные)
- запросы на уровне стран

`ukrainians-in/{city}` - в robots Disallow; не раскрывать массово без уникального контента.

---

## 7. Предлагаемая SEO-архитектура `/svit/`

```
/svit/                          хаб «Світ»
/svit/countries                 карта стран
/svit/countries/{country}       экскурсии по стране
/svit/city/{city}               главная коммерческая посадочная (гиды + экскурсии + FAQ)
/svit/guide/{slug}              профиль гида
/svit/excursion/{semantic-slug} карточка (миграция с id)
/svit/guides                    глобальный каталог гидов (индекс да; ?city= noindex)
/svit/search                    noindex
/svit/journal/{slug}            контент-маркетинг
/svit/forums/*                  по решению: noindex на темы
```

Не создавать без SERP-обоснования indexable `/svit/city/{city}/guides` и `/excursions` (сейчас фантомные URL).

Категории экскурсий: не плодить `/svit/category/...` до объёма; на пилоте - теги на карточках + блоки на странице города.

Публичные роуты SPA: `packages/guides/src/routes.tsx` (`svitPublicRoutes`).

---

## 8. Правила индексации

| Тип | Индексировать | Условие |
|-----|---------------|---------|
| Город | Да | ≥1 published excursion + active guide (как в sitemap) |
| Город пустой | Нет | 404 или noindex, не в sitemap |
| Страна | Да | Есть индексируемый город или явный контент |
| Гид | Да | ACTIVE, валидный slug, правила каталога/подписки |
| Экскурсия | Да | PUBLISHED + активный гид |
| Поиск, фильтры, `?city=`, пагинация с параметрами | Нет | noindex; canonical на базу |
| Account / admin / favorites | Нет | robots + noindex |
| `ukrainians-in/*` | Нет | robots Disallow |
| Legacy `/city/*`, `/svit/map` | Нет | 308 на канон |
| `/svit/{city}` без prefix `city/` | Не в индексе | 301 на `/svit/city/{city}` |

Не индексировать комбинации фильтров (`?theme=&date=&price=`). Расширить robots при появлении GET-фильтров в каталоге.

---

## 9. Требования к шаблонам (дизайн + разработка)

### 9.1. Страница города (`/svit/city/{slug}`)

- Один H1 с основным кластером.
- Intro 2-3 абзаца в первом HTML (crawl-body).
- Блок экскурсий (цена, длительность, ссылки).
- Блок гидов (карточки → профиль).
- FAQ + `FAQPage` schema.
- Breadcrumbs: Світ → країна → місто.
- Перелинковка: страна, соседние города, топ-экскурсии.
- CTA «написати гіду» на mobile above the fold.

Референс реализации: `packages/guides/src/pages/CityMapPages.tsx`.

### 9.2. Карточка экскурсии

- ЧПУ slug в URL.
- H1 = название; subtitle с городом.
- Описание, маршрут, цена, формат (індив/група), отзывы.
- Блок гида + контакты.
- JSON-LD (Product / TouristTrip - сохранить текущую генерацию Go).
- Ссылки: город, страна, другие экскурсии гида.

### 9.3. Профиль гида

- H1 = имя + город(а).
- Текст «про гіда», языки, лицензия.
- Список экскурсий.
- Контакты (клики → `contact_guide_click` в GA4).
- Отзывы; `Person` + `AggregateRating` при наличии.

---

## 10. Исходная точка (snapshot)

- Индексируемый контент сфокусирован на `/svit/`; поддомен `svit.gaido-ua.com` сведён к 301 на apex.
- Техническая база стабильная (нет 4xx/5xx в crawl), legacy-редиректы в целом настроены.
- Главные дыры: ложные city URL, числовые slug экскурсий, тонкий HTML на карточках, нет аналитики конверсий.
- Стратегия пилота: одна сильная посадочная на город + страна + карточки; 20 приоритетных городов.

### Артефакты

- SF export: каталог `seo/` в корне репозитория (untracked; не коммитить без согласования).
- Этот документ: `docs/SEO-BASELINE.md`

### Следующие шаги

1. Экспорт метрик из GSC/GA4 на дату baseline.
2. Инженерный бэклог по P0 (редиректы, slug экскурсий, фантомные URL, crawl-body).
3. Настройка GA4-событий контакта с гидом.
4. Контент и FAQ на 20 городах пилота.
