#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$ROOT/.deploy.env" ]; then . "$ROOT/.deploy.env"; fi
HOST="${DEPLOY_HOST:?DEPLOY_HOST is not set}"
TARGET="${1:-}"

case "$TARGET" in
  site)
    ssh "$HOST" 'latest="$(ls -1dt ~/backups/site-* | head -1)" && rsync -a --delete "$latest/" /var/www/strikwerda/ && echo "site restored from $(basename "$latest")"'
    ;;
  api)
    ssh "$HOST" 'latest="$(ls -1dt ~/backups/api-* | head -1)" && rsync -a --delete "$latest/" /opt/strikwerda-api/app/ && echo "api restored from $(basename "$latest")"'
    ssh "$HOST" sudo -n /usr/local/bin/strikwerda-api-up
    ;;
  *)
    echo "usage: scripts/rollback.sh site|api" >&2
    exit 64
    ;;
esac
