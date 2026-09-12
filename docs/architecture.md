# Architecture

Source of truth for how this repository is structured and how responsibilities are divided.

---

## Principles

- **Explicit scope** — every task, dependency, and tool has a named owner (root, app, or package).
- **Dependency ownership** — install dependencies where they are used; do not hoist app runtime deps to root.
- **Reusable tooling** — shared runners at `scripts/runners/` (visual, coupling-graph); workspace config stays in the workspace.
- **Workspace isolation** — generated output, tests, and config live with the workspace that owns them.
- **Turbo orchestration** — task graph, caching, and parallelism are Turbo's job.
- **Minimal abstraction** — no extra orchestration layers between CLI, Turbo, and tools.
- **Security by default** — validated env schemas, security headers, subprocess argv arrays (no shell interpolation).

> Every dependency, task, tool, and configuration has an explicit owner and scope.

---

## Monorepo Structure

```text
.
├── apps/
│   └── web/                   # Next.js 16 application
├── docs/                      # Repository documentation
├── scripts/
│   ├── cli/                   # bun root | ws | pkg (scope resolution)
│   ├── visual.ts, coupling-graph.ts  # Shared workspace runners (visual, coupling graph)
│   ├── gate/                  # gate:quick / gate:full verification pipelines
│   ├── audit/                 # Env and dependency ownership audits
│   ├── git/                   # Git hook automation
│   └── shared/                # Low-level shared utilities
├── turbo.json                 # Task graph and cache configuration
└── package.json               # Root workspace manifest
```

`packages/*` is configured as a Bun workspace; **no packages ship in the starter** — see [packages/README.md](../packages/README.md) and [ADR-0004](./adr/ADR-0004-package-extraction-boundaries.md) when you extract shared code.

### Application layout (`apps/<app>/`)

Starter example: **`web`** (Next.js). Another app may use a different `src/` tree; conventions live in that workspace's `AGENTS.md`.

```text
apps/<app>/src/                 # example paths from starter web
├── app/                        # App Router (pages, layouts, API routes)
│   └── [locale]/               # Localized route segment (when i18n is used)
├── components/                 # Shared UI (barrel exports via index.ts)
├── i18n/                       # next-intl routing, messages (web starter)
├── lib/                        # Foundational utilities
├── modules/                    # Domain features (public API via index.ts)
├── proxies/                    # Edge proxy rules (web starter)
├── env.ts                      # Validated environment schema
└── proxy.ts                    # Proxy chain dispatcher (web starter)
```

Co-located unit tests: `src/**/*.test.ts(x)`. Black-box tests: `tests/e2e/` (when present).

**Folder conventions:** active workspace `AGENTS.md` §6 (e.g. `apps/<app>/AGENTS.md`).

---

## Dependency Ownership

| Scope | `package.json` | Typical dependencies |
| :--- | :--- | :--- |
| **Root** | `/package.json` | Turbo, Biome, Oxlint, CI scripts, shared dev tooling |
| **App** | `apps/<app>/package.json` | Next.js, React, app-specific libraries |
| **Package** | `packages/<pkg>/package.json` | Library code consumed by apps |

Framework versions are **not** synchronized across apps. `apps/web` may run a different Next.js version than a future `apps/cms` if each workspace declares its own dependency.

Root `scripts/audit/dependency-ownership.ts` (`bun run lint:deps`) enforces that workspace dependencies are not incorrectly hoisted.

---

## Command Contract

| Layer | Role | Location |
| :--- | :--- | :--- |
| **CLI** | WHERE — scope (`root`, `ws`, `pkg`) | `scripts/cli/` |
| **package.json** | WHAT — available workspace scripts | Root and each workspace |
| **Turbo** | WHEN — orchestration, cache, `dependsOn` | `turbo.json` |
| **Tooling** | HOW — reusable implementation | `scripts/*.ts`, `scripts/audit/` |
| **CI policy** | WHICH steps run, hooks, ordering | `scripts/gate/`, `.githooks/` |

```text
bun root | ws | pkg <task>   →   Turbo   →   package.json script   →   tooling
```

Dependency commands (`install`, `add`, `remove`, `update`) bypass Turbo and route to Bun.

Composite gates (`gate:quick`, `gate:push`, `gate:ci`, `gate:full`) use `scripts/gate` (Listr2) — Turbo runs inside individual step commands.

---

## Lint Scope

| Command | Scope |
| :--- | :--- |
| `bun run lint` / `bun run lint:code` | Entire repository (root `biome.json` — includes `scripts/`, excludes docs per config) |
| `bun root lint:code` | Per-workspace via Turbo (each workspace runs its own `lint:code` script) |
| `bun ws <app> lint:code` | That workspace only (starter: `web`) |

Both root and workspace lint exist intentionally: root Biome covers repo tooling; workspace Biome covers app source with workspace-specific rules.

---

## Tooling Architecture

```text
bun root | ws | pkg <task>
        ↓
      Turbo (graph, cache, dependsOn)
        ↓
workspace package.json script
        ↓
scripts/<runner>.ts or scripts/<tool>/   (reusable implementation)
        ↓
workspace *.config.ts     (behavior)
        ↓
workspace .generated/     (output)
```

| Artifact | Location |
| :--- | :--- |
| Reusable implementation | `scripts/*.ts`, `scripts/audit/` |
| Workspace-only scripts | `apps/<app>/scripts/` |
| Workspace configuration | `apps/<app>/*.config.ts`, `lighthouserc.cjs`, etc. |
| Workspace generated output | `apps/<app>/.generated/<tool>/` |
| Repo-wide generated output | `.generated/` at repository root |
| Versioned baselines (visual snapshots) | Next to spec in workspace; committed to Git |

**Example — Lighthouse (starter `web`):**

```text
```

**Example — workspace-only icons (starter `web`):**

```text
```

Workspaces without required config are skipped by Turbo — not an error.

Do not duplicate tool implementation between apps. Add shared runners under `scripts/` when a second workspace needs the same tool.

---

## CLI Architecture

Entry points: `scripts/cli/entries/{root,workspace,package}.ts`.

**Full guide:** [cli.md](./cli.md). **ADR:** [ADR-0005](./adr/ADR-0005-scoped-cli.md).

| Command | Resolves to |
| :--- | :--- |
| `bun root <cmd>` | Repository scope |
| `bun ws <app> <cmd>` | `apps/<app>` |
| `bun pkg <name> <cmd>` | `packages/<name>` |
| `bun root doctor` | Read-only repository diagnostics |
| `bun root adopt <path>` | Integrate an existing workspace |

The CLI handles:

- Scope resolution (which workspace)
- Command validation and typo suggestions
- Routing `install`/`add`/`remove`/`update` to Bun
- Routing other commands to Turbo
- `doctor` and `adopt` for repository diagnostics and workspace integration

The CLI does **not**:

- Build a dependency graph (Turbo does)
- Implement tool logic (tooling scripts do)
- Replace Turbo

Shared CLI infrastructure: `scripts/cli/` (discovery, resolver, process spawning, errors).

Subprocess execution uses `Bun.spawn` with argv arrays — no `sh -c`, no shell interpolation.

---

## Task Orchestration

Turbo (`turbo.json`) manages task graph, cache, and parallelism. **Full guide:** [turborepo.md](./turborepo.md).

Turbo manages:

- Task dependency ordering (`dependsOn`) — e.g. `^build`, `^typecheck` for topological ordering across workspaces
- Remote and local caching
- Parallel execution across workspaces
- Per-task inputs, outputs, and environment variables

```text
CLI  →  scope  →  Turbo  →  package.json task  →  tool
```

Root-level gates: `bun run gate:quick` / `gate:push` / `gate:ci` / `gate:full` — see [ci-cd.md](./ci-cd.md).

---

## Application Boundaries

Enforced by `dependency-cruiser` (`bun ws <app> boundaries`) and Oxlint:

1. **No circular dependencies** across workspaces.
2. **Hermetic modules** (`src/modules/<name>/`) — import only via public `index.ts`.
3. **Encapsulated components** (`src/components/<name>/`) — import only via `index.ts`.
4. **Encapsulated utilities** (`src/lib/<name>/`) — modular, co-located tests.

Apps must not import private code from other apps. Shared code belongs in `packages/*` when introduced.

Root `scripts/` contains no application business logic.

---

## Package Boundaries

When `packages/*` workspaces are added:

- Packages expose a public API; apps depend on packages, not on other apps' internals.
- Package tooling follows the same root-vs-workspace split as apps.
- Each package owns its own `package.json` dependencies.

---

## CI Pipelines (`scripts/gate`)

Listr2 pipelines in `scripts/gate/pipelines.ts`. Entry: `bun run scripts/gate/index.ts <quick|push|ci|full>`.

- **quick** — anti-slop (oxlint, types, boundaries, format, licenses) — pre-commit
- **push** — verify (knip, audit, tests, build, E2E/a11y smoke) — pre-push
- **ci** — quick + push — GitHub `ci.yml`
- **full** — ci + security scans, visual, Lighthouse, bundle — optional deep audit

Hooks: `.githooks/` import `scripts/git/*` which call `scripts/gate/runner.ts`.

---

## Testing Architecture

| Level | Runner | Location |
| :--- | :--- | :--- |
| Unit & integration | Bun test | Co-located `*.test.ts(x)` |
| E2E | Playwright | `apps/<app>/tests/e2e/` (starter: `web`) |
| Accessibility | Playwright + axe-core | `tests/e2e/a11y.spec.ts` |
| Visual regression | Playwright + Storybook | `scripts/runners/visual.ts` + workspace spec |
| Mutation | Stryker + `@hughescr/stryker-bun-runner` | Workspace `stryker.config.mjs` → `.generated/stryker/` |
| Architecture | dependency-cruiser | `dependency-cruiser.config.mjs` |
| Dead code | Knip | Per-workspace `knip` task |

Playwright reports and test results: `apps/<app>/.generated/` (starter: `web`).

Details: [testing.md](./testing.md).

---

## Runtime & Deployment

Starter **`web`** workspace:

- **Development**: `bun ws web dev` (Next.js with Turbopack)
- **Production build**: `bun ws web build` → default `.next` output; optional `output: 'standalone'` for containers ([docker.md](./docker.md))
- **Container**: multi-stage Dockerfile with `turbo prune`, non-root `nextjs` user, `/api/health` probe
- **Vercel**: `apps/web/vercel.json` for the starter web project

Other apps follow the same `bun ws <app>` pattern with their own deploy config.

Details: [deployment.md](./deployment.md), [docker.md](./docker.md).

---

## Technology Choices

Foundation technologies currently in use:

| Technology | Role |
| :--- | :--- |
| **Bun** | Package manager, script runner, native test runner (`bun test`). Lockfile: `bun.lock`. `preinstall` rejects npm/pnpm/yarn. |
| **Turborepo** | Monorepo task orchestration and caching |
| **Next.js 16** | App Router, Cache Components (`cacheComponents`), partial prefetching, React Compiler integration |
| **React 19** | UI runtime; React Compiler (`babel-plugin-react-compiler`) for automatic memoization |
| **Biome** | Formatting and linting (replaces ESLint + Prettier) |
| **Oxlint** | Custom AST rules (`scripts/oxlint/anti-slop/`) for architectural constraints |
| **Valibot** | Schema validation for forms and server actions |
| **Tailwind CSS v4** | Utility-first styling |
| **next-intl** | Locale routing and message loading |
| **Loccy** | Translation key linting (`lint:i18n`) |
| **Playwright** | E2E, a11y, and visual regression |
| **Storybook 10** | Component workbench and visual regression target |
| **dependency-cruiser** | Module boundary enforcement |
| **Knip** | Dead code and unused dependency detection |
| **Stryker** | Mutation testing via `@hughescr/stryker-bun-runner` (workspace opt-in) |
| **Pino** | Structured server logging |
| **OpenTelemetry** | Log instrumentation (`@vercel/otel`) |

### Icons (starter `web`)


### i18n (starter `web`)


---

## Documentation Ownership

| Layer | Role | Location |
| :--- | :--- | :--- |
| **AGENTS.md** | Constraints and instructions | Root, `apps/*`, `packages/*` |
| **README.md** | Onboarding | Root |
| **docs/** | Reference — how the system works | [docs/README.md](./README.md) |
| **cli.md** | Scoped CLI — why and how (narrative) | [cli.md](./cli.md) |
| **commands.md** | Command tables only | [commands.md](./commands.md) |
| **specs/** | Intended feature behavior | [specs/README.md](../specs/README.md) |
| **docs/adr/** | Durable product decisions | [adr/README.md](./adr/README.md) |
| **.agents/skills/** | AI procedural instructions | [.agents/skills/INDEX.md](../.agents/skills/INDEX.md) |
| **turbo.json / package.json** | Executable source of truth | Repository root and workspaces |

Do not duplicate executable truth in prose. When docs and config disagree, fix the docs.

Guides: [feature-development](./guides/feature-development.md), [change-impact](./guides/change-impact.md), [new-workspace-checklist](./guides/new-workspace-checklist.md).
