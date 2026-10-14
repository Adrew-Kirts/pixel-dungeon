#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="/var/www/strikwerda"
DIST="$ROOT/dist"
PAGES=(mentions-legales.html declaration-accessibilite.html)

cd "$ROOT"
if [ -f "$ROOT/.deploy.env" ]; then . "$ROOT/.deploy.env"; fi
HOST="${DEPLOY_HOST:?DEPLOY_HOST is not set}"
if [ -z "${CI:-}" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  . "$NVM_DIR/nvm.sh"
  nvm use > /dev/null
fi
npm test > /dev/null

VERSION="$(cat index.html "${PAGES[@]}" styles.css styles-pro.css $(find src assets -type f | sort) | shasum -a 256 | cut -c1-10)"
rm -rf "$DIST"
mkdir -p "$DIST"
cp -R assets "$DIST/assets"
cp -R src "$DIST/src-$VERSION"
cp styles.css "$DIST/styles.css"
cp styles-pro.css "$DIST/styles-pro.css"
BUILD="${VERSION:0:7} · $(date +%Y-%m-%d)"

# Le jeu : bundle versionné et feuille de style du jeu.
sed -e "s#src=\"src/main.js\"#src=\"src-$VERSION/main.js\"#" \
    -e "s#href=\"styles.css\"#href=\"styles.css?v=$VERSION\"#" \
    -e "s#<span id=\"build\">dev</span>#<span id=\"build\">$BUILD</span>#" \
    index.html > "$DIST/index.html"
grep -q "src-$VERSION/main.js" "$DIST/index.html"
grep -q "<span id=\"build\">$BUILD</span>" "$DIST/index.html"

# Les pages du site : seule la feuille de style est versionnée.
for page in "${PAGES[@]}"; do
  sed -e "s#href=\"styles-pro.css\"#href=\"styles-pro.css?v=$VERSION\"#" "$page" > "$DIST/$page"
  grep -q "styles-pro.css?v=$VERSION" "$DIST/$page"
done

if [ "${1:-}" = "--build-only" ]; then
  echo "built $DIST ($VERSION)"
  exit 0
fi

ssh "$HOST" "mkdir -p ~/backups && cp -a $DEST ~/backups/site-\$(date +%Y%m%d-%H%M%S) && ls -1dt ~/backups/site-* | tail -n +6 | xargs -r rm -rf"
rsync -rlptz --delete --filter='P src-*' "$DIST/" "$HOST:$DEST/"
# Lire la réponse avant de la grepper : `curl | grep -q` ferme le tube au premier
# match et curl sort en 23. Déjà corrigé une fois, cf. fbdf2e8.
LIVE="$(curl -fsS "https://strikwerda.fr/?v=$VERSION")"
grep -q "src-$VERSION/main.js" <<< "$LIVE"
LEGAL="$(curl -fsS "https://strikwerda.fr/mentions-legales.html")"
grep -q "styles-pro.css?v=$VERSION" <<< "$LEGAL"
curl -fsS -o /dev/null "https://strikwerda.fr/src-$VERSION/main.js"
curl -fsS -o /dev/null "https://strikwerda.fr/declaration-accessibilite.html"
echo "deployed $VERSION"
