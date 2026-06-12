#!/usr/bin/env bash
# Assertions contre un serveur tampon déjà lancé (make test, CI).
# Sort en erreur à la première assertion qui échoue.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib-test.sh

attendre_url
echo "✓ UI"

composer "Rapport test" rapport examples/rapport.md | grep -q tirage
echo "✓ Composition rapport"

composer "Test AP" ap examples/ap-test.md | grep -q tirage
echo "✓ Composition AP"

curl -s -X POST "$BASE_URL/composer" -H "Content-Type: application/json" \
  -d '{"markdown": "", "gabarit": "rapport", "meta": {}}' | grep -q erreur
echo "✓ Rejet contenu vide"

curl -s -X POST "$BASE_URL/composer" -H "Content-Type: application/json" \
  -d '{"markdown": "# x", "meta": {}}' | grep -q erreur
echo "✓ Rejet gabarit absent"

curl -s "$BASE_URL/gabarits" | jq -e 'index("rapport") and index("ap")' > /dev/null
echo "✓ Liste des gabarits"
