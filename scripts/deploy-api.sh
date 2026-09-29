#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
. "$ROOT/.deploy.env"
HOST="$DEPLOY_HOST"
APP="/opt/strikwerda-api"

export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use > /dev/null
npm test > /dev/null

ssh "$HOST" "mkdir -p $APP/app && if [ -d $APP/app/api ]; then cp -a $APP/app $APP/app.bak-\$(date +%Y%m%d-%H%M%S); fi"
rsync -rlptz --delete --include='/package.json' --include='/api/***' --include='/src/***' --exclude='*' "$ROOT/" "$HOST:$APP/app/"
rsync -tz "$ROOT/deploy/api/compose.yml" "$HOST:$APP/compose.yml"
ssh "$HOST" bash -s <<REMOTE
set -euo pipefail
cd $APP
if [ ! -f .env ]; then
  umask 077
  printf 'HMAC_SECRET=%s\n' "\$(openssl rand -hex 32)" > .env
fi
chmod 600 .env
docker volume create strikwerda_api_data > /dev/null
docker run --rm -v strikwerda_api_data:/data alpine:3 chown 1000:1000 /data
docker compose up -d --force-recreate
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if docker exec strikwerda_api wget -qO- http://127.0.0.1:8080/api/leaderboard > /dev/null 2>&1; then
    echo "api up"
    exit 0
  fi
  sleep 1
done
docker logs --tail 30 strikwerda_api
exit 1
REMOTE
echo "api deployed"
