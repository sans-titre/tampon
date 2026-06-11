#!/usr/bin/env bash
# Essai interactif du .deb : conteneur vierge + installation du paquet,
# UI publiée sur http://localhost:$PORT, tirages récupérés dans ./tirages/.
# Ctrl-C pour arrêter. Variables : IMAGE (def. ubuntu:24.04), PORT (def. 3000).
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-ubuntu:24.04}"
PORT="${PORT:-3000}"
DEB=$(ls -t dist/tampon_*_amd64.deb | head -1)
URL="http://localhost:${PORT}/sans-titre.art/tampon"

echo "Essai : $DEB dans $IMAGE"
echo "UI    : $URL   (Ctrl-C pour arrêter)"
mkdir -p tirages

# Ouvre le navigateur hôte dès que l'UI répond.
if command -v xdg-open > /dev/null; then
  (
    for _ in $(seq 1 120); do
      if curl -sf "$URL" > /dev/null 2>&1; then
        xdg-open "$URL" > /dev/null 2>&1
        break
      fi
      sleep 1
    done
  ) &
fi

TTY=""
[ -t 0 ] && TTY="-t"

docker run --rm -i $TTY \
  -p "${PORT}:3000" \
  -v "$PWD/$DEB":/tmp/tampon.deb:ro \
  -v "$PWD/tirages":/root/Documents/Tampon \
  "$IMAGE" \
  bash -c '
    export DEBIAN_FRONTEND=noninteractive
    echo "— installation du paquet (apt résout les Depends)…"
    apt-get update -qq > /dev/null
    apt-get install -y -qq /tmp/tampon.deb > /dev/null 2>&1
    echo "✓ installé — démarrage de tampon"
    exec env TAMPON_SANS_NAVIGATEUR=1 PORT=3000 tampon
  '
