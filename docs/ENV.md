# Environment variables

## Core

| Variable | Dev default | Production |
|----------|-------------|------------|
| `APP_ENV` | `development` | `production` (enables `config.Validate`) |
| `HTTP_ADDR` | `:8081` / `:8091` | as deployed |
| `CORS_ORIGINS` | `http://localhost:5173` | concrete origins, never `*` |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | public site origin for sitemap/robots |
| `DATABASE_URL` | local postgres | TLS/`sslmode` as required |
| `REDIS_*` | local redis | production Redis |

## Auth / security

| Variable | Notes |
|----------|--------|
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ≥32 chars, unique in prod |
| `JWT_ACCESS_TTL` | default `15m` |
| `TRUST_PROXY` | `true` behind nginx/Caddy so brute-force limits use `X-Forwarded-For` / `X-Real-IP`. If `false`, only `RemoteAddr` is used. |

### Auth rate limits (in-memory, single API instance)

| Endpoint | Limit |
|----------|--------|
| `POST /auth/login` | 10/min per IP **and** 5/15min per login |
| `POST /auth/register` | 5/min per IP |
| `POST /auth/refresh` | 30/min per IP |

Admins can reset login/IP blocks via `POST /api/v1/admin/auth/clear-rate-limit` (in-memory only; restart clears all buckets).

## Payments / monetization

| Variable / setting | Notes |
|--------------------|--------|
| `PAYMENT_STUB_ENABLED` | must be `false` in production |
| `guide_placement_payments_enabled` | **master monetization switch** (admin UI). Default **false** (growth). When `true`: contacts require active subscription; checkout for placement/featured. When `false`: ACTIVE guides show contacts; admin bypass allowed. |

## Frontend

| Variable | Notes |
|----------|--------|
| `VITE_API_URL` | API origin (empty = same host / proxy) |
| `VITE_PUBLIC_SITE_URL` | canonical/OG base URL |

## Seed

API **never** seeds on startup. For local demo data:

```bash
cd backend && go run ./cmd/seed -demo
# or: LOCAL_SEED=1 ./run-local.sh
```

`cmd/seed` refuses `APP_ENV=production`.

## Deploy (admin)

`DEPLOY_ENABLED`, `DEPLOY_SCRIPT`, `GIT_*` — keep gated and private-repo only.

## Telegram support bot

| Variable | Notes |
|----------|--------|
| `TELEGRAM_ENABLED` | `true` to enable webhook + public bot URL |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather (secret) |
| `TELEGRAM_BOT_USERNAME` | Public bot username without `@` — exposed as `telegram_bot_url` in `GET /api/v1/site` |
| `TELEGRAM_GROUP_CHAT_ID` | Supergroup ID with forum topics enabled |
| `TELEGRAM_WEBHOOK_SECRET` | Random secret for `X-Telegram-Bot-Api-Secret-Token` header |

### Register webhook (production, HTTPS required)

```bash
cd backend
go run ./cmd/telegram-webhook -action=set
go run ./cmd/telegram-webhook -action=info
```

Or manually:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$PUBLIC_BASE_URL/api/v1/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Frontend buttons use `data-telegram` attribute; empty value opens `telegram_bot_url` from site API.
