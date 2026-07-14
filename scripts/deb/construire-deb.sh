#!/usr/bin/env bash
# Construit dist/tampon_<version>_amd64.deb de façon reproductible dans
# l'image de construction (bun + outils en cache). À lancer depuis l'hôte.
set -euo pipefail
cd "$(dirname "$0")/../.."

docker build -q --build-arg BUN_VERSION="$(cat docker/bun-version)" -t tampon-construction docker/construction > /dev/null

mkdir -p dist/cache
docker run --rm \
  -v "$PWD":/src \
  -w /src \
  tampon-construction \
  bash scripts/deb/construire-deb-interne.sh

echo "✓ Paquet : $(ls dist/tampon_*_amd64.deb)"
