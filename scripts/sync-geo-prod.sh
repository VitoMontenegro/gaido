#!/usr/bin/env bash
# Синхронізація українських назв країн/міст на production (reference seed).
# Не чіпає користувачів і екскурсії — лише geo-каталог.
#
#   ./scripts/sync-geo-prod.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

exec "$ROOT/scripts/ssh-prod.sh" bash -s <<'REMOTE'
set -euo pipefail
APP_ROOT="${APP_ROOT:-/var/www/tourister}"
REPO="$APP_ROOT/repo"
ENV_FILE="$APP_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Нет $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

GO_BIN="${GO_BIN:-go}"
if ! command -v "$GO_BIN" >/dev/null 2>&1 && [[ -x /usr/local/go/bin/go ]]; then
  GO_BIN=/usr/local/go/bin/go
fi

cd "$REPO/backend"
echo "→ migrations (на всякий случай)"
"$APP_ROOT/bin/tourister-migrate" -cmd up

echo "→ reference seed (geo names, ~3–5 мин, Nominatim)"
export APP_ENV=production
export SEED_DEMO_DATA=false
"$GO_BIN" run ./cmd/seed -demo=false -reference

echo "→ готово"
REMOTE
