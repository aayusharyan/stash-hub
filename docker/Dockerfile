# =============================================================================
# @file Dockerfile
# @description Multi-stage Docker build for the Next.js app.
#
# Stage 1 (deps): installs npm dependencies with a frozen lockfile.
# Stage 2 (builder): compiles the Next.js app in standalone output mode.
# Stage 3 (runner): minimal production image running as a non-root user.
#
# NEXT_PUBLIC_* vars are baked in as placeholder strings at build time; entrypoint.sh
# replaces them with real values at container startup so the image is reusable.
# Runtime-only vars (STASH_INTERNAL_URL, STASH_API_KEY) are injected by Docker directly.
# =============================================================================

# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Placeholder values are baked into the bundle at compile time.
# The entrypoint.sh script replaces them with real env var values at container startup,
# so a single pre-built image works for any deployment target without a rebuild.
ARG NEXT_PUBLIC_STASH_EXTERNAL_URL=__NEXT_PUBLIC_STASH_EXTERNAL_URL__
ARG NEXT_PUBLIC_PAGE_SIZE=__NEXT_PUBLIC_PAGE_SIZE__

ENV NEXT_PUBLIC_STASH_EXTERNAL_URL=$NEXT_PUBLIC_STASH_EXTERNAL_URL \
    NEXT_PUBLIC_PAGE_SIZE=$NEXT_PUBLIC_PAGE_SIZE \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/aayusharyan/stash-hub"
LABEL org.opencontainers.image.description="Polished Next.js frontend for self-hosted Stash"
LABEL org.opencontainers.image.licenses="MIT"
LABEL version="0.3.0"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=7676 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# entrypoint.sh replaces placeholder env vars in the bundle at container startup.
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nextjs

EXPOSE 7676

CMD ["sh", "entrypoint.sh"]
