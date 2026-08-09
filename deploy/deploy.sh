#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/tourister}"
REPO="${REPO:-$APP_ROOT/repo}"
ENV_FILE="${ENV_FILE:-$APP_ROOT/.env}"
LOG="${LOG:-$APP_ROOT/logs/deploy.log}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GIT_REPO="${GIT_REPO:-https://github.com/VitoMontenegro/gaido.git}"

mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "=== DEPLOY START $(date -Is) branch=$GIT_BRANCH ==="

cd "$REPO"
if [ -d "$REPO/.git" ]; then
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

echo "→ frontend build"
cd "$REPO/frontend"
npm ci
npm run build

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

echo "→ restart api"
sudo systemctl restart tourister-api

sleep 2
PORT="${HTTP_ADDR#:}"
PORT="${PORT:-8081}"
curl -sf "http://127.0.0.1:${PORT}/readyz" | head -c 200
echo
echo "=== DEPLOY OK $(date -Is) ==="
