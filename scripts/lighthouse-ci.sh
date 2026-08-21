#!/usr/bin/env bash
set -euo pipefail

# Lightweight SEO/performance smoke check for svit build (no external server required).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/apps/svit/dist/index.html"

if [[ ! -f "$DIST" ]]; then
  echo "lighthouse-ci: skip — $DIST not found (run npm run build first)"
  exit 0
fi

html="$(cat "$DIST")"

check_contains() {
  local label="$1"
  local needle="$2"
  if ! grep -q "$needle" <<<"$html"; then
    echo "lighthouse-ci: FAIL — missing $label ($needle)"
    exit 1
  fi
}

check_contains "uk-UA lang" 'lang="uk-UA"'
check_contains "viewport meta" 'name="viewport"'

echo "lighthouse-ci: OK — static SEO checks passed for svit index.html"
