#!/usr/bin/env bash
# Проверка после переезда поддоменов на подпапки основного домена.
# Usage: ./scripts/seo-check.sh [apex_url]
set -euo pipefail

APEX="${1:-https://gaido-ua.com}"
APEX="${APEX%/}"

fail=0
note() { printf '%s\n' "$1"; }
bad() { printf 'FAIL %s\n' "$1"; fail=1; }

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

note "== 301 со старых хостов =="
check_redirect "https://svit.gaido-ua.com/guides/countries/spain" "$APEX/svit/guides/countries/spain"
check_redirect "https://servis.gaido-ua.com/" "$APEX/servis/"
check_redirect "https://vezu.gaido-ua.com/" "$APEX/vezu/"
check_redirect "https://svit.gaido-ua.com/sitemap.xml" "$APEX/sitemap.xml"
check_redirect "https://svit.gaido-ua.com/robots.txt" "$APEX/robots.txt"

note
note "== robots.txt =="
robots="$(curl -fsSL "$APEX/robots.txt")"
printf '%s\n' "$robots" | head -25
printf '%s\n' "$robots" | grep -q "Sitemap: $APEX/sitemap.xml" || bad "в robots нет Sitemap: $APEX/sitemap.xml"

note
note "== sitemap: нет старых хостов, есть подпапки =="
sitemap="$(curl -fsSL "$APEX/sitemap.xml")"
printf '%s\n' "$sitemap" | head -20
if printf '%s\n' "$sitemap" | grep -Eq 'https?://(svit|servis|vezu)\.gaido-ua\.com'; then
  bad "sitemap всё ещё содержит поддомен"
fi
printf '%s\n' "$sitemap" | grep -q "$APEX/svit/" || bad "в sitemap нет $APEX/svit/"
printf '%s\n' "$sitemap" | grep -q "$APEX/vezu/" || bad "в sitemap нет $APEX/vezu/"
printf '%s\n' "$sitemap" | grep -q "$APEX/servis/" || bad "в sitemap нет $APEX/servis/"

check_head() {
  local url="$1"
  local html title canonical
  html="$(curl -fsSL "$url")"
  title="$(printf '%s\n' "$html" | grep -o '<title[^>]*>[^<]*</title>' | head -1 || true)"
  canonical="$(printf '%s\n' "$html" | grep -o 'rel="canonical" href="[^"]*"' | head -1 || true)"
  note "-- $url"
  note "   ${title:-<нет title>}"
  note "   ${canonical:-<нет canonical>}"
  [[ -n "$title" && "$title" != *'><title'* ]] || bad "$url без <title>"
  printf '%s\n' "$canonical" | grep -q "$APEX" || bad "$url canonical не на $APEX"
  if printf '%s\n' "$html" | grep -Eq 'https?://(svit|servis|vezu)\.gaido-ua\.com'; then
    bad "$url в HTML остался поддомен"
  fi
}

note
note "== заголовки и canonical =="
check_head "$APEX/"
check_head "$APEX/svit/"
check_head "$APEX/servis/"
check_head "$APEX/vezu/"

loc="$(printf '%s\n' "$sitemap" | grep -o "$APEX/svit/excursion/[^<]*" | head -1 || true)"
if [[ -n "$loc" ]]; then
  check_head "$loc"
else
  note "в sitemap нет экскурсий — проверку карточки пропускаю"
fi

note
if [[ "$fail" -ne 0 ]]; then
  note "Есть ошибки. Поисковикам карту не отправлять, пока проверки не зелёные."
  exit 1
fi
note "Проверки прошли. Дальше — кабинеты поисковиков, см. deploy/domain-move.md"
