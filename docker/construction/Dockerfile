# Image de construction du .deb : bun + outils d'assemblage, en cache —
# évite un apt-get install à chaque make paquet.
FROM oven/bun:1-debian

RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends unzip curl ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

# git describe lit /src (monté depuis l'hôte) : le conteneur tourne en root
# sur une arbo appartenant à l'utilisateur hôte → sans quoi « dubious ownership ».
RUN git config --global --add safe.directory /src
