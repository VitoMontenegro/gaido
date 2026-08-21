#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/tourister}"
REPO="${REPO:-$APP_ROOT/repo}"
ENV_FILE="${ENV_FILE:-$APP_ROOT/.env}"
LOG="${LOG:-$APP_ROOT/logs/deploy.log}"
STATUS_FILE="${DEPLOY_STATUS_FILE:-$APP_ROOT/logs/deploy.status.json}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GIT_REPO="${GIT_REPO:-https://github.com/VitoMontenegro/gaido.git}"
APP_SLUG="${DEPLOY_APP_SLUG:-web-prod-2026}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

# Manual runs as root leave root-owned node_modules/www and break npm ci for deploy user.
if [ "$(id -un)" = "root" ]; then
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT"
  exec sudo -u "$DEPLOY_USER" -E bash "$0" "$@"
fi

write_status() {
  local status="$1"
  local exit_code="${2:-0}"
  local finished="${3:-}"
  local started_at="${DEPLOY_STARTED_AT:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"
  local finished_at=""
  if [ -n "$finished" ]; then
    finished_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  fi
  mkdir -p "$(dirname "$STATUS_FILE")"
  cat >"$STATUS_FILE" <<EOF
{"status":"$status","app":"$APP_SLUG","started_at":"$started_at","finished_at":$( [ -n "$finished_at" ] && printf '"%s"' "$finished_at" || echo null ),"exit_code":$exit_code}
EOF
}

on_error() {
  local code=$?
  write_status "failed" "$code" "1"
  echo "=== DEPLOY FAILED $(date -Is) exit=$code ==="
}
trap on_error ERR

mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
DEPLOY_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
write_status "running" -1
echo "=== DEPLOY START $(date -Is) branch=$GIT_BRANCH user=$(id -un) ==="

git config --global --add safe.directory "$REPO" 2>/dev/null || true

cd "$REPO"
if [ -d "$REPO/.git" ]; then
  if [ ! -w "$REPO/.git" ]; then
    echo "ERROR: $REPO/.git not writable by $(id -un)."
    echo "Fix as root: chown -R deploy:deploy $REPO"
    exit 255
  fi
  echo "→ git fetch origin/$GIT_BRANCH"
  git fetch origin "$GIT_BRANCH"
  git reset --hard "origin/$GIT_BRANCH"
elif [ -n "$GIT_REPO" ]; then
  echo "→ git init + fetch $GIT_REPO"
  git init
  git remote add origin "$GIT_REPO"
  git fetch origin "$GIT_BRANCH"
  git reset --hard "origin/$GIT_BRANCH"
else
  echo "→ skip git (no .git and GIT_REPO empty)"
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

STATIC_ROOT="${STATIC_ROOT:-$APP_ROOT/www}"

# Manual copies / Mac rsyncs can leave www owned by another uid — deploy user cannot rsync --delete.
if [ ! -O "$STATIC_ROOT" ] 2>/dev/null || find "$STATIC_ROOT" -mindepth 1 -maxdepth 2 ! -writable 2>/dev/null | grep -q .; then
  echo "→ fix ownership $STATIC_ROOT"
  sudo chown -R "$(id -un):$(id -gn)" "$STATIC_ROOT"
fi
mkdir -p "$STATIC_ROOT"

echo "→ frontend build (4 apps)"
cd "$REPO"
npm ci
PROD_DOMAIN="${PROD_DOMAIN:-gaido.top}"
declare -A APP_ORIGINS=(
  [portal]="https://${PROD_DOMAIN}"
  [svit]="https://svit.${PROD_DOMAIN}"
  [servis]="https://servis.${PROD_DOMAIN}"
  [vezu]="https://vezu.${PROD_DOMAIN}"
)
for app in portal svit servis vezu; do
  echo "→ build @gaido/$app (${APP_ORIGINS[$app]})"
  VITE_PUBLIC_SITE_URL="${APP_ORIGINS[$app]}" npm run build -w "@gaido/$app"
  echo "→ publish $app to $STATIC_ROOT/$app"
  mkdir -p "$STATIC_ROOT/$app"
  rsync -a --delete \
    --exclude '._*' \
    --exclude '.DS_Store' \
    "$REPO/apps/$app/dist/" "$STATIC_ROOT/$app/"
done

echo "→ backend build"
cd "$REPO/backend"
GO_BIN="${GO_BIN:-go}"
if ! command -v "$GO_BIN" >/dev/null 2>&1 && [ -x /usr/local/go/bin/go ]; then
  GO_BIN=/usr/local/go/bin/go
fi
mkdir -p "$APP_ROOT/bin"
"$GO_BIN" build -ldflags="-s -w" -o "$APP_ROOT/bin/tourister-api" ./cmd/api
"$GO_BIN" build -ldflags="-s -w" -o "$APP_ROOT/bin/tourister-migrate" ./cmd/migrate

echo "→ migrations"
"$APP_ROOT/bin/tourister-migrate" -cmd up

# Mark success BEFORE restart: systemctl kills the API process that started us.
write_status "success" 0 "1"
echo "→ restart api (deferred, so deploy parent is not killed mid-run)"
if command -v systemd-run >/dev/null 2>&1; then
  sudo systemd-run --quiet --collect --on-active=2s /bin/systemctl restart tourister-api
else
  # Fallback: background restart after this script exits the wait briefly.
  (sleep 2; sudo systemctl restart tourister-api) >/dev/null 2>&1 &
  disown || true
fi

echo "=== DEPLOY OK $(date -Is) ==="
trap - ERR
exit 0
