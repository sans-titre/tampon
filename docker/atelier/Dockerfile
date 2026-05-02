FROM oven/bun:1-debian

RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  fonts-noto \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

RUN bun add -g pagedjs-cli

COPY package.json bun.lock* ./
RUN bun install

COPY . .

RUN mkdir -p tirages && chmod +x docker/atelier/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker/atelier/entrypoint.sh"]
