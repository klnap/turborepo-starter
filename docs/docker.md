# Docker Containerization

This monorepo leverages **`turbo prune`** to build minimal, isolated Docker container images for any application workspace in `apps/<app>`.

---

## Architecture: `turbo prune`

Turborepo's `prune` command analyzes the dependency graph for a specific target workspace (e.g. `web` or `cms`) and generates a pruned monorepo subset containing only the files and dependencies needed to build that specific application:

```bash
bunx turbo prune --scope=<APP_NAME> --docker
```

Output is created in `out/`:
- `out/json/`: Pruned workspace `package.json` files and lockfile (used for caching dependency installation layers).
- `out/full/`: Full source code of the target application and any internal packages.

---

## Multi-Stage Container Pipeline

A standard production multi-stage Docker build:

```dockerfile
FROM oven/bun:1.4.0-alpine AS base

# Stage 1: Pruner
FROM base AS pruner
RUN bun add -g turbo
WORKDIR /app
COPY . .
ARG APP_NAME
RUN turbo prune --scope=${APP_NAME} --docker

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN bun root build --filter=${APP_NAME}

# Stage 3: Runner
FROM base AS runner
WORKDIR /app
# Copy standalone output and run
USER bun
CMD ["bun", "run", "start"]
```

---

## Building a Specific App

```bash
# Build the Next.js app container:
docker build -t my-web-app --build-arg APP_NAME=web .

# Build the Payload CMS container:
docker build -t my-cms-app --build-arg APP_NAME=cms .
```
