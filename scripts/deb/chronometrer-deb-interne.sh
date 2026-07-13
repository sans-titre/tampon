#!/usr/bin/env bash
# Exécuté DANS un conteneur vierge par chronometrer-deb.sh : mesure le
# cycle utilisateur complet du .deb installé — démarrage du serveur,
# export PDF (Chromium froid puis serveur chaud), arrêt.
# Sortie : tableau Markdown, repris dans le résumé de chaque run CI.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
URL="http://localhost:3000/sans-titre.art/tampon"

# Installation hors chrono : on mesure l'app, pas apt.
apt-get update -qq > /dev/null
apt-get install -y -qq /tmp/tampon.deb curl jq > /dev/null 2>&1

ms() { date +%s%3N; }

composer_chrono() { # $1 titre
  jq -n --arg t "$1" \
    '{markdown: "# Chrono\n\nParagraphe de mesure.", gabarit: "rapport", meta: {titre: $t, date: "Juin 2026"}}' \
    | curl -sf -X POST "$URL/composer" -H "Content-Type: application/json" -d @- > /dev/null
}

T0=$(ms)
TAMPON_SANS_NAVIGATEUR=1 tampon > /tmp/tampon.log 2>&1 &
PID=$!
until curl -sf "$URL" > /dev/null 2>&1; do sleep 0.05; done
T1=$(ms)
composer_chrono "Chrono 1"
T2=$(ms)
composer_chrono "Chrono 2"
T3=$(ms)
kill "$PID"
wait "$PID" 2>/dev/null || true
T4=$(ms)

cat <<EOF
### Chronométrage du .deb — cycle utilisateur

| Étape | Durée |
|---|---:|
| Démarrage du serveur | $((T1 - T0)) ms |
| Export PDF 1 — Chromium froid | $((T2 - T1)) ms |
| Export PDF 2 — serveur chaud | $((T3 - T2)) ms |
| Arrêt | $((T4 - T3)) ms |
| **Démarrer + exporter + fermer** | **$((T2 - T0 + T4 - T3)) ms** |
EOF
