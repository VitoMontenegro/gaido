# DEPLOY.md — развёртывание Experts Tourister

Playbook для поднятия production-сервера, миграций и деплоя из Git.  
Документ рассчитан на **ручное выполнение** и на **запуск через AI-агента** (промпты в конце).

> **Важно:** перенос данных со старого сервера **не планируется**. На prod поднимается **новая пустая PostgreSQL**; схема и справочники создаются **goose-миграциями** из репозитория (`backend/migrations/*.sql`).

---

## Принципы

| Решение | Почему |
|---------|--------|
| **Без Docker на prod** | Меньше RAM/CPU, дешевле VPS, проще отладка |
| **Go бинарник + systemd** | API отдаёт `/api/*`, `/media/*` и SPA из `frontend/dist` |
| **PostgreSQL + Redis из apt** | Нативные сервисы на localhost |
| **Nginx** | TLS (Let's Encrypt), proxy на Go :8081 |
| **Деплой из Git** | `deploy.sh`: pull → build → migrate → restart |
| **Кнопка в админке** | `POST /api/v1/admin/deploy` → запуск `deploy.sh` |

Docker Compose (`docker-compose.yml`) остаётся **только для локальной разработки**.

---

## Стек проекта

```
experts-tourister/
├── backend/
│   ├── cmd/api/main.go          # HTTP-сервер
│   ├── cmd/migrate/main.go      # goose migrations
│   └── migrations/*.sql         # 30+ SQL-миграций
├── frontend/
│   └── src/api/client.ts        # VITE_API_URL="" → same origin в prod
├── .env.example
├── restart-local.sh             # локальный dev
└── deploy/                      # создаёт агент (см. раздел 2)
```

Переменные окружения — см. `.env.example`. Production-отличия:

```bash
APP_ENV=production
SEED_DEMO_DATA=false                 # без демо-гидов/туристов; только миграции
PAYMENT_STUB_ENABLED=false          # когда подключите реальные платежи
CORS_ORIGINS=https://YOUR_DOMAIN.com
MEDIA_STORAGE_PATH=/var/www/tourister/storage
DEPLOY_ENABLED=true                 # включает endpoint деплоя
DEPLOY_SCRIPT=/var/www/tourister/repo/deploy/deploy.sh
DEPLOY_LOG=/var/www/tourister/logs/deploy.log
DEPLOY_APP_SLUG=web-prod-2026       # slug для /deploy?app=…
```

---

## Архитектура production

```
Internet
   │
   ▼
Nginx :443 (TLS)
   └── proxy → 127.0.0.1:8081

systemd: tourister-api
   └── /var/www/tourister/bin/tourister-api
       ├── /api/v1/*
       ├── /healthz, /readyz
       ├── /media/public/*
       └── /* → frontend/dist (SPA)

PostgreSQL 16  → 127.0.0.1:5432
Redis 7        → 127.0.0.1:6379

/var/www/tourister/
├── repo/       # git clone
├── bin/        # tourister-api, tourister-migrate
├── storage/    # медиафайлы (бэкап обязателен!)
├── logs/       # api.log, deploy.log
├── .env        # секреты (НЕ в git)
└── backups/    # pg_dump
```

---

## Фаза 0 — переменные (заполнить до старта)

```bash
DOMAIN=example.com
GIT_REPO=git@github.com:USER/experts-tourister.git
GIT_BRANCH=main
SERVER_IP=0.0.0.0
SSH_USER=deploy
APP_ROOT=/var/www/tourister
```

---

## Фаза 1 — что агент должен добавить в репозиторий

Перед деплоем на сервер агент создаёт файлы ниже **в этом репозитории** и пушит в Git.

### 1.1. `deploy/deploy.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/tourister}"
REPO="${REPO:-$APP_ROOT/repo}"
ENV_FILE="${ENV_FILE:-$APP_ROOT/.env}"
LOG="${LOG:-$APP_ROOT/logs/deploy.log}"
GIT_BRANCH="${GIT_BRANCH:-main}"

mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "=== DEPLOY START $(date -Is) branch=$GIT_BRANCH ==="

cd "$REPO"
git fetch origin
git reset --hard "origin/$GIT_BRANCH"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "→ frontend build"
cd "$REPO/frontend"
npm ci
npm run build

echo "→ backend build"
cd "$REPO/backend"
/usr/local/go/bin/go build -ldflags="-s -w" -o "$APP_ROOT/bin/tourister-api" ./cmd/api
/usr/local/go/bin/go build -ldflags="-s -w" -o "$APP_ROOT/bin/tourister-migrate" ./cmd/migrate

echo "→ migrations"
"$APP_ROOT/bin/tourister-migrate" -cmd up

echo "→ restart api"
sudo systemctl restart tourister-api

sleep 2
curl -sf "http://127.0.0.1:${HTTP_ADDR:-:8081}/readyz" | head -c 200
echo
echo "=== DEPLOY OK $(date -Is) ==="
```

```bash
chmod +x deploy/deploy.sh
```

### 1.2. `deploy/env.production.example`

Шаблон для `/var/www/tourister/.env` (копировать на сервер, не коммитить с секретами).

### 1.3. `deploy/systemd/tourister-api.service`

```ini
[Unit]
Description=Experts Tourister API
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
User=deploy
Group=deploy
WorkingDirectory=/var/www/tourister/repo/backend
EnvironmentFile=/var/www/tourister/.env
ExecStart=/var/www/tourister/bin/tourister-api
Restart=always
RestartSec=5
StandardOutput=append:/var/www/tourister/logs/api.log
StandardError=append:/var/www/tourister/logs/api.log

[Install]
WantedBy=multi-user.target
```

### 1.4. `deploy/nginx/tourister.conf`

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    client_max_body_size 12m;

    ssl_certificate     /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 1.5. `deploy/sudoers.d/tourister-deploy`

Разрешить `deploy` перезапускать API без пароля:

```
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart tourister-api, /bin/systemctl status tourister-api
```

### 1.6. `scripts/backup-db.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="${BACKUP_DIR:-/var/www/tourister/backups}"
mkdir -p "$BACKUP_DIR"
pg_dump -U tourister tourister | gzip > "$BACKUP_DIR/tourister-$(date +%F-%H%M).sql.gz"
find "$BACKUP_DIR" -name '*.sql.gz' -mtime +14 -delete
```

Cron: `0 3 * * * /var/www/tourister/repo/scripts/backup-db.sh`

### 1.7. Backend — endpoint деплоя

Новый файл `backend/internal/app/deploy.go`:

| Endpoint | Метод | Доступ | Действие |
|----------|-------|--------|----------|
| `/api/v1/admin/deploy` | POST | ROLE_ADMIN | Запуск `deploy.sh` в фоне |
| `/api/v1/admin/deploy/status` | GET | ROLE_ADMIN | Статус + tail `deploy.log` |

Требования к реализации:

- Читать из config: `DEPLOY_ENABLED`, `DEPLOY_SCRIPT`, `DEPLOY_LOG`, `DEPLOY_APP_SLUG`
- POST body: `{ "confirm": "DEPLOY", "app": "web-prod-2026" }` — `app` должен совпадать с `DEPLOY_APP_SLUG`
- Mutex: второй деплой пока идёт первый → 409
- `DEPLOY_ENABLED=false` → 503 (endpoint выключен локально)
- RBAC: маршруты под `/admin/*` — политика уже покрывает `ROLE_ADMIN`

Добавить в `backend/internal/config/config.go`:

```go
DeployEnabled bool
DeployScript  string
DeployLog     string
DeployAppSlug string
```

Env:

```bash
DEPLOY_ENABLED=true
DEPLOY_SCRIPT=/var/www/tourister/repo/deploy/deploy.sh
DEPLOY_LOG=/var/www/tourister/logs/deploy.log
DEPLOY_APP_SLUG=web-prod-2026
```

Зарегистрировать в `app.go` в группе admin:

```go
ar.Post("/admin/deploy", a.adminStartDeploy)
ar.Get("/admin/deploy/status", a.adminDeployStatus)
```

### 1.8. Frontend — страница сборки (как Planet `/downloads?app=…`)

**Референс:** [planet.taix.ru/downloads?app=apk-build-2026-x7q](https://planet.taix.ru/downloads?app=apk-build-2026-x7q) — блок «Пересборка приложения» с одной кнопкой и пояснением, что делает сервер.

Для Experts Tourister — **та же UX-логика**, но без APK/скачиваний: только пересборка web (Go + SPA + миграции).

#### URL и доступ

| Параметр | Значение |
|----------|----------|
| Route | `/deploy?app=WEB_PROD_SLUG` |
| Пример | `https://your-domain.com/deploy?app=web-prod-2026` |
| Доступ | `RoleGate role="ROLE_ADMIN"` **и** совпадение `app` с env `DEPLOY_APP_SLUG` |
| Ссылка в админке | «Деплой» → `/deploy?app=${DEPLOY_APP_SLUG}` (slug из config API или захардкожен в prod) |

Env на сервере:

```bash
DEPLOY_APP_SLUG=web-prod-2026
```

Если `?app=` не совпадает с `DEPLOY_APP_SLUG` → 404 или «Невідомий профіль збірки».

#### Макет страницы (сверху вниз)

```
[← На головну]   [← Адмін-панель]

# Збірка та деплой

Пересборка production-сайту з Git: backend, frontend, міграції БД.

────────────────────────────────────────
## Пересборка сайту для production

Жмёшь кнопку — сервер:
  • git fetch + reset --hard origin/main
  • npm ci && npm run build (frontend/dist)
  • go build api + migrate binary
  • goose up (нові міграції на порожній/існуючій БД)
  • systemctl restart tourister-api
  • curl /readyz

Папка storage/ і дані БД не чіпаються. Якщо exit=0 — зміни вже в prod.

[  Пересобрати сайт  ]     ← primary button, disabled поки running

Статус: ● idle | ⟳ running | ✓ success | ✗ failed
Гілка: main · Коміт: abc1234 · 2026-08-09 14:32
Тривалість: 2m 14s · exit code: 0

────────────────────────────────────────
## Журнал збірки

<pre scrollable, monospace, last ~80 lines deploy.log>

[Оновити статус]  (опційно; інакше polling 3 сек)
```

Тексты — українською (як решта адмінки), по змісту аналог Planet:

> *«Жмёшь кнопку — сервер клонирует/обновляет git, собирает Go-backend и SPA-фронт, выкладывает и перезапускает systemd-юнит.»*

#### Поведение кнопки «Пересобрати сайт»

1. Кнопка disabled, якщо `status === "running"`.
2. Опційно: модалка «Введіть DEPLOY для підтвердження» (безпека вище за Planet).
3. `POST /api/v1/admin/deploy` body: `{ "confirm": "DEPLOY", "app": "web-prod-2026" }`.
4. Одразу polling `GET /api/v1/admin/deploy/status?app=web-prod-2026` кожні 3 сек.
5. При `success` / `failed` — зупинити polling, показати exit code і час.

#### API — розширений status

`GET /api/v1/admin/deploy/status?app=web-prod-2026`

```json
{
  "status": "idle",
  "running": false,
  "app": "web-prod-2026",
  "branch": "main",
  "commit": "a1b2c3d",
  "commit_message": "fix: guide page",
  "started_at": "2026-08-09T12:00:00Z",
  "finished_at": "2026-08-09T12:02:14Z",
  "exit_code": 0,
  "duration_sec": 134,
  "log_tail": "=== DEPLOY START ...\n=== DEPLOY OK ...",
  "readyz_ok": true
}
```

Backend при старті деплою записує в state (memory + опційно файл `deploy.state.json`):

- `started_at`, `pid`, `app`
- після завершення — `exit_code`, `finished_at`, tail лога

#### Файли frontend

| Файл | Назначение |
|------|------------|
| `frontend/src/pages/DeployPage.tsx` | сторінка `/deploy` |
| `frontend/src/app/App.tsx` | route з `RoleGate` |
| `frontend/src/api/client.ts` | `adminApi.deployStatus(app)`, `adminApi.startDeploy(app)` |
| `AdminPages.tsx` або `MainLayout` | посилання «Деплой» для admin |

Route в `App.tsx`:

```tsx
<Route path="/deploy" element={
  <RoleGate role="ROLE_ADMIN"><DeployPage /></RoleGate>
} />
```

Query param: `const app = new URLSearchParams(location.search).get('app') ?? ''`

#### Відмінності від Planet

| Planet | Experts Tourister |
|--------|-------------------|
| `/downloads?app=apk-build-…` | `/deploy?app=web-prod-…` |
| Кнопка без confirm | Рекомендовано confirm `DEPLOY` |
| Секции скачивания APK | Не нужны |
| Публичная страница | Только ROLE_ADMIN |
| Не трогает `/apk/` | Не трогает `storage/` и БД-данные |

#### Nginx

Маршрут `/deploy` — SPA fallback через Go (как и остальные страницы), отдельный location не нужен.


---

## Фаза 2 — подготовка VPS (Ubuntu 24.04)

Минимум: **2 vCPU, 4 GB RAM, 40 GB SSD** (Hetzner CX22 / аналог).

### 2.1. Базовая настройка

```bash
ssh root@SERVER_IP

apt update && apt upgrade -y
apt install -y git curl ufw fail2ban nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib redis-server

adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### 2.2. PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER tourister WITH PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE tourister OWNER tourister;
GRANT ALL PRIVILEGES ON DATABASE tourister TO tourister;
SQL
```

Проверка: `psql -U tourister -h 127.0.0.1 -d tourister -c 'SELECT 1'`

### 2.3. Redis (только localhost)

```bash
sudo sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
sudo sed -i 's/^# bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
sudo systemctl enable --now redis-server
redis-cli ping   # PONG
```

### 2.4. Go и Node

```bash
# Go 1.25+ (версия из backend/go.mod)
wget -q https://go.dev/dl/go1.25.7.linux-amd64.tar.gz
rm -rf /usr/local/go && tar -C /usr/local -xzf go1.25.7.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> /home/deploy/.bashrc

# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

### 2.5. SSH-ключ для Git

```bash
su - deploy
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

Добавить ключ как **Deploy key (read-only)** в GitHub/GitLab.

### 2.6. Каталоги и clone

```bash
sudo mkdir -p /var/www/tourister/{repo,bin,storage,logs,backups}
sudo chown -R deploy:deploy /var/www/tourister

su - deploy
cd /var/www/tourister/repo
git clone GIT_REPO .
git checkout main
```

### 2.7. Production `.env`

```bash
cp /var/www/tourister/repo/deploy/env.production.example /var/www/tourister/.env
nano /var/www/tourister/.env
```

Обязательно сгенерировать:

```bash
openssl rand -hex 32   # JWT_ACCESS_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
```

Ключевые значения:

```bash
APP_ENV=production
HTTP_ADDR=:8081
CORS_ORIGINS=https://YOUR_DOMAIN.com
DATABASE_URL=postgres://tourister:CHANGE_ME_STRONG@127.0.0.1:5432/tourister?sslmode=disable
REDIS_URL=redis://127.0.0.1:6379/0
REDIS_SESSION_URL=redis://127.0.0.1:6379/1
REDIS_SIGNAL_URL=redis://127.0.0.1:6379/2
MEDIA_STORAGE_PATH=/var/www/tourister/storage
SEED_DEMO_DATA=false                 # без демо-гидов/туристов; только миграции
DEPLOY_ENABLED=true
DEPLOY_SCRIPT=/var/www/tourister/repo/deploy/deploy.sh
DEPLOY_LOG=/var/www/tourister/logs/deploy.log
DEPLOY_APP_SLUG=web-prod-2026
```

### 2.8. systemd + sudoers

```bash
sudo cp /var/www/tourister/repo/deploy/systemd/tourister-api.service /etc/systemd/system/
sudo cp /var/www/tourister/repo/deploy/sudoers.d/tourister-deploy /etc/sudoers.d/tourister-deploy
sudo chmod 440 /etc/sudoers.d/tourister-deploy
sudo visudo -c

sudo systemctl daemon-reload
sudo systemctl enable tourister-api
```

### 2.9. Nginx + SSL

```bash
sudo sed "s/YOUR_DOMAIN/YOUR_DOMAIN.com/g" \
  /var/www/tourister/repo/deploy/nginx/tourister.conf \
  | sudo tee /etc/nginx/sites-available/tourister

sudo ln -sf /etc/nginx/sites-available/tourister /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

# сначала HTTP-only для certbot, если сертификата ещё нет:
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
sudo systemctl reload nginx
```

### 2.10. Первый деплой (ручной)

```bash
su - deploy
/var/www/tourister/repo/deploy/deploy.sh
sudo systemctl status tourister-api
curl -s http://127.0.0.1:8081/readyz
curl -I https://YOUR_DOMAIN.com/healthz
```

---

## Фаза 3 — новая БД и миграции

### Что происходит при первом деплое

1. PostgreSQL — **пустая** база `tourister` (создана в Фазе 2.2).
2. `deploy.sh` → `tourister-migrate -cmd up` применяет все SQL из `backend/migrations/`.
3. Миграции создают таблицы **и** базовые справочники (страны, города, настройки и т.д.).
4. `SEED_DEMO_DATA=false` — **демо-пользователи и демо-экскурсии не создаются**.

Проверка после первого деплоя:

```bash
psql -U tourister -h 127.0.0.1 -d tourister -c '\dt'
psql -U tourister -h 127.0.0.1 -d tourister -c "SELECT COUNT(*) FROM goose_db_version;"
```

### Локально (dev)

```bash
docker compose up -d          # PG :5433, Redis :6380
cp .env.example .env
make migrate-up               # go run ./cmd/migrate -cmd up
```

### На сервере

Миграции запускаются **автоматически** при каждом деплое:

```bash
/var/www/tourister/bin/tourister-migrate -cmd up
```

Ручной запуск:

```bash
set -a && source /var/www/tourister/.env && set +a
/var/www/tourister/bin/tourister-migrate -cmd up
```

Откат одной версии (осторожно, только если знаете что делаете):

```bash
/var/www/tourister/bin/tourister-migrate -cmd down
```

---

## Фаза 4 — первый admin и go-live (новая БД)

API **не сидит данные при старте**. Демо-аккаунты из README — только локально: `cd backend && go run ./cmd/seed -demo` (`cmd/seed` отказывается работать при `APP_ENV=production`).

### 4.1. Создать первого администратора

**Рекомендуемый способ — регистрация + роль в БД:**

```bash
# 1. Зарегистрировать пользователя через /register на сайте
# 2. Назначить роль ADMIN в psql:
psql -U tourister -h 127.0.0.1 -d tourister -c \
  "UPDATE users SET roles = '{ROLE_ADMIN}' WHERE login = 'YOUR_LOGIN';"
```

### 4.2. Медиа и контент

- Каталог `/var/www/tourister/storage/` на старте **пустой**.
- Старые медиафайлы **не переносим** (как и БД) — гиды загружают контент заново.
- Если позже понадобится перенос только файлов — отдельный `rsync` (без БД).

### 4.3. DNS

1. A-запись `@` и `www` → `SERVER_IP`
2. TTL 300–600
3. Certbot (Фаза 2.9)
4. Smoke test:
   - `GET https://DOMAIN/readyz`
   - регистрация / вход admin
   - создание экскурсии + загрузка фото
   - деплой через `/deploy?app=web-prod-2026`

---

## Фаза 5 — деплой через страницу сборки

1. Войти как admin
2. Открыть **`/deploy?app=web-prod-2026`** (slug из `DEPLOY_APP_SLUG`)
3. Нажать **«Пересобрати сайт»** → подтвердить `DEPLOY`
4. Дождаться `status: success` и `readyz_ok: true`

Страница по UX как [Planet downloads](https://planet.taix.ru/downloads?app=apk-build-2026-x7q): одна кнопка пересборки, пояснение шагов, статус и лог — без секций скачивания.

Что происходит:

```
git fetch + reset --hard origin/main
  → npm ci && npm run build
  → go build api + migrate
  → goose up (backend/migrations/*.sql)
  → systemctl restart tourister-api
  → curl /readyz
```

Лог: `/var/www/tourister/logs/deploy.log`

---

## Чеклист перед go-live

- [ ] Новая БД создана, миграции применены (`goose_db_version` не пуст)
- [ ] `SEED_DEMO_DATA=false` (после создания первого admin)
- [ ] Первый admin создан (Фаза 4.1)
- [ ] JWT-секреты новые (не из `.env.example`)
- [ ] Пароль admin сменён с дефолтного (если использовали seed)
- [ ] `GET https://DOMAIN/readyz` → OK
- [ ] SPA открывается, API отвечает
- [ ] Загрузка/просмотр медиа работает (новые файлы)
- [ ] Тестовый деплой через `/deploy?app=…` успешен
- [ ] Cron бэкапа PG настроен
- [ ] Uptime-мониторинг на `/healthz`

---

## Troubleshooting

| Симптом | Проверка |
|---------|----------|
| 502 от Nginx | `systemctl status tourister-api`, `tail logs/api.log` |
| migrate failed | `deploy.log`, `DATABASE_URL`, права PG |
| deploy 409 | уже идёт деплой, подождать |
| deploy 503 | `DEPLOY_ENABLED=false` в `.env` |
| CORS ошибки | `CORS_ORIGINS` должен содержать https://DOMAIN |
| Пустой frontend | `frontend/dist` не собран → запустить deploy |
| sudo при deploy | проверить `/etc/sudoers.d/tourister-deploy` |

---

## Промпты для AI-агента

### Промпт A — подготовка репозитория (локально, до сервера)

```
Проект: Experts Tourister (/Users/vitomonte/Desktop/goproject)
Стек: Go 1.25 (chi), React/Vite, PostgreSQL, Redis.
Production БЕЗ Docker — только apt + systemd.

Прочитай DEPLOY.md и реализуй Фазу 1 полностью:

1. deploy/deploy.sh
2. deploy/env.production.example
3. deploy/systemd/tourister-api.service
4. deploy/nginx/tourister.conf
5. deploy/sudoers.d/tourister-deploy
6. scripts/backup-db.sh
7. backend/internal/config/config.go — поля DeployEnabled, DeployScript, DeployLog
8. backend/internal/app/deploy.go — POST /api/v1/admin/deploy, GET /api/v1/admin/deploy/status
9. Регистрация роутов в app.go
10. frontend: DeployPage.tsx, route /deploy?app=, методы в client.ts, ссылка «Деплой» в админке

Страница сборки — по образцу Planet (/downloads?app=…):
- URL /deploy?app=WEB_PROD_SLUG, slug = DEPLOY_APP_SLUG
- Блок «Пересборка сайту», кнопка «Пересобрати сайт»
- Статус (idle/running/success/failed), commit, branch, log tail, exit code
- POST { confirm: "DEPLOY", app: slug }, polling status каждые 3 сек
- Только ROLE_ADMIN; без секций APK/скачивания

Требования:
- POST body { "confirm": "DEPLOY", "app": "<DEPLOY_APP_SLUG>" }, mutex, DEPLOY_ENABLED=false локально
- RBAC: только ROLE_ADMIN
- Не коммить секреты
- DEPLOY_ENABLED=false в .env.example
- go test ./... и npm run build должны проходить

После изменений выведи список созданных файлов и команды git add/commit (коммит только если попрошу).
```

### Промпт B — первичная настройка VPS (новая БД)

```
Разверни Experts Tourister на чистом Ubuntu 24.04 по DEPLOY.md (Фазы 2–4).

Параметры:
- SERVER_IP: XXX.XXX.XXX.XXX
- DOMAIN: example.com
- GIT_REPO: git@github.com:USER/experts-tourister.git
- GIT_BRANCH: main
- SSH: root, затем пользователь deploy

Важно: БД НОВАЯ, pg_dump/pg_restore НЕ используем.
Данные создаются только goose-миграциями из backend/migrations/.

Выполни по SSH:
- установку postgresql, redis, nginx, go, node
- создание ПУСТОЙ БД tourister
- clone репо в /var/www/tourister/repo
- .env из deploy/env.production.example (SEED_DEMO_DATA=false, сгенерируй JWT secrets)
- systemd, sudoers, nginx, certbot
- первый запуск deploy/deploy.sh (migrate up на пустой БД)
- создание первого admin (Фаза 4.1, вариант A или B)
- проверку /readyz и https://DOMAIN/healthz

Не используй Docker на prod.
Выводи каждую команду и результат. Остановись если нужен Deploy key — покажи публичный ключ.
```

### Промпт C — go-live и первый admin

```
На уже развёрнутом Experts Tourister (DEPLOY.md) выполни Фазу 4:

- БД новая, миграции уже применены
- SEED_DEMO_DATA=false
- Создай первого admin (вариант A: временный seed, или B: register + UPDATE roles)
- Проверь: login admin, /admin, /deploy?app=web-prod-2026 (если DEPLOY_ENABLED=true)
- Настрой DNS A-запись на SERVER_IP если ещё не сделано
- Smoke test: регистрация, загрузка медиа, readyz

pg_dump, pg_restore, rsync storage — НЕ использовать.
```

### Промпт D — только деплой новой версии

```
На сервере deploy@SERVER_IP выполни деплой Experts Tourister:
/var/www/tourister/repo/deploy/deploy.sh

Если код ещё не в main — сначала push в Git, потом deploy.
Проверь deploy.log и /readyz. Сообщи результат.
```

---

## Локальная разработка vs production

| | Local | Production |
|---|-------|------------|
| PG/Redis | Docker compose :5433/:6380 | apt, :5432/:6379 |
| Frontend | Vite :5173 + proxy | `frontend/dist` через Go |
| API | `go run ./cmd/api` | systemd binary |
| Seed | ручной `go run ./cmd/seed -demo` | не запускать |
| Deploy UI | `DEPLOY_ENABLED=false` | `true` |
| TLS | нет | Nginx + certbot |

---

## Контакты и секреты

- `.env` на сервере: `/var/www/tourister/.env` — права `600`, владелец `deploy`
- Deploy key Git: read-only
- Бэкапы: `/var/www/tourister/backups/` — вынести off-site (S3, другой сервер)
