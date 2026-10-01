#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="/var/www/strikwerda"
DIST="$ROOT/dist"

cd "$ROOT"
. "$ROOT/.deploy.env"
HOST="$DEPLOY_HOST"
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use > /dev/null
npm test > /dev/null

VERSION="$(cat index.html styles.css $(find src assets -type f | sort) | shasum -a 256 | cut -c1-10)"
rm -rf "$DIST"
mkdir -p "$DIST"
cp -R assets "$DIST/assets"
cp -R src "$DIST/src-$VERSION"
cp styles.css "$DIST/styles.css"
BUILD="${VERSION:0:7} · $(date +%Y-%m-%d)"
sed -e "s#src=\"src/main.js\"#src=\"src-$VERSION/main.js\"#" -e "s#href=\"styles.css\"#href=\"styles.css?v=$VERSION\"#" -e "s#<span id=\"build\">dev</span>#<span id=\"build\">$BUILD</span>#" index.html > "$DIST/index.html"
grep -q "src-$VERSION/main.js" "$DIST/index.html"
grep -q "<span id=\"build\">$BUILD</span>" "$DIST/index.html"
if [ "${1:-}" = "--build-only" ]; then
  echo "built $DIST ($VERSION)"
  exit 0
fi

ssh "$HOST" "cp -a $DEST /root/strikwerda-backup-\$(date +%Y%m%d-%H%M%S)"
rsync -rlptz --delete --filter='P src-*' "$DIST/" "$HOST:$DEST/"
curl -fsS "https://strikwerda.fr/?v=$VERSION" | grep -q "src-$VERSION/main.js"
curl -fsS -o /dev/null "https://strikwerda.fr/src-$VERSION/main.js"
echo "deployed $VERSION"
