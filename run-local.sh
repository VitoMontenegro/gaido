#!/usr/bin/env bash
# Локальный запуск: Docker (PG+Redis[+Next]) → migrate → Go API → Next.js.
# Порты: API :8091, Next :3000, PG :5433, Redis :6380 (OrbStack-safe).
# :8080/:8081 часто заняты OrbStack — не используем.
#
#   ./run-local.sh
#   LOCAL_SKIP_FRONTEND=1 ./run-local.sh
#   LOCAL_SKIP_DOCKER=1 ./run-local.sh
#   LOCAL_NEXT_HOST=1 ./run-local.sh   # Next на Mac вместо OrbStack
#   LOCAL_SKIP_MIGRATE=1 ./run-local.sh
#   LOCAL_SKIP_BACKEND=1 ./run-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_ROOT="$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/local-common.sh"

local_ensure_dirs "$ROOT"

if [[ ! -f "$ROOT/.env" && -f "$ROOT/.env.example" ]]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "→ created .env from .env.example"
fi

local_load_env "$ROOT"
local_resolve_ports "$ROOT"

PG_HOST="${PG_HOST:-127.0.0.1}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"

export DATABASE_URL="${DATABASE_URL:-postgres://tourister:tourister@${PG_HOST}:${PG_PORT}/tourister?sslmode=disable}"
export REDIS_URL="${REDIS_URL:-redis://${REDIS_HOST}:${REDIS_PORT}/0}"
export REDIS_SESSION_URL="${REDIS_SESSION_URL:-redis://${REDIS_HOST}:${REDIS_PORT}/1}"
export REDIS_SIGNAL_URL="${REDIS_SIGNAL_URL:-redis://${REDIS_HOST}:${REDIS_PORT}/2}"
export PAYMENT_STUB_ENABLED="${PAYMENT_STUB_ENABLED:-true}"

echo "■ run-local.sh"

if [[ "${LOCAL_SKIP_DOCKER:-0}" != "1" ]]; then
  echo "→ docker compose up -d (postgres redis)"
  (cd "$ROOT" && docker compose up -d postgres redis)
  local_wait_tcp "$PG_HOST" "$PG_PORT" "postgres"
  local_wait_tcp "$REDIS_HOST" "$REDIS_PORT" "redis"
else
  echo "→ skip docker (LOCAL_SKIP_DOCKER=1)"
  local_wait_tcp "$PG_HOST" "$PG_PORT" "postgres" 15 || true
  local_wait_tcp "$REDIS_HOST" "$REDIS_PORT" "redis" 15 || true
fi

if [[ "${LOCAL_SKIP_MIGRATE:-0}" != "1" ]]; then
  echo "→ migrations (DATABASE_URL → ${PG_HOST}:${PG_PORT})"
  (cd "$ROOT/backend" && go run ./cmd/migrate -cmd up)
else
  echo "→ skip migrate (LOCAL_SKIP_MIGRATE=1)"
fi

if [[ "${LOCAL_SKIP_BACKEND:-0}" != "1" ]]; then
  echo "→ backend :${BACKEND_PORT}"
  (
    cd "$ROOT/backend"
    export HTTP_ADDR BACKEND_PORT CORS_ORIGINS PUBLIC_BASE_URL DATABASE_URL REDIS_URL REDIS_SESSION_URL REDIS_SIGNAL_URL
    exec go run ./cmd/api
  ) >>"$ROOT/.local/logs/backend.log" 2>&1 &
  echo $! >"$ROOT/.local/pids/backend.pid"
  local_wait_tcp "127.0.0.1" "$BACKEND_PORT" "backend" 45
  if [[ "${LOCAL_SEED:-0}" == "1" ]]; then
    echo "→ demo seed (LOCAL_SEED=1)"
    (cd "$ROOT/backend" && go run ./cmd/seed -demo) >>"$ROOT/.local/logs/backend.log" 2>&1 || echo "→ seed failed (see backend.log)"
  fi
else
  echo "→ skip backend (LOCAL_SKIP_BACKEND=1)"
fi

local_print_urls "$BACKEND_PORT" "$FRONTEND_PORT"

if [[ "${LOCAL_SKIP_FRONTEND:-0}" == "1" ]]; then
  echo "→ frontend skipped (LOCAL_SKIP_FRONTEND=1)"
  echo "→ tail backend log: tail -f $ROOT/.local/logs/backend.log"
  exec tail -f "$ROOT/.local/logs/backend.log"
fi

if [[ ! -d "$ROOT/node_modules" ]]; then
  echo "→ npm install (monorepo root)"
  (cd "$ROOT" && npm install)
fi

export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:${FRONTEND_PORT}}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}"
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://127.0.0.1:${BACKEND_PORT}}"
export NEXT_PUBLIC_BUILD_ID="${NEXT_PUBLIC_BUILD_ID:-dev}"

if [[ "${LOCAL_NEXT_HOST:-0}" == "1" ]]; then
  echo "→ Next.js on host :${FRONTEND_PORT} (LOCAL_NEXT_HOST=1, foreground — Ctrl+C)"
  cd "$ROOT"
  export PORT="$FRONTEND_PORT"
  exec npm run dev -w @gaido/web -- --port "$FRONTEND_PORT"
fi

if [[ "${LOCAL_SKIP_DOCKER:-0}" != "1" ]]; then
  echo "→ Next.js in OrbStack :${FRONTEND_PORT} (compose profile web)"
  (
    cd "$ROOT"
    API_INTERNAL_URL="http://host.docker.internal:${BACKEND_PORT}" \
    NEXT_PUBLIC_SITE_URL="http://localhost:${FRONTEND_PORT}" \
    docker compose --profile web up --build web
  )
else
  echo "→ Next.js on host :${FRONTEND_PORT} (LOCAL_SKIP_DOCKER=1)"
  cd "$ROOT"
  exec npm run dev -w @gaido/web -- --port "$FRONTEND_PORT"
fi
