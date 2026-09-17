# Multi-stage build producing a single image that runs the whole stack:
#   Stage 1 (web-build): compiles the Vite/React SPA into static assets.
#   Stage 2 (runtime):   Debian-slim base with Python + nginx + supervisord.
#                        nginx serves the SPA and reverse-proxies /api to gunicorn.
#
# The SPA fetches externalUrl/pageSize from /api/config at runtime, so one image
# works for any deployment without a rebuild.

# syntax=docker/dockerfile:1

FROM node:22-alpine AS web-build
WORKDIR /web

# Install JS deps first so the layer caches until the lockfile changes.
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS runtime
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/aayusharyan/stash-hub"
LABEL org.opencontainers.image.description="High-concurrency Python backend + React SPA for self-hosted Stash"
LABEL org.opencontainers.image.licenses="MIT"
LABEL version="0.4.0"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    BACKEND_BIND=127.0.0.1:8000

# nginx serves static assets and proxies /api; supervisor runs nginx + gunicorn together.
RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx supervisor \
 && rm -rf /var/lib/apt/lists/*

# Install backend Python deps in their own layer for build-cache friendliness.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Backend source and process configs.
COPY backend/ ./backend/
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/stash-hub.conf

# Compiled SPA -> nginx web root.
COPY --from=web-build /web/dist /usr/share/nginx/html

EXPOSE 7676

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/stash-hub.conf"]
