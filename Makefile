.PHONY: build dist dev clean

# Compile le binaire standalone via Docker
build:
	docker build -f Dockerfile.build --target export --output type=local,dest=dist .
	@echo "→ dist/bundle/tampon prêt"

# Lance le serveur en mode dev (via Docker runtime)
dev:
	docker compose up

clean:
	rm -rf dist/
