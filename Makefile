.PHONY: build deb test test-deb dev clean

# Compile le binaire standalone via Docker
build:
	docker build -f Dockerfile.build --target export --output type=local,dest=dist .
	@echo "→ dist/bundle/tampon prêt"

# Produit le paquet .deb installable
deb:
	docker build -f Dockerfile.build --target deb-out --output type=local,dest=dist .
	@echo "→ dist/tampon_0.2.0_amd64.deb prêt"

# Alias test e2e
test: test-deb

# Teste l'installation du .deb — image cachée, composition bout en bout
test-deb: deb
	docker build -f Dockerfile.build --target test-env -t tampon-test-env . -q
	docker run --rm \
		--cap-add SYS_ADMIN \
		--shm-size=256m \
		-v "$(CURDIR)/dist:/dist" \
		-v "$(CURDIR)/logs:/logs" \
		-v "$(CURDIR)/.vivliostyle-cache:/opt/puppeteer" \
		-e LOGS_DIR=/logs \
		-e TIRAGES_DIR=/tirages \
		tampon-test-env \
		sh -c '\
			dpkg -i /dist/tampon_0.2.0_amd64.deb; \
			mkdir -p /opt/vivliostyle-cli && touch /opt/vivliostyle-cli/.vs-cli-version; \
			tampon & sleep 2; \
			echo "--- test UI ---"; \
			curl -sf http://localhost:3000/sans-titre.art/tampon \
				| grep -q "atelier sans-titre" && echo "UI OK" || (echo "UI FAIL" && exit 1); \
			echo "--- test composition ---"; \
		curl -sf --max-time 15 \
				-X POST http://localhost:3000/sans-titre.art/tampon/composer \
				-H "Content-Type: application/json" \
				-d '"'"'{"markdown":"# Test CI\n\nContenu.","gabarit":"rapport","meta":{"titre":"test-ci"}}'"'"' \
				| grep -q '"'"'"tirage"'"'"' && echo "composition OK" || (echo "composition FAIL" && exit 1); \
			echo "--- test PDF ---"; \
		ls /tirages/test-ci.pdf && echo "PDF OK" || (echo "PDF FAIL" && exit 1); \
			kill %1 2>/dev/null; \
			echo "--- OK ---" \
		'

# Lance le serveur en mode dev (via Docker runtime)
dev:
	docker compose up

clean:
	rm -rf dist/
