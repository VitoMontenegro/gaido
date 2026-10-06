# Деплой: Go API + Next.js

Один выключатель. Пока nginx смотрит на старый Go-SPA, прод не трогаем. После бэкапа выкладываем новую ветку и сразу переключаем nginx: HTML на Next `:3000`, API на Go `:8081`.

Локальный OrbStack на прод не переносится.

## Что изменилось в репозитории

| Было | Стало |
|---|---|
| Четыре Vite SPA (`apps/portal`, `svit`, `servis`, `vezu`) | Один Next.js `apps/web` |
| Go отдавал `index.html` и патчил SEO | Go отдаёт только API, `robots.txt`, `sitemap.xml` и 301 с поддоменов |
| `deploy.sh` собирал 4 dist в `STATIC_ROOT/{portal,svit,servis,vezu}` | `deploy.sh` делает `next build` и кладёт standalone в `/var/www/tourister/web` |
| Один процесс `tourister-api` | Плюс `tourister-web` (Node, порт 3000) |

Страницы по-прежнему один домен: `https://gaido-ua.com`, разделы `/svit/`, `/servis/`, `/vezu/`. Поддомены `svit.|servis.|vezu.gaido-ua.com` по-прежнему 301 на эти пути. Делает это Go, поэтому поддомены в nginx остаются проксированием на API, не на Next.

## Сервер после переключения

```
Интернет → nginx :443
  ├─ gaido-ua.com /api/  /healthz  /readyz  /robots.txt  /sitemap.xml → 127.0.0.1:8081 (Go)
  ├─ gaido-ua.com /*                                                     → 127.0.0.1:3000 (Next)
  └─ svit|servis|vezu.gaido-ua.com /*                                    → 127.0.0.1:8081 (301 на apex)
```

Next на той же ВМ ходит в Go по `http://127.0.0.1:8081` (`API_INTERNAL_URL`). Отдельный Docker на проде не нужен.

Порты снаружи не открывать: 3000 и 8081 только localhost.

## 1. Бэкап

На ВМ (`./scripts/ssh-prod.sh`):

```bash
stamp=$(date +%Y%m%d-%H%M%S)
mkdir -p /root/backups
tar -C /var/www -czf "/root/backups/tourister-$stamp.tgz" tourister
cp -a /etc/nginx /root/backups/nginx-$stamp
sudo -u postgres pg_dump -Fc tourister > "/root/backups/tourister-db-$stamp.dump" || true
systemctl list-units 'tourister*' --no-pager
```

Секреты остаются в `/var/www/tourister/.env`. Файл не коммитить и не перетирать шаблоном из репозитория.

Откат — только этот архив: код, nginx, unit’ы. Старый Vite и новый Next на проде вместе не держим.

## 2. Node.js 22

На AlmaLinux 8 его нет в базовых репозиториях. Один раз от root:

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs
node -v   # v22.x
```

Пользователь `deploy` должен уметь запустить `/usr/bin/node`.

## 3. systemd

Скопировать unit из репозитория (после того как новая ветка уже лежит в `/var/www/tourister/repo`, либо скопировать файл вручную):

```bash
cp /var/www/tourister/repo/deploy/systemd/tourister-web.service /etc/systemd/system/tourister-web.service
systemctl daemon-reload
systemctl enable tourister-web
```

Не запускать unit, пока `deploy.sh` не положит `/var/www/tourister/web`. Иначе `node server.js` упадёт.

Сервис:

- рабочий каталог `/var/www/tourister/web/apps/web`
- `PORT=3000`, `HOSTNAME=127.0.0.1`
- `API_INTERNAL_URL=http://127.0.0.1:8081`
- `NEXT_PUBLIC_SITE_URL=https://gaido-ua.com`
- логи `/var/www/tourister/logs/web.log`
- пользователь `deploy`
- unit **не** читает `/var/www/tourister/.env` (секреты API остаются только у `tourister-api`)

`tourister-api` не меняется: тот же бинарник, тот же `/var/www/tourister/.env`, порт `:8081`.

В sudoers для `deploy` должен быть рестарт нового юнита. Файл в репозитории: `deploy/sudoers.d/tourister-deploy`. Поставить его в `/etc/sudoers.d/tourister-deploy` (`chmod 440`).

## 4. Переменные `/var/www/tourister/.env`

Оставить как есть секреты, `DATABASE_URL`, Redis, JWT, `TRUST_PROXY=true`, `HTTP_ADDR=:8081`.

Проверить:

```bash
APP_ENV=production
HTTP_ADDR=:8081
PUBLIC_BASE_URL=https://gaido-ua.com
CORS_ORIGINS=https://gaido-ua.com,https://www.gaido-ua.com,https://svit.gaido-ua.com,https://servis.gaido-ua.com,https://vezu.gaido-ua.com
TRUST_PROXY=true
```

`STATIC_ROOT` и `STATIC_HOST_MAP` больше не участвуют в отдаче HTML. Каталог `/var/www/tourister/www` можно не удалять до успешного смоук-теста — это часть отката.

`NEXT_PUBLIC_*` и `API_INTERNAL_URL` в `.env` API не обязательны: их задаёт unit `tourister-web` и `deploy.sh` на время сборки.

## 5. nginx

Образец: `deploy/nginx/tourister.conf`. Подставить `gaido-ua.com` вместо `YOUR_DOMAIN` и существующие пути сертификатов Let's Encrypt. Не затирать рабочие `ssl_certificate`, если они отличаются от шаблона.

На **основном** домене:

- `location /api/`, `= /healthz`, `= /readyz`, `= /robots.txt`, `= /sitemap.xml` → `127.0.0.1:8081`
- `location /` → `127.0.0.1:3000`

На **поддоменах** `svit`, `servis`, `vezu` весь `location /` по-прежнему на `127.0.0.1:8081`. Иначе 301 на `/svit/…` не сработает.

`nginx -t` сделать заранее. `reload` — только в шаге 7, когда Next уже слушает `:3000`. До reload сайт ещё на старом Go.

## 6. Сборка и выкладка

Из-под пользователя `deploy` (скрипт сам переключается с root):

```bash
APP_ROOT=/var/www/tourister /var/www/tourister/repo/deploy/deploy.sh
```

Скрипт:

1. `git fetch` ветки `main` в `/var/www/tourister/repo`
2. `npm ci` и `next build` (`output: standalone`)
3. копирует сборку в `/var/www/tourister/web` (включая `.next/static` и `public`, симлинки шрифтов и картинок разворачиваются)
4. собирает Go: `tourister-api`, `tourister-migrate`, `tourister-news`
5. `goose` migrate up
6. через ~2–3 с рестартит `tourister-api` и `tourister-web`

Пока nginx не перезагружен, пользователи ещё на старом процессе. Рестарт API в конце скрипта уже отдаёт **новый** Go без HTML. Поэтому шаг 7 делать сразу после «DEPLOY OK», не откладывая.

Проверка, что процессы живы, ещё до reload nginx:

```bash
curl -fsS http://127.0.0.1:8081/healthz
curl -fsS http://127.0.0.1:8081/api/v1/seo/page-meta?path=/svit\&host=gaido-ua.com | head -c 200
curl -fsS http://127.0.0.1:3000/svit/ | head -c 400
systemctl status tourister-api tourister-web --no-pager
```

В HTML с `:3000` должны быть свой `<title>` и `<h1>`, не пустая оболочка.

Если `tourister-web` не стартует, смотреть `/var/www/tourister/logs/web.log`. Частая причина: нет `server.js` в `/var/www/tourister/web/apps/web` (сборка standalone в монорепо кладёт его туда).

## 7. Переключение nginx

```bash
nginx -t && systemctl reload nginx
```

С этой секунды `https://gaido-ua.com/` идёт в Next.

## 8. Проверка снаружи

С машины разработчика:

```bash
./scripts/seo-check.sh https://gaido-ua.com
```

Плюс руками:

- главная, `/news/`, `/svit/`, `/servis/`, `/vezu/`
- карточка из sitemap (`/svit/excursion/…`) — свой title без выполнения JS (`curl`)
- `/svit/login/` — в HTML есть `noindex`
- логин и кабинет в браузере
- `https://svit.gaido-ua.com/` → 301 на `https://gaido-ua.com/svit/`
- картинки и шрифты открываются с `/fonts/` и `/images/`

Логи: `/var/www/tourister/logs/api.log`, `web.log`, `deploy.log`.

## Откат

```bash
systemctl stop tourister-web
# вернуть /etc/nginx из /root/backups/nginx-<stamp>
nginx -t && systemctl reload nginx
# вернуть /var/www/tourister из tar, если бинарник API уже новый и без SPA
systemctl restart tourister-api
```

Nginx снова должен проксировать весь сайт на `:8081`, а в `/var/www/tourister` должен лежать **старый** бинарник, который умеет отдавать SPA из `STATIC_ROOT`. Новый API HTML не отдаёт: откат только кода API вместе с nginx, не одного nginx.
