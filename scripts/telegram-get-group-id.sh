#!/usr/bin/env bash
# Print supergroup chat IDs from recent bot updates.
# 1. Add @gaido_ua_bot to gaido_UA (Topics enabled)
# 2. Send any message in the group
# 3. TELEGRAM_BOT_TOKEN=... ./scripts/telegram-get-group-id.sh
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

curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates" |
  python3 -c "
import sys, json
d = json.load(sys.stdin)
if not d.get('ok'):
    print('API error:', d.get('description', d), file=sys.stderr)
    raise SystemExit(1)
found = False
for u in d.get('result', []):
    for key in ('message', 'my_chat_member', 'chat_member'):
        m = u.get(key)
        if not m:
            continue
        c = m.get('chat', m)
        if c.get('type') in ('group', 'supergroup'):
            found = True
            print(c['id'], c.get('title', c.get('username', '')))
if not found:
    print('No group updates. Add the bot to gaido_UA and send a message, then retry.', file=sys.stderr)
    raise SystemExit(1)
"
