#!/usr/bin/env bash
# Единая точка локального запуска Experts Tourister.
# Postgres (:5433) и Redis (:6380) — docker compose / OrbStack (опционально skip).
#
#   ./restart-local.sh
#   LOCAL_SKIP_FRONTEND=1 ./restart-local.sh
#   LOCAL_SKIP_DOCKER=1 ./restart-local.sh
#   LOCAL_SKIP_MIGRATE=1 ./restart-local.sh
#
# PhpStorm: Run Configuration → Shell Script → Script path: restart-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$ROOT/stop-local.sh"
exec "$ROOT/run-local.sh"
