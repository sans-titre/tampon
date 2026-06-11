#!/usr/bin/env bash
# Construit dist/tampon_<version>_amd64.deb de façon reproductible
# dans un conteneur oven/bun:1-debian. À lancer depuis l'hôte.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p dist/cache
docker run --rm \
  -v "$PWD":/src \
  -w /src \
  oven/bun:1-debian \
  bash scripts/construire-deb-interne.sh

echo "✓ Paquet : $(ls dist/tampon_*_amd64.deb)"
