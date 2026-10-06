#!/usr/bin/env bash
# Остановка локальных процессов Experts Tourister (API + Next).
# Postgres/Redis/web (Docker/OrbStack) — docker compose --profile web down.
#
#   ./stop-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_ROOT="$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/local-common.sh"

local_load_env "$ROOT"

BACKEND_PORT="${BACKEND_PORT:-${HTTP_ADDR#:}}"
BACKEND_PORT="${BACKEND_PORT:-8091}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo "■ stop-local.sh"

local_stop_pidfile "$ROOT/.local/pids/backend.pid" "backend"
local_stop_pidfile "$ROOT/.local/pids/frontend.pid" "frontend"

# Kill all known backend candidates — orphaned go-build binaries may linger on old ports.
# shellcheck disable=SC2046
for port in $(local_backend_port_candidates); do
  local_kill_port "$port" backend
done
local_stop_dev_frontends

# Stop Next compose service if running (keeps postgres/redis).
if command -v docker >/dev/null 2>&1; then
  (cd "$ROOT" && docker compose --profile web stop web 2>/dev/null) || true
fi

echo "✓ stopped (postgres/redis docker — отдельно: docker compose down)"
