.PHONY: build up down dev doc test debug paquet test-deb essai-deb chrono-deb lint format

# Port hôte de l'atelier (défaut 3000). Surchargeable : make up PORT_HOTE=3100
# Une collision est détectée avant le démarrage (message clair, pas d'erreur
# réseau brute de Docker) — voir scripts/dev/verifier-port.sh.
PORT_HOTE   ?= 3000
ATELIER_URL := http://localhost:$(PORT_HOTE)/sans-titre.art/tampon
export PORT_HOTE

build:
	docker compose -f docker/docker-compose.yml build

up:
	@bash scripts/dev/verifier-port.sh $(PORT_HOTE)
	docker compose -f docker/docker-compose.yml up -d
	@echo "Atelier ouvert → $(ATELIER_URL)"

down:
	docker compose -f docker/docker-compose.yml down

dev:
	@bash scripts/dev/verifier-port.sh $(PORT_HOTE)
	@echo "Atelier ouvert → $(ATELIER_URL)"
	docker compose -f docker/docker-compose.yml up

doc:
	$(MAKE) -C docs

# Livrable Linux : dist/tampon_<version>_amd64.deb (binaire Bun compilé
# + chrome-headless-shell embarqué, construit dans oven/bun:1-debian)
paquet:
	bash scripts/deb/construire-deb.sh

# Installe le .deb dans debian:bookworm et ubuntu:24.04 vierges et compose
test-deb:
	bash scripts/deb/tester-deb.sh

# Essai interactif : .deb installé dans un conteneur vierge, UI ouverte dans
# le navigateur hôte, tirages dans ./tirages/ (IMAGE=debian:bookworm, PORT=…)
essai-deb:
	bash scripts/deb/essayer-deb.sh

# Chronomètre le cycle utilisateur du .deb (démarrage → export → arrêt) —
# sortie Markdown, reprise dans le résumé de chaque run CI.
chrono-deb:
	@bash scripts/deb/chronometrer-deb.sh

# Échoue réellement (code de sortie propagé) — utilisable comme barrière CI.
test: up
	@BASE_URL="$(ATELIER_URL)" bash scripts/dev/tester-serveur.sh; etat=$$?; $(MAKE) down; exit $$etat

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
	@bash -c 'source scripts/lib-test.sh; export BASE_URL="$(ATELIER_URL)"; attendre_url \
		&& composer "$(TITRE)" "$(GABARIT)" "$(MD)" "$(DATE)"' ; echo ""
	@echo "--- Logs conteneur ---"
	@docker compose -f docker/docker-compose.yml logs --no-log-prefix atelier
	$(MAKE) down
