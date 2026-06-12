# Image de construction du .deb : bun + outils d'assemblage, en cache —
# évite un apt-get install à chaque make paquet.
FROM oven/bun:1-debian

RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends unzip curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
