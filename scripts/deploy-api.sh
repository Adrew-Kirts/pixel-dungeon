#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ -f "$ROOT/.deploy.env" ]; then . "$ROOT/.deploy.env"; fi
HOST="${DEPLOY_HOST:?DEPLOY_HOST is not set}"
APP="/opt/strikwerda-api"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  . "$NVM_DIR/nvm.sh"
  nvm use > /dev/null
fi
npm test > /dev/null

ssh "$HOST" "mkdir -p ~/backups && cp -a $APP/app ~/backups/api-\$(date +%Y%m%d-%H%M%S) && ls -1dt ~/backups/api-* | tail -n +6 | xargs -r rm -rf"
rsync -rlptz --delete --include='/package.json' --include='/api/***' --include='/src/***' --exclude='*' "$ROOT/" "$HOST:$APP/app/"
ssh "$HOST" sudo -n /usr/local/bin/strikwerda-api-up
echo "api deployed"
