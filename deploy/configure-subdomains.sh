#!/usr/bin/env bash
# Поддомены gaido.top: nginx + certbot + CORS.
#   ./deploy/configure-subdomains.sh
#   SUBDOMAINS="vezu servis" ./deploy/configure-subdomains.sh
set -euo pipefail

DOMAIN="${DOMAIN:-gaido.top}"
SUBDOMAINS="${SUBDOMAINS:-svit vezu servis}"
APP_ROOT="${APP_ROOT:-/var/www/tourister}"
ENV_FILE="${ENV_FILE:-$APP_ROOT/.env}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/conf.d/gaido.conf}"
EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN}}"

proxy_block() {
  cat <<'NGX'
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
NGX
}

append_http_server() {
  local sub="$1"
  local fqdn="${sub}.${DOMAIN}"
  if grep -q "server_name ${fqdn};" "$NGINX_CONF" 2>/dev/null; then
    echo "nginx: ${fqdn} already present"
    return 0
  fi
  cat >>"$NGINX_CONF" <<NGX

server {
    listen 80;
    server_name ${fqdn};
    client_max_body_size 12m;
$(proxy_block)
}
NGX
}

ensure_cert() {
  local sub="$1"
  local fqdn="${sub}.${DOMAIN}"
  if certbot certificates 2>/dev/null | grep -q "Certificate Name: ${fqdn}"; then
    echo "cert: ${fqdn} exists"
    certbot install --cert-name "$fqdn" --nginx --redirect --non-interactive 2>/dev/null || true
    return 0
  fi
  certbot certonly --nginx -d "$fqdn" --non-interactive --agree-tos -m "$EMAIL"
  certbot install --cert-name "$fqdn" --nginx --redirect --non-interactive
}

update_cors() {
  local origins=(
    "https://${DOMAIN}"
    "https://www.${DOMAIN}"
  )
  for sub in $SUBDOMAINS; do
    origins+=("https://${sub}.${DOMAIN}")
  done

  local joined=""
  for origin in "${origins[@]}"; do
    if [[ -z "$joined" ]]; then
      joined="$origin"
    elif [[ "$joined" != *"$origin"* ]]; then
      joined="${joined},${origin}"
    fi
  done

  if grep -q '^CORS_ORIGINS=' "$ENV_FILE"; then
    sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${joined}|" "$ENV_FILE"
  else
    echo "CORS_ORIGINS=${joined}" >>"$ENV_FILE"
  fi
}

echo "== configure subdomains for ${DOMAIN}: ${SUBDOMAINS} =="

for sub in $SUBDOMAINS; do
  append_http_server "$sub"
done

nginx -t
systemctl reload nginx

for sub in $SUBDOMAINS; do
  ensure_cert "$sub"
done

if [[ -f "$ENV_FILE" ]]; then
  update_cors
fi

nginx -t
systemctl reload nginx
systemctl restart tourister-api
sleep 2
curl -sf "http://127.0.0.1:8081/readyz" | head -c 120 || true
echo
echo "== done =="
