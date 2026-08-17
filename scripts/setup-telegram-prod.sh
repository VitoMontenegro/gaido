#!/usr/bin/env bash
# Configure Telegram bot on production (gaido.top).
# Usage:
#   TELEGRAM_BOT_TOKEN=... TELEGRAM_GROUP_CHAT_ID=-100... ./scripts/setup-telegram-prod.sh
# Or put vars in .local/telegram.env (gitignored).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${TELEGRAM_ENV_FILE:-$ROOT/.local/telegram.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN}"

TELEGRAM_BOT_USERNAME="${TELEGRAM_BOT_USERNAME:-gaido_ua_bot}"
TELEGRAM_WEBHOOK_SECRET="${TELEGRAM_WEBHOOK_SECRET:-$(openssl rand -hex 32)}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://svit.gaido.top}"
FOOTER_ONLY=false
if [[ "${1:-}" == "--footer-only" ]] || [[ -z "${TELEGRAM_GROUP_CHAT_ID:-}" ]]; then
  FOOTER_ONLY=true
  TELEGRAM_GROUP_CHAT_ID="${TELEGRAM_GROUP_CHAT_ID:-0}"
fi

if [[ "$FOOTER_ONLY" == "false" ]]; then
  : "${TELEGRAM_GROUP_CHAT_ID:?Set TELEGRAM_GROUP_CHAT_ID (supergroup with Topics enabled)}"
fi

REMOTE_ENV_BLOCK=$(cat <<EOF
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}
TELEGRAM_GROUP_CHAT_ID=${TELEGRAM_GROUP_CHAT_ID}
TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}
EOF
)

echo "→ Updating /var/www/tourister/.env on prod"
"$ROOT/scripts/ssh-prod.sh" "bash -s" <<REMOTE
set -euo pipefail
ENV=/var/www/tourister/.env
grep -v '^TELEGRAM_' "\$ENV" > "\$ENV.tmp" && mv "\$ENV.tmp" "\$ENV"
cat >> "\$ENV" <<'ENVEOF'
${REMOTE_ENV_BLOCK}
ENVEOF
REMOTE

echo "→ Running migrations"
"$ROOT/scripts/ssh-prod.sh" 'bash -s' <<'REMOTE'
set -euo pipefail
set -a
source /var/www/tourister/.env
set +a
cd /var/www/tourister/repo/backend
if [[ -x /var/www/tourister/bin/tourister-migrate ]]; then
  /var/www/tourister/bin/tourister-migrate -cmd up
elif [[ -x /usr/local/go/bin/go ]]; then
  /usr/local/go/bin/go run ./cmd/migrate -cmd up
else
  echo "WARN: migrate binary not found, skip"
fi
REMOTE

if [[ "$FOOTER_ONLY" == "true" ]]; then
  echo "→ Skipping webhook (TELEGRAM_GROUP_CHAT_ID not set — footer link only)"
  echo "  After adding bot to gaido_UA: TELEGRAM_GROUP_CHAT_ID=... ./scripts/setup-telegram-prod.sh"
else
  echo "→ Registering Telegram webhook"
  "$ROOT/scripts/ssh-prod.sh" "bash -s" <<REMOTE
set -euo pipefail
set -a
source /var/www/tourister/.env
set +a
cd /var/www/tourister/repo/backend
GO=/usr/local/go/bin/go
if [[ ! -x "\$GO" ]]; then GO=go; fi
"\$GO" run ./cmd/telegram-webhook -action=set
"\$GO" run ./cmd/telegram-webhook -action=info
REMOTE
fi

echo "→ Restarting API"
"$ROOT/scripts/ssh-prod.sh" 'systemctl restart tourister-api && sleep 2 && systemctl is-active tourister-api'

echo "→ Checking site API"
curl -sS "${PUBLIC_BASE_URL}/api/v1/site" | python3 -c "import sys,json; d=json.load(sys.stdin); print('telegram_bot_url:', d.get('telegram_bot_url',''))"

echo "Done. Webhook secret (save if needed): ${TELEGRAM_WEBHOOK_SECRET}"
