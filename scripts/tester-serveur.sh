#!/usr/bin/env bash
# Assertions contre un serveur tampon déjà lancé (make test, CI).
# Sort en erreur à la première assertion qui échoue.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-http://localhost:3000/sans-titre.art/tampon}"

for _ in $(seq 1 30); do
  curl -sf "$BASE_URL" > /dev/null 2>&1 && break
  sleep 1
done
curl -sf "$BASE_URL" > /dev/null
echo "✓ UI"

composer() { # $1 titre, $2 gabarit, $3 fichier markdown
  jq -n --rawfile md "$3" --arg g "$2" --arg t "$1" \
    '{markdown: $md, gabarit: $g, meta: {titre: $t, date: "Juin 2026"}}' \
    | curl -sf -X POST "$BASE_URL/composer" -H "Content-Type: application/json" -d @- \
    | grep -q tirage
}

composer "Rapport test" rapport examples/rapport.md
echo "✓ Composition rapport"

composer "Test AP" ap examples/ap-test.md
echo "✓ Composition AP"

curl -s -X POST "$BASE_URL/composer" -H "Content-Type: application/json" \
  -d '{"markdown": "", "gabarit": "rapport", "meta": {}}' | grep -q erreur
echo "✓ Rejet contenu vide"
