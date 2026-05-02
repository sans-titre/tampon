IMAGE   := sans-titre-mermaid
SOURCES := $(wildcard diagrammes/*.mmd)
RENDUS  := $(patsubst diagrammes/%.mmd,rendus/%.png,$(SOURCES))

.PHONY: all build clean

all: build $(RENDUS)

build:
	docker build -t $(IMAGE) -f ../docker/doc/Dockerfile .

rendus/%.png: diagrammes/%.mmd | rendus
	docker run --rm \
		-u $(shell id -u):$(shell id -g) \
		-v $(CURDIR):/data \
		$(IMAGE) \
		-i /data/diagrammes/$*.mmd \
		-o /data/rendus/$*.png \
		--scale 3

rendus:
	mkdir -p rendus

clean:
	rm -f rendus/*.png
