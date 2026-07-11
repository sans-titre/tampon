#!/usr/bin/env bash
# Installe le .deb dans des conteneurs vierges (Debian ET Ubuntu — ce dernier
# prouve que le piège « chromium snap » est éliminé) et compose deux documents.
set -euo pipefail
cd "$(dirname "$0")/.."

DEB=$(ls -t dist/tampon_*_amd64.deb | head -1)
echo "Paquet testé : $DEB"

for IMAGE in debian:bookworm ubuntu:24.04; do
  echo ""
  echo "═══ $IMAGE ═══"
  docker run --rm \
    -v "$PWD/$DEB":/tmp/tampon.deb:ro \
    -v "$PWD/scripts/tester-deb-interne.sh":/tmp/test.sh:ro \
    -v "$PWD/scripts/lib-test.sh":/tmp/lib-test.sh:ro \
    "$IMAGE" \
    bash /tmp/test.sh
done

echo ""
echo "✓ test-deb : tous les environnements passent"
