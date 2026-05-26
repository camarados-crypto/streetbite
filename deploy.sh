#!/bin/bash
# Deploy streetbite naar SiteGround + push naar GitHub

set -e

REMOTE_HOST="u1494-ufbwddutwcpa@ssh.gertjanbos.com"
REMOTE_PATH="/home/u1494-ufbwddutwcpa/www/gertjanbos.com/public_html/streetbite"
BACKUP_PATH="/home/u1494-ufbwddutwcpa/backups/streetbite"
LOCAL_PATH="$(dirname "$0")/files"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
VERSION=$(date +"%Y.%m.%d")

echo "→ Versie instellen: $VERSION..."
sed -i '' "s/const APP_VERSION = '[^']*'/const APP_VERSION = '$VERSION'/" "$LOCAL_PATH/js/config.js"

echo "→ Backup maken van huidige server versie..."
ssh -p 18765 "$REMOTE_HOST" "mkdir -p $BACKUP_PATH && cp -r $REMOTE_PATH $BACKUP_PATH/backup_$TIMESTAMP && echo 'Backup: $BACKUP_PATH/backup_$TIMESTAMP'"

echo "→ Uploaden naar SiteGround..."
rsync -avz \
  -e "ssh -p 18765" \
  "$LOCAL_PATH/" \
  "$REMOTE_HOST:$REMOTE_PATH/"

echo "→ Git commit en push..."
cd "$(dirname "$0")"
git add -A
git commit -m "${1:-deploy}" || echo "(niets te committen)"
git push

echo "✓ Klaar — live op gertjanbos.com/streetbite/"
echo "  Backup staat op: $BACKUP_PATH/backup_$TIMESTAMP"
