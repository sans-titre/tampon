#!/usr/bin/env bash
# Chronomètre le cycle utilisateur du .deb (démarrage → export PDF → arrêt)
# dans un conteneur vierge. Sortie Markdown sur stdout — le CI la reprend
# dans le résumé de chaque run (GITHUB_STEP_SUMMARY).
# Variable : IMAGE (déf. ubuntu:24.04).
set -euo pipefail
# cd silencieux : avec CDPATH posé dans l'environnement, cd écho le chemin
# et polluerait la sortie Markdown.
cd "$(dirname "$0")/.." > /dev/null

IMAGE="${IMAGE:-ubuntu:24.04}"
DEB=$(ls -t dist/tampon_*_amd64.deb | head -1)

docker run --rm \
  -v "$PWD/$DEB":/tmp/tampon.deb:ro \
  -v "$PWD/scripts/chronometrer-deb-interne.sh":/tmp/chrono.sh:ro \
  "$IMAGE" \
  bash /tmp/chrono.sh

echo ""
echo "_Paquet : \`$(basename "$DEB")\` · image : \`$IMAGE\`_"
