#!/usr/bin/env bash
# Первичная настройка AlmaLinux 8 для Experts Tourister / gaido.top
set -euo pipefail

DOMAIN="${DOMAIN:-gaido.top}"
APP_ROOT="${APP_ROOT:-/var/www/tourister}"
DB_PASS="${DB_PASS:?DB_PASS required}"
JWT_ACCESS="${JWT_ACCESS:?JWT_ACCESS required}"
JWT_REFRESH="${JWT_REFRESH:?JWT_REFRESH required}"

echo "== bootstrap AlmaLinux 8 domain=$DOMAIN =="

dnf -y update
dnf -y install epel-release
dnf -y install tar git curl firewalld nginx redis postgresql-server postgresql \
  policycoreutils-python-utils

# swap 2G
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# PostgreSQL
if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
  postgresql-setup --initdb
fi
systemctl enable --now postgresql
systemctl enable --now redis

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='tourister'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER tourister WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='tourister'" | grep -q 1 || \
  sudo -u postgres createdb -O tourister tourister

# Redis localhost
sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis.conf
sed -i 's/^supervised no/supervised systemd/' /etc/redis.conf
systemctl restart redis

# Go
if [ ! -x /usr/local/go/bin/go ]; then
  curl -fsSL -o /tmp/go.tgz https://go.dev/dl/go1.25.7.linux-amd64.tar.gz
  rm -rf /usr/local/go
  tar -C /usr/local -xzf /tmp/go.tgz
fi
grep -q '/usr/local/go/bin' /etc/profile.d/go.sh 2>/dev/null || \
  echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh

# Node 22
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
  dnf -y install nodejs
fi

# deploy user
id deploy &>/dev/null || useradd -m deploy
usermod -aG wheel deploy
echo 'deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart tourister-api, /bin/systemctl status tourister-api' \
  > /etc/sudoers.d/tourister-deploy
chmod 440 /etc/sudoers.d/tourister-deploy
visudo -cf /etc/sudoers.d/tourister-deploy

mkdir -p "$APP_ROOT"/{repo,bin,storage,logs,backups}
chown -R deploy:deploy "$APP_ROOT"

# firewalld
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# .env
ENV_FILE="$APP_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat >"$ENV_FILE" <<ENV
APP_ENV=production
HTTP_ADDR=:8081
CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}

DATABASE_URL=postgres://tourister:${DB_PASS}@127.0.0.1:5432/tourister?sslmode=disable
REDIS_URL=redis://127.0.0.1:6379/0
REDIS_SESSION_URL=redis://127.0.0.1:6379/1
REDIS_SIGNAL_URL=redis://127.0.0.1:6379/2

JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=720h

PAYMENT_STUB_ENABLED=false
MEDIA_STORAGE_PATH=${APP_ROOT}/storage
MEDIA_MAX_UPLOAD_MB=10

SEED_DEMO_DATA=true
GIT_BRANCH=main
DEPLOY_ENABLED=true
DEPLOY_SCRIPT=${APP_ROOT}/repo/deploy/deploy.sh
DEPLOY_LOG=${APP_ROOT}/logs/deploy.log
DEPLOY_APP_SLUG=web-prod-2026
ENV
  chmod 600 "$ENV_FILE"
  chown deploy:deploy "$ENV_FILE"
fi

# nginx (HTTP first — certbot after DNS)
cat >/etc/nginx/conf.d/gaido.conf <<NGX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGX
nginx -t
systemctl enable --now nginx

# systemd
if [ -f "$APP_ROOT/repo/deploy/systemd/tourister-api.service" ]; then
  cp "$APP_ROOT/repo/deploy/systemd/tourister-api.service" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable tourister-api
fi

echo "== bootstrap done =="
