# Experts Tourister

Каталог гидов и экскурсий (Go + React).

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

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## Demo accounts

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

Seed создаётся при старте API (`SEED_DEMO_DATA=true`). Повторный запуск идемпотентен — добавляет недостающих гидов и экскурсии.

## Health

- `GET /healthz` — liveness
- `GET /readyz` — postgres + redis
