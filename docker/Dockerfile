# =============================================================================
# @file Dockerfile
# @description Multi-stage Docker build for the Next.js app.
#
# Stage 1 (deps): installs npm dependencies with a frozen lockfile.
# Stage 2 (builder): compiles the Next.js app in standalone output mode.
# Stage 3 (runner): minimal production image running as a non-root user.
#
# NEXT_PUBLIC_* vars must be supplied as build args because Next.js inlines
# them into the client bundle at compile time. Runtime-only vars (STASH_INTERNAL_URL,
# STASH_API_KEY) are injected when the container starts, not baked in here.
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

ARG NEXT_PUBLIC_STASH_EXTERNAL_URL=http://localhost:9999
ARG NEXT_PUBLIC_PAGE_SIZE=60

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
LABEL version="0.1.0"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
