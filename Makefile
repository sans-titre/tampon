.PHONY: build up down dev doc test debug

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

test: up
	@echo "Attente du démarrage..."
	@sleep 4
	@curl -sf http://localhost:3000/sans-titre.art/tampon > /dev/null \
		&& echo "✓ UI" || echo "✗ UI"
	@jq -n --rawfile md examples/rapport.md \
		'{"markdown": $$md, "gabarit": "rapport", "meta": {"titre": "Rapport test", "date": "Mai 2026"}}' \
		| curl -sf -X POST http://localhost:3000/sans-titre.art/tampon/composer \
		-H "Content-Type: application/json" -d @- \
		| grep -q tirage && echo "✓ Composition rapport" || echo "✗ Composition rapport"
	@curl -s -X POST http://localhost:3000/sans-titre.art/tampon/composer \
		-H "Content-Type: application/json" \
		-d '{"markdown": "", "gabarit": "rapport", "meta": {}}' \
		| grep -q erreur && echo "✓ Rejet contenu vide" || echo "✗ Rejet contenu vide"
	$(MAKE) down

MD      ?= examples/rapport.md
GABARIT ?= rapport
TITRE   ?= Test
DATE    ?= Mai 2026

debug: up
	@echo "Attente du démarrage..."
	@sleep 4
	@echo "--- Composition : gabarit=$(GABARIT) md=$(MD) ---"
	@jq -n --rawfile md $(MD) \
		'{"markdown": $$md, "gabarit": "$(GABARIT)", "meta": {"titre": "$(TITRE)", "date": "$(DATE)"}}' \
		| curl -s -X POST http://localhost:3000/sans-titre.art/tampon/composer \
		-H "Content-Type: application/json" -d @- ; echo ""
	@echo "--- Logs conteneur ---"
	@docker compose -f docker/docker-compose.yml logs --no-log-prefix atelier
	$(MAKE) down
