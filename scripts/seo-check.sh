#!/usr/bin/env bash
# SEO / redirect checks for Go redirects + Next HTML.
# Usage:
#   ./scripts/seo-check.sh                         # prod apex
#   ./scripts/seo-check.sh http://localhost:3000   # local Next (skip subdomain 301s)
set -euo pipefail

APEX="${1:-https://gaido-ua.com}"
APEX="${APEX%/}"
LOCAL=0
if [[ "$APEX" == http://localhost* || "$APEX" == http://127.0.0.1* ]]; then
  LOCAL=1
fi

fail=0
note() { printf '%s\n' "${1-}"; }
bad() { printf 'FAIL %s\n' "${1-}"; fail=1; }

check_redirect() {
  local from="$1"
  local want="$2"
  local code loc
  code="$(curl -sI -o /dev/null -w '%{http_code}' "$from" || true)"
  loc="$(curl -sI "$from" | awk 'tolower($1)=="location:" { print $2 }' | tr -d '\r' | tail -1)"
  if [[ "$code" == "301" && "$loc" == "$want" ]]; then
    note "OK  301 $from → $loc"
  else
    bad "$from → ${loc:-<пусто>} (код ${code:-?}), ожидался 301 $want"
  fi
}

if [[ "$LOCAL" -eq 0 ]]; then
  note "== 301 со старых хостов =="
  check_redirect "https://svit.gaido-ua.com/guides/countries/spain" "$APEX/svit/guides/countries/spain"
  check_redirect "https://servis.gaido-ua.com/" "$APEX/servis/"
  check_redirect "https://vezu.gaido-ua.com/" "$APEX/vezu/"
  check_redirect "https://svit.gaido-ua.com/sitemap.xml" "$APEX/sitemap.xml"
  check_redirect "https://svit.gaido-ua.com/robots.txt" "$APEX/robots.txt"
else
  note "== local mode: subdomain 301s skipped =="
fi

note
note "== robots.txt =="
robots="$(curl -fsSL "$APEX/robots.txt")"
printf '%s\n' "$robots" | head -25
printf '%s\n' "$robots" | grep -q "Sitemap: " || bad "в robots нет Sitemap:"

note
note "== sitemap: есть подпапки =="
sitemap="$(curl -fsSL "$APEX/sitemap.xml")"
printf '%s\n' "$sitemap" | head -20
if [[ "$LOCAL" -eq 0 ]]; then
  if printf '%s\n' "$sitemap" | grep -Eq 'https?://(svit|servis|vezu)\.gaido-ua\.com'; then
    bad "sitemap всё ещё содержит поддомен"
  fi
fi
printf '%s\n' "$sitemap" | grep -q "/svit/" || bad "в sitemap нет /svit/"
printf '%s\n' "$sitemap" | grep -q "/vezu/" || bad "в sitemap нет /vezu/"
printf '%s\n' "$sitemap" | grep -q "/servis/" || bad "в sitemap нет /servis/"

check_head() {
  local url="$1"
  local html title canonical desc h1
  html="$(curl -fsSL "$url")"
  title="$(printf '%s\n' "$html" | grep -o '<title[^>]*>[^<]*</title>' | head -1 || true)"
  canonical="$(printf '%s\n' "$html" | grep -oE 'rel="canonical" href="[^"]*"' | head -1 || true)"
  desc="$(printf '%s\n' "$html" | grep -oE 'name="description" content="[^"]*"' | head -1 || true)"
  h1="$(printf '%s\n' "$html" | grep -oE '<h1[^>]*>[^<]+</h1>' | head -1 || true)"
  note "-- $url"
  note "   ${title:-<нет title>}"
  note "   ${canonical:-<нет canonical>}"
  note "   ${desc:-<нет description>}"
  note "   ${h1:-<нет h1 в HTML>}"
  [[ -n "$title" ]] || bad "$url без <title>"
  [[ -n "$desc" ]] || bad "$url без meta description"
  [[ -n "$canonical" ]] || bad "$url без canonical"
  if [[ "$LOCAL" -eq 0 ]]; then
    printf '%s\n' "$canonical" | grep -q "$APEX" || bad "$url canonical не на $APEX"
    if printf '%s\n' "$html" | grep -Eq 'https?://(svit|servis|vezu)\.gaido-ua\.com'; then
      bad "$url в HTML остался поддомен"
    fi
  fi
}

note
note "== заголовки, canonical, h1 (без JS) =="
check_head "$APEX/"
check_head "$APEX/svit/"
check_head "$APEX/servis/"
check_head "$APEX/vezu/"

loc="$(printf '%s\n' "$sitemap" | grep -oE "$APEX/svit/excursion/[^<]+" | head -1 || true)"
if [[ -z "$loc" ]]; then
  loc="$(printf '%s\n' "$sitemap" | grep -oE 'https?://[^<]+/svit/excursion/[^<]+' | head -1 || true)"
fi
if [[ -n "$loc" ]]; then
  check_head "$loc"
else
  note "в sitemap нет экскурсий — проверку карточки пропускаю"
fi

note
note "== page-meta API =="
meta_api="$(curl -fsSL "${APEX%/}/api/v1/seo/page-meta?path=/svit&host=gaido-ua.com" || true)"
if printf '%s\n' "$meta_api" | grep -q '"title"'; then
  note "OK  /api/v1/seo/page-meta"
else
  # Local Next proxies /api; if only Next is up without Go, this fails.
  if [[ "$LOCAL" -eq 1 ]]; then
    note "WARN page-meta недоступен (поднят ли Go :8091?)"
  else
    bad "page-meta API не отвечает JSON с title"
  fi
fi

note
if [[ "$fail" -ne 0 ]]; then
  note "Есть ошибки. Поисковикам карту не отправлять, пока проверки не зелёные."
  exit 1
fi
note "Проверки прошли."
