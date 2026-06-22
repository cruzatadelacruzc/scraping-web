# ── Stage 1: build ──────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Skip Puppeteer's postinstall Chrome download (Chromium is installed in the
# runtime stage). Saves ~170MB of download + avoids Google CDN rate-limits.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_SKIP_DOWNLOAD=true \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ── Stage 2: production runtime ─────────────────────────────────────────
FROM node:24-bookworm-slim AS production
WORKDIR /app

# System deps for Chromium and the Node runtime.
# xvfb is included in case the scraper ever needs to run headed (e.g. for
# debugging inside the container with `xvfb-run`).
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy only production dependencies + compiled output
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist/main ./dist/main
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 80

CMD ["npm", "start"]
