#!/usr/bin/env bash
# Остановка локальных процессов Experts Tourister (API + Vite).
# Postgres/Redis (Docker/OrbStack) не останавливает — см. docker compose down.
#
#   ./stop-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_ROOT="$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/local-common.sh"

BACKEND_PORT="${BACKEND_PORT:-8081}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

local_load_env "$ROOT"

echo "■ stop-local.sh"

local_stop_pidfile "$ROOT/.local/pids/backend.pid" "backend"
local_stop_pidfile "$ROOT/.local/pids/frontend.pid" "frontend"

local_kill_port "$BACKEND_PORT"
local_kill_port "$FRONTEND_PORT"

echo "✓ stopped (infra docker compose — отдельно)"
