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

local_pid_cmdline() {
  local pid="$1"
  ps -p "$pid" -o command= 2>/dev/null | sed 's/^[[:space:]]*//' || true
}

local_is_backend_process() {
  local cmd="$1"
  [[ "$cmd" == *"cmd/api"* ]] \
    || [[ "$cmd" == *"experts-tourister"* ]] \
    || [[ "$cmd" == *"goproject/backend"* ]] \
    || [[ "$cmd" == *"/backend"* && ( "$cmd" == *"go run"* || "$cmd" == *"go-build"* ) ]]
}

local_is_frontend_process() {
  local cmd="$1"
  [[ "$cmd" == *"vite"* ]] && [[ "$cmd" == *"frontend"* || "$cmd" == *"goproject"* || "$cmd" == *"experts-tourister"* ]]
}

# Kill only processes owned by this project. Never kill foreign listeners (e.g. OrbStack on :8081).
local_kill_port() {
  local port="$1"
  local kind="${2:-any}"
  local pids
  pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi

  local pid cmd matched=0
  for pid in $pids; do
    cmd="$(local_pid_cmdline "$pid")"
    [[ -n "$cmd" ]] || continue

    case "$kind" in
      backend)
        local_is_backend_process "$cmd" || continue
        ;;
      frontend)
        local_is_frontend_process "$cmd" || continue
        ;;
      *)
        local_is_backend_process "$cmd" || local_is_frontend_process "$cmd" || continue
        ;;
    esac

    matched=1
    echo "→ stop :$port (pid $pid)"
    kill "$pid" 2>/dev/null || true
  done

  if [[ "$matched" == "1" ]]; then
    sleep 0.5
    for pid in $pids; do
      cmd="$(local_pid_cmdline "$pid")"
      [[ -n "$cmd" ]] || continue
      case "$kind" in
        backend) local_is_backend_process "$cmd" || continue ;;
        frontend) local_is_frontend_process "$cmd" || continue ;;
        *) local_is_backend_process "$cmd" || local_is_frontend_process "$cmd" || continue ;;
      esac
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
    done
    return 0
  fi

  local foreign
  foreign="$(local_pid_cmdline "${pids%% *}")"
  echo "→ skip :$port (occupied by another app: ${foreign:0:72})" >&2
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
