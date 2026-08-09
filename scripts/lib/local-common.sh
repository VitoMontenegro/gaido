#!/usr/bin/env bash
# Общие функции для локального запуска Experts Tourister.

local_common_root() {
  if [[ -n "${LOCAL_ROOT:-}" ]]; then
    printf '%s' "$LOCAL_ROOT"
    return
  fi
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$script_dir/../.." && pwd
}

local_load_env() {
  local root="$1"
  if [[ -f "$root/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$root/.env"
    set +a
  elif [[ -f "$root/.env.example" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$root/.env.example"
    set +a
  fi
}

local_ensure_dirs() {
  local root="$1"
  mkdir -p "$root/.local/logs" "$root/.local/pids"
}

local_kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "→ stop port :$port (pid $pids)"
    kill $pids 2>/dev/null || true
    sleep 0.5
    pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    [[ -z "$pids" ]] || kill -9 $pids 2>/dev/null || true
  fi
}

local_stop_pidfile() {
  local pidfile="$1"
  local name="$2"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "→ stop $name (pid $pid)"
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$pidfile"
  fi
}

local_wait_tcp() {
  local host="$1"
  local port="$2"
  local label="$3"
  local tries="${4:-60}"
  echo "→ wait $label ($host:$port)"
  local i
  for ((i = 1; i <= tries; i++)); do
    if (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
      echo "✓ $label ready"
      return 0
    fi
    sleep 1
  done
  echo "✗ timeout waiting for $label ($host:$port)" >&2
  return 1
}

local_print_urls() {
  local backend_port="$1"
  local frontend_port="$2"
  echo ""
  echo "══════════════════════════════════════════════"
  echo " Experts Tourister — local"
  echo "──────────────────────────────────────────────"
  echo " API:       http://localhost:${backend_port}"
  echo " Health:    http://localhost:${backend_port}/healthz"
  echo " Frontend:  http://localhost:${frontend_port}"
  echo " Postgres:  localhost:5433"
  echo " Redis:     localhost:6380"
  echo "──────────────────────────────────────────────"
  echo " Demo: guide1 / guide12345"
  echo "══════════════════════════════════════════════"
  echo ""
}
