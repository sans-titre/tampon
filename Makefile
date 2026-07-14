# ── Configuration
PORT_HOTE   ?= 3000
ATELIER_URL := http://localhost:$(PORT_HOTE)/sans-titre.art/tampon
export PORT_HOTE

BUN_VERSION := $(shell cat docker/bun-version)
export BUN_VERSION

MD      ?= examples/rapport.md
GABARIT ?= rapport
TITRE   ?= Test
DATE    ?= Mai 2026
AUTEUR  ?= Marcel Dupont

.DEFAULT_GOAL := help
.PHONY: help build up down dev doc test debug pdf paquet test-deb essai-deb chrono-deb lint format

# ── Atelier (Docker Compose)
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

# ── Qualité
lint:
	docker run --rm -u "$$(id -u):$$(id -g)" -e HOME=/tmp -v "$$PWD":/src -w /src \
		oven/bun:$(BUN_VERSION)-debian sh -c "bun install --silent && bun run lint"

format:
	docker run --rm -u "$$(id -u):$$(id -g)" -e HOME=/tmp -v "$$PWD":/src -w /src \
		oven/bun:$(BUN_VERSION)-debian sh -c "bun install --silent && bun run format"

# ── Tests
test: up
	@BASE_URL="$(ATELIER_URL)" bash scripts/dev/tester-serveur.sh; etat=$$?; $(MAKE) down; exit $$etat

# ── Paquet Debian
paquet:
	bash scripts/deb/construire-deb.sh

test-deb:
	bash scripts/deb/tester-deb.sh

essai-deb:
	bash scripts/deb/essayer-deb.sh

chrono-deb:
	@bash scripts/deb/chronometrer-deb.sh

# ── Composition manuelle
debug: up
	@echo "--- Composition : gabarit=$(GABARIT) md=$(MD) ---"
	@bash -c 'source scripts/lib-test.sh; export BASE_URL="$(ATELIER_URL)"; attendre_url \
		&& composer "$(TITRE)" "$(GABARIT)" "$(MD)" "$(DATE)" "$(AUTEUR)"' ; echo ""
	@echo "--- Logs conteneur ---"
	@docker compose -f docker/docker-compose.yml logs --no-log-prefix atelier
	$(MAKE) down

pdf: up
	@bash -c 'source scripts/lib-test.sh; export BASE_URL="$(ATELIER_URL)"; attendre_url \
		&& rep=$$(composer "$(TITRE)" "$(GABARIT)" "$(MD)" "$(DATE)" "$(AUTEUR)") \
		&& echo "PDF → tirages/$$(echo "$$rep" | jq -r .tirage)"'
	$(MAKE) down

# ── Documentation
doc:
	$(MAKE) -C docs

# ── Aide
help:
	@echo "Atelier (Docker Compose)"
	@echo "  build        Construit l'image Docker de l'atelier"
	@echo "  up           Démarre l'atelier en arrière-plan"
	@echo "  down         Arrête l'atelier"
	@echo "  dev          Démarre l'atelier au premier plan (logs live)"
	@echo ""
	@echo "Qualité"
	@echo "  lint         Vérifie le code (biome)"
	@echo "  format       Formate le code (biome)"
	@echo ""
	@echo "Tests"
	@echo "  test         Lance l'atelier et la suite de tests serveur"
	@echo ""
	@echo "Paquet Debian"
	@echo "  paquet       Construit le .deb (dist/tampon_<version>_amd64.deb)"
	@echo "  test-deb     Installe le .deb dans Debian et Ubuntu vierges"
	@echo "  essai-deb    Essai interactif du .deb dans un conteneur vierge"
	@echo "  chrono-deb   Chronomètre le cycle démarrage → export → arrêt du .deb"
	@echo ""
	@echo "Composition manuelle"
	@echo "  debug        Compose un document et affiche les logs (debug)"
	@echo "  pdf          Compose un PDF de contrôle dans tirages/"
	@echo ""
	@echo "Documentation"
	@echo "  doc          Génère la documentation (docs/)"
