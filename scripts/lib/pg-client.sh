#!/usr/bin/env bash
# Клиенты PostgreSQL: на Alma/PGDG бинарь из /usr/pgsql-N/bin новее системного /usr/bin.

pg_client_bin() {
  local name="$1"
  local override=""
  case "$name" in
    pg_dump) override="${PG_DUMP:-}" ;;
    psql) override="${PSQL:-}" ;;
  esac
  if [[ -n "$override" && -x "$override" ]]; then
    printf '%s' "$override"
    return 0
  fi
  if [[ -n "${PG_BIN:-}" && -x "$PG_BIN/$name" ]]; then
    printf '%s' "$PG_BIN/$name"
    return 0
  fi
  local newest
  newest="$(ls -d /usr/pgsql-*/bin 2>/dev/null | sort -V | tail -1 || true)"
  if [[ -n "$newest" && -x "$newest/$name" ]]; then
    printf '%s' "$newest/$name"
    return 0
  fi
  command -v "$name"
}
