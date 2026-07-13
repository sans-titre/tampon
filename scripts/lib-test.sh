#!/usr/bin/env bash
# Fonctions partagées par tester-serveur.sh, tester-deb-interne.sh et la
# cible debug du Makefile. Le contrat /composer ne vit qu'ici.
# À sourcer : BASE_URL surchargeable par l'environnement.

BASE_URL="${BASE_URL:-http://localhost:3000/sans-titre.art/tampon}"

attendre_url() { # $1 essais (déf. 30), $2 pause en s (déf. 1)
  local essais="${1:-30}" pause="${2:-1}"
  for _ in $(seq 1 "$essais"); do
    curl -sf "$BASE_URL" > /dev/null 2>&1 && return 0
    sleep "$pause"
  done
  curl -sf "$BASE_URL" > /dev/null
}

composer() { # $1 titre, $2 gabarit, $3 fichier markdown, $4 date (opt.), $5 auteur (opt.) → JSON
  jq -n --rawfile md "$3" --arg g "$2" --arg t "$1" --arg d "${4:-Juin 2026}" --arg a "${5:-}" \
    '{markdown: $md, gabarit: $g, meta: {titre: $t, date: $d, auteur: $a}}' \
    | curl -sf -X POST "$BASE_URL/composer" -H "Content-Type: application/json" -d @-
}
