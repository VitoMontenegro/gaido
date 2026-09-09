#!/usr/bin/env bash
# Восстановить zip-бэкап (scripts/backup-db.sh) в PostgreSQL на любом сервере.
#
#   DATABASE_URL=postgres://user:pass@host:5432/dbname ./scripts/restore-db.sh tourister-db-….zip
#   ./scripts/restore-db.sh tourister-db-….zip postgres://user:pass@host:5432/dbname
#
# База уже должна существовать. Дамп с --clean: объекты пересоздаются.
# Роли из старого сервера не переносятся (--no-owner): владельцем станет USER из URL.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/pg-client.sh
source "$ROOT/scripts/lib/pg-client.sh"
APP_ROOT="${APP_ROOT:-/var/www/tourister}"

usage() {
  echo "Usage: $0 <tourister-db-*.zip> [DATABASE_URL]" >&2
  exit 1
}

[[ $# -ge 1 ]] || usage
ZIP="$1"
URL="${2:-${DATABASE_URL:-}}"

if [[ -z "$URL" ]]; then
  for f in "$APP_ROOT/.env" "$ROOT/.env"; do
    if [[ -f "$f" ]]; then
      set -a
      # shellcheck disable=SC1090
      source "$f"
      set +a
      URL="${DATABASE_URL:-}"
      break
    fi
  done
fi

if [[ -z "$URL" ]]; then
  echo "Нужен DATABASE_URL (аргумент, env или .env)" >&2
  exit 1
fi
if [[ ! -f "$ZIP" ]]; then
  echo "нет файла $ZIP" >&2
  exit 1
fi
PSQL_BIN="$(pg_client_bin psql || true)"
if [[ -z "$PSQL_BIN" || ! -x "$PSQL_BIN" ]]; then
  echo "psql не найден" >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

python3 - "$ZIP" "$WORKDIR" <<'PY'
import sys, zipfile
from pathlib import Path
zpath, dest = Path(sys.argv[1]), Path(sys.argv[2])
with zipfile.ZipFile(zpath) as z:
    names = set(z.namelist())
    if "tourister.sql" not in names:
        raise SystemExit("в zip нет tourister.sql")
    z.extract("tourister.sql", dest)
    if "MANIFEST.txt" in names:
        z.extract("MANIFEST.txt", dest)
PY

if [[ -f "$WORKDIR/MANIFEST.txt" ]]; then
  echo "--- MANIFEST ---"
  cat "$WORKDIR/MANIFEST.txt"
  echo "----------------"
fi

"$PSQL_BIN" "$URL" -v ON_ERROR_STOP=1 -f "$WORKDIR/tourister.sql"
echo "restore ok from $ZIP"
