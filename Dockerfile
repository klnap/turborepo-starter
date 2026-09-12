# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Base Image
# -----------------------------------------------------------------------------
FROM oven/bun:1.4.0-alpine AS base
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 1: Pruner (Isolate target workspace & required packages)
# -----------------------------------------------------------------------------
FROM base AS pruner
ARG APP_NAME=web

# Install Turborepo globally for monorepo slicing
RUN bun add -g turbo@^2

# Copy monorepo sources for pruning
COPY . .

# Generate isolated workspace in /app/out (json + full)
RUN turbo prune ${APP_NAME} --docker

# -----------------------------------------------------------------------------
# Stage 2: Builder (Install dependencies & compile application)
# -----------------------------------------------------------------------------
FROM base AS builder
ARG APP_NAME=web
ARG APP_PATH=apps/web

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy pruned package manifests and lockfile for optimal layer caching
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock

# Install dependencies strictly for target workspace
RUN bun install --frozen-lockfile

# Copy full pruned source code
COPY --from=pruner /app/out/full/ .

# Production build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
# Requires `output: 'standalone'` uncommented in apps/web/next.config.ts — see docs/docker.md

# Compile target application via Turborepo
RUN bun root build --filter=${APP_NAME}

# -----------------------------------------------------------------------------
# Stage 3: Runner (Minimal, hardened production runtime)
# -----------------------------------------------------------------------------
FROM oven/bun:1.4.0-alpine AS runner
ARG APP_PATH=apps/web
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system user and group for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone server output
COPY --from=builder /app/${APP_PATH}/public ./${APP_PATH}/public
COPY --from=builder --chown=nextjs:nodejs /app/${APP_PATH}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/${APP_PATH}/.next/static ./${APP_PATH}/.next/static

USER nextjs

EXPOSE 3000

# Built-in healthcheck probe targeting the liveness API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:3000/api/health || exit 1

# Default APP_PATH=apps/web — rebuild with --build-arg APP_PATH=apps/other for another workspace.
ARG APP_PATH=apps/web
ENV APP_PATH=${APP_PATH}
# Shell form required: Docker exec CMD cannot expand build-time APP_PATH.
CMD ["sh", "-c", "exec bun ${APP_PATH}/server.js"]
