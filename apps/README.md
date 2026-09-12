# Application Workspaces (`apps/`)

All deployable applications and services live in this directory. Each subdirectory is an independent Bun workspace containing its own `package.json`, TypeScript configuration, environment schema, and Turbo tasks.

This repository is structured as a **modular Turborepo shell** — the `apps/` directory is kept unopinionated so you can add or adopt any application frameworks (such as Next.js, Vite, Astro, Remix, Hono, Express, or Payload CMS).

---

## Adding Applications

You can add applications to `apps/` in two ways:

### 1. Create a New Application
Generate an application directly into the `apps/` directory using your framework CLI, for example:
```bash
# Example: Next.js
bun create next-app apps/web

# Example: Vite
bun create vite apps/web
```

After creating or copying the app, integrate it into the monorepo governance:
```bash
bun adopt apps/web
```

### 2. Import an Existing Application
Move or clone an existing standalone project into `apps/<app-name>` (make sure to remove its standalone `.git` directory if cloned), then run:
```bash
bun adopt apps/<app-name>
```

---

## What `bun adopt` Does

The `bun adopt` command standardizes any application workspace:
- Validates the application `package.json` for required scripts (`dev`, `build`, `typecheck`, `lint`, `test`).
- Maps the application into the root `turbo.json` task graph.
- Configures workspace scoped CLI routing (`bun ws <app> <cmd>`).
- Enforces shared TypeScript configuration inheritance (`tsconfig.base.json`).
- Adds an `AGENTS.md` monorepo integration guide for AI coding assistants.

---

## Workspace CLI Commands

Once an application is added to `apps/<app>`:

```bash
bun ws <app> dev           # Start development server
bun ws <app> build         # Run production build
bun ws <app> typecheck     # Check TypeScript types
bun ws <app> lint          # Run Biome / Oxlint checks
bun ws <app> test          # Run test suite
bun ws <app> add <pkg>     # Add dependency to this workspace only
bun ws <app> secrets       # Pull Infisical secrets directly for this workspace
```
