#!/usr/bin/env bash
# SSH на production gaido.top (алиас: ssh gaido).
#   ./scripts/ssh-prod.sh
#   ./scripts/ssh-prod.sh 'hostname; uptime'
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROD_ENV_FILE:-$ROOT/.local/prod.env}"
ASKPASS="$ROOT/scripts/ssh-askpass.sh"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Нет $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

HOST="${SSH_HOST:-gaido}"
USER="${SSH_USER:-root}"
IP="${SSH_HOST_IP:-77.239.127.163}"
TARGET="${USER}@${IP}"

if ssh -o BatchMode=yes -o ConnectTimeout=8 "$HOST" true 2>/dev/null; then
  if [[ $# -gt 0 ]]; then
    exec ssh "$HOST" "$@"
  fi
  exec ssh -t "$HOST"
fi

if [[ -z "${SSH_PASS:-}" ]]; then
  echo "Ключ не принят сервером и SSH_PASS пуст в $ENV_FILE" >&2
  exit 1
fi

chmod 700 "$ASKPASS"
export SSH_PASS
export SSH_ASKPASS="$ASKPASS"
export SSH_ASKPASS_REQUIRE=force
export DISPLAY=:0

SSH_OPTS=(
  -o StrictHostKeyChecking=accept-new
  -o PreferredAuthentications=password
  -o PubkeyAuthentication=no
)

if [[ $# -gt 0 ]]; then
  exec ssh "${SSH_OPTS[@]}" "$TARGET" "$@"
fi

exec ssh -t "${SSH_OPTS[@]}" "$TARGET"
