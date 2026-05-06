#!/bin/bash
# Deploy streetbite naar SiteGround + push naar GitHub

set -e

REMOTE="streetbite"
REMOTE_PATH="/home/u1494-ufbwddutwcpa/www/gertjanbos.com/public_html/streetbite"
LOCAL_PATH="$(dirname "$0")/files"

echo "→ Uploaden naar SiteGround..."
rsync -avz --delete \
  -e "ssh -p 18765" \
  "$LOCAL_PATH/" \
  "u1494-ufbwddutwcpa@ssh.gertjanbos.com:$REMOTE_PATH/"

echo "→ Git commit en push..."
cd "$(dirname "$0")"
git add -A
git commit -m "${1:-deploy}" || echo "(niets te committen)"
git push

echo "✓ Klaar — live op gertjanbos.com/streetbite/"
