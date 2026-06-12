#!/usr/bin/env bash
# Exécuté DANS un conteneur vierge par tester-deb.sh
# (lib-test.sh est monté à côté de ce script).
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
source "$(dirname "$0")/lib-test.sh"

trap 'echo "— journal serveur —"; cat /tmp/tampon.log 2>/dev/null' ERR

echo "— installation (apt résout les Depends)"
apt-get update -qq > /dev/null
apt-get install -y -qq /tmp/tampon.deb curl jq poppler-utils > /dev/null 2>&1

echo "— démarrage de tampon"
TAMPON_SANS_NAVIGATEUR=1 tampon > /tmp/tampon.log 2>&1 &
SERVEUR_PID=$!
attendre_url 30 0.5
echo "✓ UI servie"

EXEMPLES=/usr/lib/tampon/share/examples
for essai in "Rapport test:rapport:$EXEMPLES/rapport.md" "Test AP:ap:$EXEMPLES/ap-test.md"; do
  IFS=: read -r titre gabarit fichier <<< "$essai"
  tirage=$(composer "$titre" "$gabarit" "$fichier" | jq -re .tirage)
  pages=$(pdfinfo "$HOME/Documents/Tampon/$tirage" | awk '/^Pages:/{print $2}')
  [ "$pages" -ge 1 ]
  echo "✓ Composition $gabarit → $tirage ($pages pages)"
done

curl -s -X POST "$BASE_URL/composer" -H "Content-Type: application/json" \
  -d '{"markdown": "", "gabarit": "rapport"}' | grep -q erreur
echo "✓ Rejet contenu vide"

echo "— désinstallation"
kill "$SERVEUR_PID" 2>/dev/null || true
wait "$SERVEUR_PID" 2>/dev/null || true
apt-get purge -y -qq tampon > /dev/null
hash -r
! command -v tampon > /dev/null 2>&1
[ ! -e /usr/bin/tampon ]
[ ! -e /usr/lib/tampon ]
! dpkg -s tampon > /dev/null 2>&1
echo "✓ Désinstallation propre — aucun résidu sous /usr"
