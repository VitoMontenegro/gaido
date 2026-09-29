# Переезд поддоменов на подпапки gaido-ua.com

После деплоя сайт живёт на одном домене. Старые хосты остаются в DNS и в nginx только для постоянного редиректа.

| Было | Стало |
|---|---|
| `https://gaido-ua.com/` | хаб, без смены адреса |
| `https://svit.gaido-ua.com/путь` | `https://gaido-ua.com/svit/путь` |
| `https://servis.gaido-ua.com/путь` | `https://gaido-ua.com/servis/путь` |
| `https://vezu.gaido-ua.com/путь` | `https://gaido-ua.com/vezu/путь` |
| `https://*.gaido-ua.com/sitemap.xml` и `/robots.txt` | `https://gaido-ua.com/sitemap.xml` и `/robots.txt` |

Запросы `GET` и `HEAD` на трёх поддоменах отвечают **301**. Путь и query сохраняются, к пути добавляется `/svit`, `/servis` или `/vezu`. Исключения: `/robots.txt` и `/sitemap.xml` уходят на корень основного домена, без префикса. `/api/` на поддоменах не редиректится.

Канонический адрес, `og:url` и sitemap строятся из `PUBLIC_BASE_URL`. На проде это должно быть `https://gaido-ua.com`.

## До деплоя

На сервере в `/var/www/tourister/.env` оставить:

```
PUBLIC_BASE_URL=https://gaido-ua.com
CORS_ORIGINS=https://gaido-ua.com,https://www.gaido-ua.com,https://svit.gaido-ua.com,https://vezu.gaido-ua.com,https://servis.gaido-ua.com
```

Поддомены в CORS нужны, потому что API с них не переезжает.

Не снимать DNS `svit`, `vezu`, `servis` и не удалять их сертификаты Let's Encrypt. Без живого HTTPS Google не увидит 301.

Не убирать `server`-блоки поддоменов в nginx. Они должны проксировать на `127.0.0.1:8081` с заголовком `Host $host`. Редирект делает приложение, не nginx. Цепочка для HTTP нормальная: nginx поднимает на HTTPS того же хоста, затем приложение отдаёт 301 на `gaido-ua.com`.

## Деплой

Запушить `main`, затем обычный деплой (кнопка в админке или `deploy/deploy.sh` на сервере). Скрипт собирает четыре приложения с базой `https://gaido-ua.com` и путями `/`, `/svit/`, `/servis/`, `/vezu/`, кладёт статику в `www/portal`, `www/svit`, `www/servis`, `www/vezu` и перезапускает API.

## Проверка сразу после деплоя

С машины, с которой открывается прод:

```bash
./scripts/seo-check.sh https://gaido-ua.com
```

Вручную, если скрипт недоступен:

```bash
curl -sI https://svit.gaido-ua.com/excursion/test | head -n 5
curl -sI https://servis.gaido-ua.com/ | head -n 5
curl -sI https://vezu.gaido-ua.com/ | head -n 5
curl -sI https://svit.gaido-ua.com/sitemap.xml | head -n 5
```

В `Location` должен быть `https://gaido-ua.com/...`, код `301`.

Дальше открыть исходный HTML (не вкладку Elements после JS):

- `https://gaido-ua.com/` — title хаба, `canonical` = `https://gaido-ua.com/`
- `https://gaido-ua.com/svit/` — title каталога гидов, `canonical` = `https://gaido-ua.com/svit/`
- `https://gaido-ua.com/servis/` и `https://gaido-ua.com/vezu/` — title раздела и `canonical` на ту же подпапку
- карточка из sitemap (`/svit/excursion/...`) — свой title, description, `canonical` и `og:url` на `https://gaido-ua.com/svit/...`

В этих ответах не должно быть `svit.gaido-ua.com`, `servis.gaido-ua.com`, `vezu.gaido-ua.com`.

`https://gaido-ua.com/sitemap.xml` содержит `https://gaido-ua.com/`, `/svit/`, `/vezu/`, `/servis/` и страницы каталога только под `/svit/`. `https://gaido-ua.com/robots.txt` заканчивается строкой `Sitemap: https://gaido-ua.com/sitemap.xml`.

Страницы входа и кабинета отдают `noindex`. Их в sitemap нет.

## Поисковики

Инструмент «Изменение адреса» в Google **не использовать**. Он не переносит поддомен в подпапку того же домена. Сигнал передают 301, обновлённая карта и каноникалы. Старые URL из индекса вручную не удалять: снятие сотрёт накопленный вес раньше, чем Google обработает редирект.

До проверки `seo-check.sh` карту никуда не отправлять.

### Google Search Console

1. Свойство домена `gaido-ua.com` (или префикс `https://gaido-ua.com/`). Отдельные свойства поддоменов не удалять, пока в отчёте «Страницы» старые адреса не станут «Страница с переадресацией».
2. Файлы Sitemap: добавить `https://gaido-ua.com/sitemap.xml`. Старые карты поддоменов убрать из отправки, сами URL не закрывать в robots.
3. Проверка URL: вставить 3–5 старых адресов (`svit`, `servis`, `vezu`). Google должен показать переадресацию на новый URL. Затем проверить новые адреса хаба, `/svit/`, одной страны и одной экскурсии и запросить индексирование.
4. Через несколько дней смотреть «Страницы»: новые URL в индексе, старые — с переадресацией. Падение числа страниц на свойстве поддомена при росте на основном домене — ожидаемо.

Проверка разметки: [Rich Results](https://search.google.com/test/rich-results?url=https://gaido-ua.com/svit/).

### Bing Webmaster

1. Добавить `https://gaido-ua.com`, если сайта ещё нет. Поддомены не удалять.
2. Отправить `https://gaido-ua.com/sitemap.xml`.
3. Site Move не запускать: это смена домена, а не перенос в подпапку.
4. URL Inspection по одному старому и одному новому адресу каждого раздела.

### Яндекс Вебмастер

1. Сайт `https://gaido-ua.com` оставить основным. Поддомены не удалять, пока в индексе не сменятся адреса.
2. «Индексирование → Файлы Sitemap»: `https://gaido-ua.com/sitemap.xml`.
3. «Индексирование → Переезд сайта» на поддоменах не заполнять новым доменом: адрес регистрабельного домена тот же. Перенос делает 301.
4. «Переобход страниц»: главная, `/svit/`, `/servis/`, `/vezu/` и несколько карточек из sitemap.

## Что оставить на год

DNS, сертификаты и nginx-блоки `svit`, `vezu`, `servis` не убирать минимум год. Иначе оборвётся 301 и поисковики потеряют связь старого URL с новым.

`www.gaido-ua.com` по-прежнему открывает тот же портал. Каноникал главной — `https://gaido-ua.com/` без `www`.
