# Deployment Guide

Deployment workflows for applications hosted inside this monorepo shell.

---

## Vercel Deployment

Each Next.js application in `apps/<app>` can be deployed to Vercel as a standalone project:

1. **Root Directory**: In Vercel Project Settings, set the **Root Directory** to `apps/<app>` (e.g. `apps/web`).
2. **Build & Development Settings**:
   - **Framework Preset**: Next.js
   - **Install Command**: `bun install`
   - **Build Command**: `bun run build`
3. **Ignore Build Step**: Turborepo provides automatic skipping if an application hasn't changed:
   ```bash
   npx turbo-ignore
   ```

---

## Standalone Node.js / Docker (Coolify, Railway, Fly.io, AWS)

Any backend service or Next.js app configured with `output: 'standalone'` can be deployed to container platforms:

1. Ensure the workspace produces standalone output (`server.js`).
2. Build via Docker using the multi-stage `turbo prune` workflow documented in [docker.md](./docker.md).
