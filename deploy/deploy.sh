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
WEB_ROOT="${WEB_ROOT:-$APP_ROOT/web}"

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

PROD_DOMAIN="${PROD_DOMAIN:-gaido-ua.com}"
APEX_ORIGIN="https://${PROD_DOMAIN}"
BUILD_ID="$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || date +%s)"
echo "→ build id: $BUILD_ID"

echo "→ frontend build (Next.js standalone)"
cd "$REPO"
npm ci
export NEXT_PUBLIC_SITE_URL="$APEX_ORIGIN"
export NEXT_PUBLIC_API_URL=""
export API_INTERNAL_URL="http://127.0.0.1:8081"
export NEXT_PUBLIC_BUILD_ID="$BUILD_ID"
npm run build -w @gaido/web

echo "→ publish Next standalone to $WEB_ROOT"
mkdir -p "$WEB_ROOT"
rm -rf "${WEB_ROOT:?}/"*
# Next standalone layout: apps/web/.next/standalone (+ static + public)
STANDALONE="$REPO/apps/web/.next/standalone"
STATIC_SRC="$REPO/apps/web/.next/static"
PUBLIC_SRC="$REPO/apps/web/public"
if [ ! -d "$STANDALONE" ]; then
  echo "ERROR: missing $STANDALONE — next build failed?"
  exit 1
fi
cp -a "$STANDALONE"/. "$WEB_ROOT/"
mkdir -p "$WEB_ROOT/apps/web/.next"
cp -a "$STATIC_SRC" "$WEB_ROOT/apps/web/.next/static"
# Copy public assets next to server (resolve symlinks)
mkdir -p "$WEB_ROOT/apps/web/public"
rsync -aL --delete "$PUBLIC_SRC"/ "$WEB_ROOT/apps/web/public/" 2>/dev/null \
  || cp -aL "$PUBLIC_SRC"/. "$WEB_ROOT/apps/web/public/"
# Prefer running from WEB_ROOT with server.js at root or apps/web/server.js
if [ -f "$WEB_ROOT/apps/web/server.js" ]; then
  # monorepo standalone nests the app
  :
elif [ -f "$WEB_ROOT/server.js" ]; then
  :
else
  echo "ERROR: server.js not found under $WEB_ROOT"
  find "$WEB_ROOT" -name 'server.js' | head
  exit 1
fi

echo "→ backend build"
cd "$REPO/backend"
GO_BIN="${GO_BIN:-go}"
if ! command -v "$GO_BIN" >/dev/null 2>&1 && [ -x /usr/local/go/bin/go ]; then
  GO_BIN=/usr/local/go/bin/go
fi
mkdir -p "$APP_ROOT/bin"
"$GO_BIN" build -ldflags="-s -w" -o "$APP_ROOT/bin/tourister-api" ./cmd/api
"$GO_BIN" build -ldflags="-s -w" -o "$APP_ROOT/bin/tourister-migrate" ./cmd/migrate
"$GO_BIN" build -ldflags="-s -w" -o "$APP_ROOT/bin/tourister-news" ./cmd/news

echo "→ migrations"
"$APP_ROOT/bin/tourister-migrate" -cmd up

# Mark success BEFORE restart: systemctl kills the API process that started us.
write_status "success" 0 "1"
echo "→ HTML отдаёт tourister-web :3000. Если nginx ещё проксирует сайт на API, переключите его сразу после DEPLOY OK — новый API страницы не отдаёт."
echo "→ restart api + web (deferred)"
if command -v systemd-run >/dev/null 2>&1; then
  sudo systemd-run --quiet --collect --on-active=2s /bin/systemctl restart tourister-api
  sudo systemd-run --quiet --collect --on-active=3s /bin/systemctl restart tourister-web
  if systemctl list-unit-files tourister-news.service >/dev/null 2>&1; then
    sudo systemd-run --quiet --collect --on-active=4s /bin/systemctl restart tourister-news
  fi
else
  (sleep 2; sudo systemctl restart tourister-api; sudo systemctl restart tourister-web) >/dev/null 2>&1 &
  disown || true
fi

echo "=== DEPLOY OK $(date -Is) ==="
trap - ERR
exit 0
