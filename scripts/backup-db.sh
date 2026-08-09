#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/www/tourister/backups}"
mkdir -p "$BACKUP_DIR"
pg_dump -U tourister tourister | gzip > "$BACKUP_DIR/tourister-$(date +%F-%H%M).sql.gz"
find "$BACKUP_DIR" -name '*.sql.gz' -mtime +14 -delete
