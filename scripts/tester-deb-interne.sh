#!/usr/bin/env bash
# Exécuté DANS un conteneur vierge par tester-deb.sh.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
BASE_URL="http://localhost:3000/sans-titre.art/tampon"

trap 'echo "— journal serveur —"; cat /tmp/tampon.log 2>/dev/null' ERR

echo "— installation (apt résout les Depends)"
apt-get update -qq > /dev/null
apt-get install -y -qq /tmp/tampon.deb curl jq poppler-utils > /dev/null 2>&1

echo "— démarrage de tampon"
TAMPON_SANS_NAVIGATEUR=1 tampon > /tmp/tampon.log 2>&1 &
for _ in $(seq 1 30); do
  curl -sf "$BASE_URL" > /dev/null 2>&1 && break
  sleep 0.5
done
curl -sf "$BASE_URL" > /dev/null
echo "✓ UI servie"

composer() { # $1 titre, $2 gabarit, $3 fichier markdown → nom du tirage
  jq -n --rawfile md "$3" --arg g "$2" --arg t "$1" \
    '{markdown: $md, gabarit: $g, meta: {titre: $t, date: "Juin 2026"}}' \
    | curl -sf -X POST "$BASE_URL/composer" -H "Content-Type: application/json" -d @- \
    | jq -re .tirage
}

EXEMPLES=/usr/lib/tampon/share/examples
for essai in "Rapport test:rapport:$EXEMPLES/rapport.md" "Test AP:ap:$EXEMPLES/ap-test.md"; do
  IFS=: read -r titre gabarit fichier <<< "$essai"
  tirage=$(composer "$titre" "$gabarit" "$fichier")
  pages=$(pdfinfo "$HOME/Documents/Tampon/$tirage" | awk '/^Pages:/{print $2}')
  [ "$pages" -ge 1 ]
  echo "✓ Composition $gabarit → $tirage ($pages pages)"
done

curl -s -X POST "$BASE_URL/composer" -H "Content-Type: application/json" \
  -d '{"markdown": "", "gabarit": "rapport"}' | grep -q erreur
echo "✓ Rejet contenu vide"
