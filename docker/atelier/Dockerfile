FROM oven/bun:1-debian

RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  fonts-noto \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Pipeline CDP : le serveur pilote directement le Chromium de l'image.
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV TAMPON_RACINE=/app
ENV TIRAGES_DIR=/app/tirages
ENV LOGS_DIR=/app/logs
ENV TAMPON_SANS_NAVIGATEUR=1
ENV PORT=3000
# Le serveur écoute en boucle locale par défaut ; en conteneur, le mapping
# de port exige toutes les interfaces.
ENV TAMPON_HOTE=0.0.0.0

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install

COPY . .

RUN mkdir -p tirages && chmod +x docker/atelier/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker/atelier/entrypoint.sh"]
