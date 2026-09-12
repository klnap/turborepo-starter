# Turborepo in this repository

How task orchestration, caching, and the scoped CLI fit together. Executable source of truth: `turbo.json` at repo root and per-workspace `package.json` scripts.

**Scoped CLI (why `bun root` / `ws` / `pkg`):** [cli.md](./cli.md), [ADR-0005](./adr/ADR-0005-scoped-cli.md).  
**Related:** [architecture.md](./architecture.md), [commands.md](./commands.md), [scripts/README.md](../scripts/README.md), skill [.agents/skills/turborepo/SKILL.md](../.agents/skills/turborepo/SKILL.md).

---

## Why Turbo here?

This monorepo has multiple Bun workspaces (`apps/*`, `packages/*`). Turbo:

1. **Runs the same task across workspaces in parallel** (`build`, `test`, `lint:i18n`, …)
2. **Orders tasks by dependency** (`dependsOn: ["^build"]` — build dependencies first)
3. **Caches outputs** — skip work when inputs/outputs unchanged (local `.turbo/`, optional remote cache)
4. **Prunes Docker builds** — `turbo prune` in root `Dockerfile` ships only the workspace slice needed

Turbo does **not** replace Bun or workspace scripts. It schedules them.

---

## Three layers (do not confuse)

```text
bun ws web build     →  WHERE (scoped CLI picks apps/web)
       ↓
turbo run build      →  WHEN (graph, cache, parallelism)
       ↓
package.json script  →  WHAT (e.g. next build)
       ↓
tool / script file   →  HOW (Next, Playwright, …)
```

| Layer | Role | Location |
| :--- | :--- | :--- |
| **Scoped CLI** | `bun root` / `bun ws` / `bun pkg` — resolve workspace, validate task exists | `scripts/cli/` |
| **Turbo** | Task graph, `dependsOn`, cache keys, `outputs` | `turbo.json` |
| **Workspace script** | Actual command | `apps/web/package.json`, etc. |
| **Repo gates** | `gate:quick` / `gate:full` — **not** Turbo tasks; Listr2 pipelines | `scripts/gate/` |

`bun ws <app> <task>` only works when `<task>` exists in **both** root `turbo.json` and that workspace's `package.json`.

Workspace-only scripts (no Turbo task): run from the workspace dir, e.g. `cd apps/web && bun run test:watch`.

---

## Root `turbo.json` tasks

Registered tasks and intent:

| Task | Cache | dependsOn | Purpose |
| :--- | :---: | :--- | :--- |
| `dev` | no | — | Long-running dev servers |
| `build` | yes | `^build` | Production compile; outputs `.next/`, `dist/` |
| `start` | no | `build` | Production server after build |
| `clean` | no | — | Remove artifacts |
| `lint:code` / `lint:fix` | varies | — | Biome per workspace |
| `lint:i18n` | yes | — | Loccy translation lint |
| `lint:architecture` | yes | — | dependency-cruiser boundaries |
| `typecheck` | yes | `^typecheck` | TypeScript |
| `test` | yes | — | Bun unit tests |
| `test:mutation` | no | — | Stryker (opt-in workspaces) |
| `test:e2e` / `test:a11y` | no | `^build` | Playwright |
| `lighthouse` | no | `^build` | Lighthouse CI |
| `storybook` | no | — | Storybook dev server |
| `build-storybook` | yes | `^build` | Static Storybook → `.generated/storybook-static/` |
| `visual` | no | `build-storybook` | Visual regression |
| `checkly:test` / `checkly:deploy` | no | — | Synthetic monitoring |
| `coupling-graph` | no | — | Module coupling graph |
| `icons` | yes | — | SVG sprite build |
| `docs:generate` | yes | `^build` | TypeDoc API docs |
| `knip` | yes | — | Dead code audit |

`^build` means: run `build` in **dependencies** (workspace packages this app depends on) first.

`outputs` tell Turbo what to fingerprint for cache hits (e.g. `.next/**` excluding `.next/cache/**`).

`globalEnv: ["CI"]` — cache keys include `CI` when set.

---

## Common commands

```bash
# Scoped CLI (preferred)
bun ws web build
bun ws web test
bun root build              # all workspaces with a build script
bun root test

# Direct Turbo (filtering, force, dry-run)
bun turbo run build --filter=web
bun turbo run test --force  # ignore cache

# Diagnostics
bun root doctor             # wiring, turbo.json ↔ package.json
```

See [commands.md](./commands.md) for the full list.

---

## Adding a task

1. Add script to workspace `package.json` (e.g. `apps/web/package.json`)
2. Register the same task name in root `turbo.json` (`dependsOn`, `outputs`, `cache` as needed)
3. If CI should run it, add a step in `scripts/gate/pipelines.ts` or a GitHub workflow
4. Document in [commands.md](./commands.md) if user-facing

New workspace checklist: [guides/new-workspace-checklist.md](./guides/new-workspace-checklist.md).

Workspace `turbo.json` may use `extends: ["//"]` to inherit root task definitions (see `apps/web/turbo.json`).

---

## Docker: `turbo prune`

Root `Dockerfile` stage **pruner** runs:

```bash
turbo prune ${APP_NAME} --docker
```

Produces a minimal monorepo slice (`out/json/` + `out/full/`) so the image only installs and builds the target app and its dependency graph.

Details: [docker.md](./docker.md).

---

## Remote cache (optional)

Set in CI or locally for faster repeated builds:

- `TURBO_TOKEN`
- `TURBO_TEAM`

See [Turbo remote caching](https://turbo.build/docs/core-concepts/remote-caching). CI workflow notes: [ci-cd.md](./ci-cd.md).

---

## What is NOT Turbo

| Command | Mechanism |
| :--- | :--- |
| `bun run gate:quick` / `gate:full` | `scripts/gate/index.ts` (Listr2) |
| `bun root install` | Bun workspaces (bypasses Turbo) |
| `bun ws web test:watch` | Workspace-only script (no turbo task) |

---

## For AI agents

- Read this file + `turbo.json` before adding or renaming tasks.
- Do not put multi-workspace shell chains in root `package.json` — use Turbo tasks per workspace.
- Load skill [turborepo](../.agents/skills/turborepo/SKILL.md) for generic Turborepo patterns beyond this repo.
