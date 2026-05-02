.PHONY: build dev doc

build:
	docker compose -f docker/docker-compose.yml build

dev:
	docker compose -f docker/docker-compose.yml up

doc:
	$(MAKE) -C docs
