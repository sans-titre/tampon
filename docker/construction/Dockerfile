ARG BUN_VERSION
FROM oven/bun:${BUN_VERSION}-debian

RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends unzip curl ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

# Root dans le conteneur / arbo hôte non-root → évite "dubious ownership" de git.
RUN git config --global --add safe.directory /src
