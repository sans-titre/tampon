#!/usr/bin/env bash
# Pré-vol : vérifie qu'un port hôte est libre avant de démarrer l'atelier Docker.
# Sans ça, la collision remonte en erreur réseau illisible de dockerd. Ici on
# la catche en amont avec un message clair (typiquement : l'appli tampon
# installée occupe déjà le 3000).
set -euo pipefail
port="${1:?usage: verifier-port.sh <port>}"

occupe=""
if command -v ss > /dev/null 2>&1; then
  [ -n "$(ss -ltnH "sport = :${port}" 2>/dev/null)" ] && occupe=1
elif (exec 3<> "/dev/tcp/127.0.0.1/${port}") 2>/dev/null; then
  exec 3>&- 2>/dev/null || true
  occupe=1
fi

if [ -n "$occupe" ]; then
  cat >&2 <<MSG
✗ Port ${port} déjà occupé — l'atelier ne peut pas démarrer.
  Cause probable : l'appli tampon installée (.deb) tourne déjà sur ${port}.
  → Ferme-la, ou choisis un autre port : make up PORT_HOTE=3100
MSG
  exit 1
fi

echo "✓ Port ${port} libre"
