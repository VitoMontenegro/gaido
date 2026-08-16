# Experts Tourister

Каталог гидов и экскурсий (Go + React).

## Документация

| Документ | Описание |
|----------|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | обзор архитектуры |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | слои, service, PR checklist |
| [docs/ENV.md](docs/ENV.md) | переменные окружения dev/prod |
| [docs/REFACTORING_PLAN.md](docs/REFACTORING_PLAN.md) | план рефакторинга |
| [docs/adr/002-multi-vertical-modular-monolith.md](docs/adr/002-multi-vertical-modular-monolith.md) | масштабирование transport/services |
| [DEPLOY.md](DEPLOY.md) | деплой |

### Prod checklist (перед релизом)

- [ ] `APP_ENV=production` и `config.Validate` проходит
- [ ] `PAYMENT_STUB_ENABLED=false`
- [ ] JWT-секреты уникальны (≥32 символов), не dev-defaults
- [ ] `CORS_ORIGINS` — конкретные домены, не `*`
- [ ] `DATABASE_URL` с осознанным `sslmode`
- [ ] `TRUST_PROXY=true` за reverse-proxy (иначе rate-limit видит IP прокси)
- [ ] Монетизация выключена в админке до наполнения каталога (`guide_placement_payments_enabled=false` — контакты ACTIVE открыты; при `true` — paywall контактов + checkout)

## Quick start

### Одной командой (PhpStorm / терминал)

```bash
chmod +x restart-local.sh stop-local.sh run-local.sh
./restart-local.sh
```

Переменные окружения:

| Переменная | Эффект |
|------------|--------|
| `LOCAL_SKIP_FRONTEND=1` | только API (+ tail лога backend) |
| `LOCAL_SKIP_BACKEND=1` | только Vite |
| `LOCAL_SKIP_DOCKER=1` | не поднимать compose (PG/Redis уже запущены) |
| `LOCAL_SKIP_MIGRATE=1` | пропустить миграции |
| `LOCAL_SEED=1` | после старта API один раз `go run ./cmd/seed -demo` |

**PhpStorm:** Run → Edit Configurations → Shell Script → Script path: `$ProjectFileDir$/restart-local.sh`

Логи: `.local/logs/backend.log` · PID: `.local/pids/`

### Вручную

```bash
# Infrastructure (OrbStack / Docker)
docker compose up -d

cp .env.example .env

# Backend
cd backend && go mod download
go run ./cmd/migrate -cmd up
go run ./cmd/api
# optional demo data (dev only, never on API startup):
# go run ./cmd/seed -demo

# Frontend (monorepo, separate terminal)
npm install
LOCAL_APP=svit npm run dev:svit   # or dev:portal | dev:servis | dev:vezu
```

## Demo accounts

Демо-аккаунты появляются только после ручного seed (`go run ./cmd/seed -demo` или `LOCAL_SEED=1`). На проде seed при старте API не выполняется.

| User | Password | Role | Описание |
|------|----------|------|----------|
| guide1 | guide12345 | GUIDE | Иван Петров — ACTIVE, Москва, 3 экскурсии, лицензия |
| guide2 | guide12345 | GUIDE | Анна Смирнова — ACTIVE, СПб, 3 экскурсии, entertainer |
| guide3 | guide12345 | GUIDE | Михаил Орлов — ACTIVE, Москва+СПб, companion |
| guide4 | guide12345 | GUIDE | Елена Козлова — ACTIVE, Москва, без лицензии (без бейджа) |
| guide5 | guide12345 | GUIDE | Олег Новиков — WAITING_PAYMENT, paywall контактов |
| tourist1 | tourist12345 | TOURIST | Отзывы на guide1, guide2 |
| tourist2 | tourist12345 | TOURIST | Отзывы на guide1, guide3, guide4 |
| moderator | moderator123 | MODERATOR | Модерация |
| admin | admin12345 | ADMIN | Админка |

## Health

- `GET /healthz` — liveness
- `GET /readyz` — postgres + redis
