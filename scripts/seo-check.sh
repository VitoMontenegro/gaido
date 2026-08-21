#!/usr/bin/env bash
# Post-deploy SEO verification checklist (manual / cron).
# Usage: ./scripts/seo-check.sh [base_url]
set -euo pipefail

BASE="${1:-https://svit.gaido.top}"

echo "== robots.txt =="
curl -fsSL "$BASE/robots.txt" | head -20

echo
echo "== sitemap sample =="
curl -fsSL "$BASE/sitemap.xml" | head -40

echo
echo "== excursion page meta (first 30 lines of HTML) =="
SLUG="$(curl -fsSL "$BASE/sitemap.xml" | grep -o '/excursion/[^<]*' | head -1 | cut -d/ -f3 || true)"
if [[ -n "$SLUG" ]]; then
  curl -fsSL "$BASE/excursion/$SLUG" | head -30
else
  echo "no excursion in sitemap"
fi

echo
echo "Done. Also verify in Google Search Console and Rich Results Test:"
echo "https://search.google.com/test/rich-results?url=${BASE}/search"
