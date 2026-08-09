#!/usr/bin/env bash
# Локальный запуск Experts Tourister: Docker (PG+Redis) → migrate → Go API → Vite.
# Postgres (:5433) и Redis (:6380) — через docker compose / OrbStack.
#
#   ./run-local.sh
#   LOCAL_SKIP_FRONTEND=1 ./run-local.sh
#   LOCAL_SKIP_DOCKER=1 ./run-local.sh
#   LOCAL_SKIP_MIGRATE=1 ./run-local.sh
#   LOCAL_SKIP_BACKEND=1 ./run-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_ROOT="$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/local-common.sh"

BACKEND_PORT="${HTTP_ADDR:-${BACKEND_PORT:-8081}}"
BACKEND_PORT="${BACKEND_PORT#:}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
PG_HOST="${PG_HOST:-127.0.0.1}"
PG_PORT="${PG_PORT:-5433}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6380}"

local_load_env "$ROOT"
local_ensure_dirs "$ROOT"

echo "■ run-local.sh"

if [[ ! -f "$ROOT/.env" && -f "$ROOT/.env.example" ]]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "→ created .env from .env.example"
fi

if [[ "${LOCAL_SKIP_DOCKER:-0}" != "1" ]]; then
  echo "→ docker compose up -d"
  (cd "$ROOT" && docker compose up -d)
  local_wait_tcp "$PG_HOST" "$PG_PORT" "postgres"
  local_wait_tcp "$REDIS_HOST" "$REDIS_PORT" "redis"
else
  echo "→ skip docker (LOCAL_SKIP_DOCKER=1)"
  local_wait_tcp "$PG_HOST" "$PG_PORT" "postgres" 15 || true
  local_wait_tcp "$REDIS_HOST" "$REDIS_PORT" "redis" 15 || true
fi

if [[ "${LOCAL_SKIP_MIGRATE:-0}" != "1" ]]; then
  echo "→ migrations"
  (cd "$ROOT/backend" && go run ./cmd/migrate -cmd up)
else
  echo "→ skip migrate (LOCAL_SKIP_MIGRATE=1)"
fi

export HTTP_ADDR=":${BACKEND_PORT}"
export DATABASE_URL="${DATABASE_URL:-postgres://tourister:tourister@localhost:5433/tourister?sslmode=disable}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6380/0}"
export REDIS_SESSION_URL="${REDIS_SESSION_URL:-redis://localhost:6380/1}"
export REDIS_SIGNAL_URL="${REDIS_SIGNAL_URL:-redis://localhost:6380/2}"
export PAYMENT_STUB_ENABLED="${PAYMENT_STUB_ENABLED:-true}"

if [[ "${LOCAL_SKIP_BACKEND:-0}" != "1" ]]; then
  echo "→ backend :${BACKEND_PORT}"
  (
    cd "$ROOT/backend"
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

if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "→ npm install (frontend)"
  (cd "$ROOT/frontend" && npm install)
fi

echo "→ frontend :${FRONTEND_PORT} (foreground — Ctrl+C stops vite only; ./stop-local.sh for all)"
cd "$ROOT/frontend"
export PORT="$FRONTEND_PORT"
exec npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT"
