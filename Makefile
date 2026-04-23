.PHONY: build deb test-deb dev clean

# Compile le binaire standalone via Docker
build:
	docker build -f Dockerfile.build --target export --output type=local,dest=dist .
	@echo "→ dist/bundle/tampon prêt"

# Produit le paquet .deb installable
deb:
	docker build -f Dockerfile.build --target deb-out --output type=local,dest=dist .
	@echo "→ dist/tampon_0.2.0_amd64.deb prêt"

# Teste l'installation du .deb dans un container Ubuntu jetable
test-deb: deb
	docker run --rm \
		-v "$(CURDIR)/dist:/dist" \
		ubuntu:24.04 \
		sh -c '\
			apt-get update -q && apt-get install -y -q --no-install-recommends curl 2>/dev/null | tail -1; \
			dpkg -i /dist/tampon_0.2.0_amd64.deb; \
			echo "--- test wrapper ---"; \
			which tampon; \
			tampon & sleep 2; \
			echo "--- test UI ---"; \
			curl -sf http://localhost:3000/sans-titre.art/tampon | grep -q "atelier sans-titre" && echo "UI OK" || (echo "UI FAIL" && exit 1); \
			echo "--- test gabarits ---"; \
			curl -sf http://localhost:3000/sans-titre.art/tampon/ui/app.js | grep -q "gabarit" && echo "app.js OK" || (echo "app.js FAIL" && exit 1); \
			kill %1 2>/dev/null; \
			echo "--- OK ---" \
		'

# Lance le serveur en mode dev (via Docker runtime)
dev:
	docker compose up

clean:
	rm -rf dist/
