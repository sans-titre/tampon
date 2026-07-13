#!/usr/bin/env bash
# Exécuté DANS un conteneur vierge par tester-deb.sh
# (lib-test.sh est monté à côté de ce script).
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
source "$(dirname "$0")/lib-test.sh"

trap 'echo "— journal serveur —"; cat /tmp/tampon.log 2>/dev/null' ERR

echo "— installation (apt résout les Depends)"
apt-get update -qq > /dev/null
apt-get install -y -qq /tmp/tampon.deb curl jq poppler-utils desktop-file-utils > /dev/null 2>&1

desktop-file-validate /usr/share/applications/tampon.desktop
[ -f /usr/share/icons/hicolor/scalable/apps/tampon.svg ]
echo "✓ Entrée de menu (.desktop valide + icône)"

echo "— démarrage de tampon"
TAMPON_SANS_NAVIGATEUR=1 tampon > /tmp/tampon.log 2>&1 &
SERVEUR_PID=$!
attendre_url 30 0.5
echo "✓ UI servie"

# Les gabarits/exemples fournis (enfouis sous /usr/lib/tampon/share, root) sont
# amorcés éditables aux côtés des tirages.
USERSPACE="$HOME/Documents/Tampon"
[ -f "$USERSPACE/gabarits/gabarit-rapport.css" ]
[ -f "$USERSPACE/gabarits/gabarit-lettre.css" ]
[ -f "$USERSPACE/gabarits/caracteres.css" ]
[ -f "$USERSPACE/gabarits/LISEZ-MOI.md" ]
[ -n "$(ls -A "$USERSPACE/gabarits/fonts"/*.ttf 2>/dev/null)" ]
[ -f "$USERSPACE/examples/rapport.md" ]
[ -f "$USERSPACE/examples/lettre.md" ]
echo "✓ Gabarits + exemples + guide fournis exposés dans ~/Documents/Tampon"
[ -w "$USERSPACE/gabarits/gabarit-rapport.css" ]
echo "✓ Copies éditables (droits utilisateur)"

EXEMPLES="$USERSPACE/examples"
for essai in "Rapport test:rapport:$EXEMPLES/rapport.md" \
             "Lettre test:lettre:$EXEMPLES/lettre.md"; do
  IFS=: read -r titre gabarit fichier <<< "$essai"
  tirage=$(composer "$titre" "$gabarit" "$fichier" | jq -re .tirage)
  pages=$(pdfinfo "$HOME/Documents/Tampon/$tirage" | awk '/^Pages:/{print $2}')
  [ "$pages" -ge 1 ]
  echo "✓ Composition $gabarit → $tirage ($pages pages)"
done

curl -s -X POST "$BASE_URL/composer" -H "Content-Type: application/json" \
  -d '{"markdown": "", "gabarit": "rapport"}' | grep -q erreur
echo "✓ Rejet contenu vide"

# Second lancement (sans TAMPON_SANS_NAVIGATEUR, comme depuis le menu) :
# doit détecter l'instance en cours et sortir en 0 sans second serveur.
tampon > /tmp/tampon2.log 2>&1
grep -q "déjà ouvert" /tmp/tampon2.log
echo "✓ Second lancement réutilise l'instance en cours"

# Amorçage idempotent : une édition utilisateur survit à un relancement.
# (Un 2e lancement à chaud sort avant l'amorçage ; on coupe et relance à froid.)
echo "/* marque-utilisateur */" >> "$USERSPACE/gabarits/gabarit-rapport.css"
kill "$SERVEUR_PID" 2>/dev/null || true
wait "$SERVEUR_PID" 2>/dev/null || true
TAMPON_SANS_NAVIGATEUR=1 tampon > /tmp/tampon3.log 2>&1 &
SERVEUR_PID=$!
attendre_url 30 0.5
grep -q "marque-utilisateur" "$USERSPACE/gabarits/gabarit-rapport.css"
echo "✓ Amorçage idempotent — n'écrase pas une édition utilisateur"

echo "— désinstallation"
kill "$SERVEUR_PID" 2>/dev/null || true
wait "$SERVEUR_PID" 2>/dev/null || true
apt-get purge -y -qq tampon > /dev/null
hash -r
! command -v tampon > /dev/null 2>&1
[ ! -e /usr/bin/tampon ]
[ ! -e /usr/lib/tampon ]
[ ! -e /usr/share/applications/tampon.desktop ]
[ ! -e /usr/share/icons/hicolor/scalable/apps/tampon.svg ]
! dpkg -s tampon > /dev/null 2>&1
echo "✓ Désinstallation propre — aucun résidu sous /usr"

# Les gabarits/exemples amorcés sont des données utilisateur (potentiellement
# éditées) : la désinstallation ne doit pas y toucher — cf. docs/suivi.
[ -d "$USERSPACE/gabarits" ] && [ -f "$USERSPACE/examples/rapport.md" ]
grep -q "marque-utilisateur" "$USERSPACE/gabarits/gabarit-rapport.css"
echo "✓ Données utilisateur préservées (~/Documents/Tampon intact)"
