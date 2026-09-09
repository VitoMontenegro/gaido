#!/usr/bin/env bash
# Ежедневный переносимый бэкап PostgreSQL в zip.
# Восстановление на любом сервере: ./scripts/restore-db.sh /path/to/tourister-db-*.zip
#
#   backup-db.sh              # снять бэкап сейчас
#   backup-db.sh --install    # поставить systemd timer (root)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ -f "$SCRIPT_DIR/lib/pg-client.sh" ]]; then
  # shellcheck source=lib/pg-client.sh
  source "$SCRIPT_DIR/lib/pg-client.sh"
elif [[ -f "$ROOT/scripts/lib/pg-client.sh" ]]; then
  # shellcheck source=lib/pg-client.sh
  source "$ROOT/scripts/lib/pg-client.sh"
else
  pg_client_bin() { command -v "$1"; }
fi
APP_ROOT="${APP_ROOT:-/var/www/tourister}"
BACKUP_DIR="${BACKUP_DIR:-$APP_ROOT/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
ENV_FILE="${BACKUP_ENV_FILE:-$APP_ROOT/.env}"

load_env() {
  local f
  for f in "$ENV_FILE" "$ROOT/.env"; do
    if [[ -f "$f" ]]; then
      set -a
      # shellcheck disable=SC1090
      source "$f"
      set +a
      return 0
    fi
  done
  return 1
}

install_timer() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "install: нужен root" >&2
    exit 1
  fi
  local unit_dir="$ROOT/deploy/systemd"
  local bin_dir="$APP_ROOT/bin"
  mkdir -p "$bin_dir" "$APP_ROOT/logs" "$APP_ROOT/backups"
  install -m 755 "$SCRIPT_DIR/backup-db.sh" "$bin_dir/backup-db.sh"
  if [[ -f "$SCRIPT_DIR/restore-db.sh" ]]; then
    install -m 755 "$SCRIPT_DIR/restore-db.sh" "$bin_dir/restore-db.sh"
  fi
  mkdir -p "$bin_dir/lib"
  if [[ -f "$SCRIPT_DIR/lib/pg-client.sh" ]]; then
    install -m 644 "$SCRIPT_DIR/lib/pg-client.sh" "$bin_dir/lib/pg-client.sh"
  elif [[ -f "$ROOT/scripts/lib/pg-client.sh" ]]; then
    install -m 644 "$ROOT/scripts/lib/pg-client.sh" "$bin_dir/lib/pg-client.sh"
  fi
  chown -R deploy:deploy "$bin_dir/backup-db.sh" "$APP_ROOT/backups"
  [[ -f "$bin_dir/restore-db.sh" ]] && chown deploy:deploy "$bin_dir/restore-db.sh"
  [[ -d "$bin_dir/lib" ]] && chown -R deploy:deploy "$bin_dir/lib"
  touch "$APP_ROOT/logs/backup.log"
  chown deploy:deploy "$APP_ROOT/logs/backup.log"
  install -m 644 "$unit_dir/tourister-backup.service" /etc/systemd/system/tourister-backup.service
  install -m 644 "$unit_dir/tourister-backup.timer" /etc/systemd/system/tourister-backup.timer
  systemctl daemon-reload
  systemctl enable --now tourister-backup.timer
  systemctl start tourister-backup.service
  systemctl --no-pager --full status tourister-backup.timer || true
}

if [[ "${1:-}" == "--install" ]]; then
  install_timer
  exit 0
fi

umask 077
load_env || true

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL не задан (нет $ENV_FILE и $ROOT/.env)" >&2
  exit 1
fi

PG_DUMP_BIN="$(pg_client_bin pg_dump || true)"
if [[ -z "$PG_DUMP_BIN" || ! -x "$PG_DUMP_BIN" ]]; then
  echo "pg_dump не найден (нужен клиент той же мажорной версии, что и сервер)" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%F-%H%M%S)Z"
WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

DUMP="$WORKDIR/tourister.sql"
MANIFEST="$WORKDIR/MANIFEST.txt"
RESTORE="$WORKDIR/restore.sh"

"$PG_DUMP_BIN" --dbname="$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --encoding=UTF8 \
  --file="$DUMP"

if [[ ! -s "$DUMP" ]]; then
  echo "pg_dump вернул пустой файл" >&2
  exit 1
fi

{
  echo "Gaido / tourister PostgreSQL backup"
  echo "created_utc=$STAMP"
  echo "host=$(hostname -f 2>/dev/null || hostname)"
  echo "pg_dump=$($PG_DUMP_BIN --version)"
  echo "format=plain SQL, --no-owner --no-acl --clean --if-exists"
  echo
  echo "Restore on any server with PostgreSQL:"
  echo "  1. createdb + createuser (роль tourister или любая своя)"
  echo "  2. unzip this archive"
  echo "  3. DATABASE_URL=postgres://USER:PASS@HOST:5432/DBNAME ./restore.sh"
  echo "     or: ./scripts/restore-db.sh /path/to/this.zip"
  echo
  echo "Media files are NOT in this zip: $APP_ROOT/storage"
} >"$MANIFEST"

cat >"$RESTORE" <<'RESTORE_SH'
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL="${1:-${DATABASE_URL:-}}"
if [[ -z "$URL" ]]; then
  echo "Usage: DATABASE_URL=postgres://user:pass@host:5432/dbname $0" >&2
  echo "   or: $0 postgres://user:pass@host:5432/dbname" >&2
  exit 1
fi
PSQL="$(ls -d /usr/pgsql-*/bin/psql 2>/dev/null | sort -V | tail -1 || true)"
PSQL="${PSQL:-$(command -v psql || true)}"
if [[ -z "$PSQL" || ! -x "$PSQL" ]]; then
  echo "psql не найден" >&2
  exit 1
fi
"$PSQL" "$URL" -v ON_ERROR_STOP=1 -f "$DIR/tourister.sql"
echo "restore ok"
RESTORE_SH
chmod 700 "$RESTORE"

ZIP_NAME="tourister-db-$STAMP.zip"
ZIP_PATH="$BACKUP_DIR/$ZIP_NAME"

python3 - "$WORKDIR" "$ZIP_PATH" <<'PY'
import sys, zipfile
from pathlib import Path
src, dest = Path(sys.argv[1]), Path(sys.argv[2])
with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for name in ("tourister.sql", "MANIFEST.txt", "restore.sh"):
        z.write(src / name, name)
PY

chmod 600 "$ZIP_PATH"
ln -sfn "$ZIP_NAME" "$BACKUP_DIR/tourister-db-latest.zip"

# старые .sql.gz от предыдущей версии скрипта тоже чистим
find "$BACKUP_DIR" \( -name 'tourister-db-*.zip' -o -name 'tourister-*.sql.gz' \) \
  ! -name 'tourister-db-latest.zip' -mtime "+$KEEP_DAYS" -delete

BYTES="$(wc -c <"$ZIP_PATH" | tr -d ' ')"
echo "backup ok $ZIP_PATH ${BYTES}B keep=${KEEP_DAYS}d"
