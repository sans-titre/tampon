.PHONY: build up down dev doc test debug paquet test-deb essai-deb lint format

build:
	docker compose -f docker/docker-compose.yml build

up:
	docker compose -f docker/docker-compose.yml up -d

down:
	docker compose -f docker/docker-compose.yml down

dev:
	docker compose -f docker/docker-compose.yml up

doc:
	$(MAKE) -C docs

# Livrable Linux : dist/tampon_<version>_amd64.deb (binaire Bun compilé
# + chrome-headless-shell embarqué, construit dans oven/bun:1-debian)
paquet:
	bash scripts/construire-deb.sh

# Installe le .deb dans debian:bookworm et ubuntu:24.04 vierges et compose
test-deb:
	bash scripts/tester-deb.sh

# Essai interactif : .deb installé dans un conteneur vierge, UI ouverte dans
# le navigateur hôte, tirages dans ./tirages/ (IMAGE=debian:bookworm, PORT=…)
essai-deb:
	bash scripts/essayer-deb.sh

# Échoue réellement (code de sortie propagé) — utilisable comme barrière CI.
test: up
	@bash scripts/tester-serveur.sh; etat=$$?; $(MAKE) down; exit $$etat

# Lint + format (biome) dans le conteneur bun — aucune installation locale.
lint:
	docker run --rm -u "$$(id -u):$$(id -g)" -e HOME=/tmp -v "$$PWD":/src -w /src \
		oven/bun:1-debian sh -c "bun install --silent && bun run lint"

format:
	docker run --rm -u "$$(id -u):$$(id -g)" -e HOME=/tmp -v "$$PWD":/src -w /src \
		oven/bun:1-debian sh -c "bun install --silent && bun run format"

MD      ?= examples/rapport.md
GABARIT ?= rapport
TITRE   ?= Test
DATE    ?= Mai 2026

debug: up
	@echo "--- Composition : gabarit=$(GABARIT) md=$(MD) ---"
	@bash -c 'source scripts/lib-test.sh && attendre_url \
		&& composer "$(TITRE)" "$(GABARIT)" "$(MD)" "$(DATE)"' ; echo ""
	@echo "--- Logs conteneur ---"
	@docker compose -f docker/docker-compose.yml logs --no-log-prefix atelier
	$(MAKE) down
