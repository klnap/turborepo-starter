# ADR-0005 — Scoped CLI (`bun root` / `bun ws` / `bun pkg`)

Status: accepted  
Date: 2026-08-28

## Context

Monorepos fail in predictable ways when contributors (human or AI) run commands without declaring **where** work happens:

- `bun add react` at repository root hoists framework deps into the wrong `package.json`, bloating install graphs and breaking `lint:deps`.
- `cd apps/web && bun add foo` works but hides scope from logs, CI, and agents — easy to run in the wrong folder after a context switch.
- `bun run dev` at root fails or does the wrong thing because there is no root dev server — only workspace apps have one.
- `turbo run build` without `--filter` builds everything, wasting time; with a wrong filter it silently skips the workspace you meant to touch.
- Tasks declared only in `package.json` but not in `turbo.json` look “available” in npm scripts but never participate in the task graph, cache, or `bun ws` discovery.

We need a **single, explicit vocabulary** that ties together dependency ownership, Turbo orchestration, and quality gates — so every install and every task run is intentional.

## Decision

Require the **scoped CLI** for all monorepo package management and Turbo tasks:

| Command | Scope | Resolves to |
| :--- | :--- | :--- |
| `bun root <cmd>` | Repository (all workspaces) | Root `package.json` or `turbo run` without filter |
| `bun ws <app> <cmd>` | One app in `apps/<app>/` | `bun --filter <workspace>` or `turbo run --filter=./apps/<app>` |
| `bun pkg <name> <cmd>` | One package in `packages/<name>/` | Same pattern under `packages/` |

Implementation: `scripts/cli/` (`entries/root.ts`, `workspace.ts`, `package.ts`).

### Rules

1. **Dependencies** — `install`, `add`, `remove`, `update` must use scoped commands. Root holds **devDependencies for monorepo tooling only**; apps and packages own their runtime deps.
2. **Turbo tasks** — `bun ws` / `bun pkg` only expose tasks in the **intersection** of root `turbo.json` and workspace `package.json` scripts. This is intentional: a task must be both orchestrated and implemented.
3. **Workspace-only scripts** — scripts without a Turbo task (e.g. `test:watch`) run via `cd apps/<app> && bun run <script>`; they are not hidden, they are explicitly local.
4. **Gates** — `gate:quick`, `gate:push`, `gate:ci`, `gate:full` are root scripts (`bun run gate:*`), not scoped CLI tasks. They encode CI policy in `scripts/gate/`.
5. **Escape hatch** — `bun turbo run <task> --filter=...` remains for advanced use; day-to-day work uses scoped CLI.

### What the CLI validates

- Workspace exists (`apps/` vs `packages/` — suggests `bun ws` when you typed `bun pkg` and vice versa).
- Task exists in the allowed set (typo suggestions via Levenshtein distance).
- Package name provided for `add` / `remove` / `update`.
- Dependency commands route to Bun with `--filter` for workspaces — never accidental root install.

### What the CLI does not do

- Build the task graph (Turbo).
- Run quality checks (gates, unless you invoke `bun root audit`).
- Replace workspace `package.json` as source of script definitions.

## Consequences

**Positive**

- Agents and humans share one command vocabulary aligned with [architecture.md](../architecture.md) ownership model.
- Wrong-scope installs are harder; `lint:deps` catches root pollution.
- `bun ws web` with no args lists **only** tasks that will actually run through Turbo for that workspace.
- Logs and docs read consistently in PRs, CI, and local reproduction.

**Negative**

- Extra token/word vs `cd` + `bun add` — accepted cost for explicitness.
- New tasks require edits in **two** places (`package.json` + `turbo.json`) before `bun ws` exposes them.
- Contributors must learn three entry points instead of one generic `bun run`.

## Enforcement

| Mechanism | What it guards |
| :--- | :--- |
| `bun run lint:deps` | No runtime deps at root; forbidden framework packages in root devDeps |
| `preinstall` | Rejects npm / pnpm / yarn |
| `bun root doctor` | Workspace layout, CLI wiring, config presence |
| Git hooks + gates | Quality after changes land (anti-slop on commit, verify on push) |
| `scripts/cli/cli.test.ts` | Resolver and task discovery behavior |

## Alternatives considered

| Alternative | Why rejected |
| :--- | :--- |
| Raw `bun` / `turbo` only | No scope guardrails; frequent wrong-directory installs |
| npm/pnpm workspace filters without wrapper | Inconsistent with Bun-only ADR-0001; no unified typo help |
| Single `bun run` at root for everything | Hides workspace ownership; encourages root dependency hoisting |
| Auto-detect workspace from cwd | Silent magic; breaks when cwd wrong; bad for agents replaying commands |

## AI

**Never change without human review**

- Removing scoped entrypoints (`bun root`, `bun ws`, `bun pkg`) or routing `add`/`install` to unscoped root Bun.
- Changing `scripts/cli/` resolver to allow accidental root installs of app runtime deps.
- Renaming gate scripts (`gate:quick`, `gate:push`, `gate:ci`, `gate:full`) without syncing `scripts/gate/pipelines.ts` and docs.

**Ask first**

- New scope alias or shorthand in `scripts/cli/adopt-cli.ts` / entries.
- Exposing workspace-only scripts through `bun ws` without a Turbo task (intentionally blocked today).
- Changing Levenshtein typo suggestions or workspace discovery paths.

**Safe to extend or add**

- Clearer error messages and usage text in `scripts/cli/errors.ts`.
- New **documented** root gate step after updating `pipelines.ts` + `docs/testing.md`.
- Tests in `scripts/cli/*.test.ts` for resolver behavior.

## Related

- [docs/cli.md](../cli.md) — full guide for humans and agents
- [docs/commands.md](../commands.md) — command reference tables
- [docs/turborepo.md](../turborepo.md) — task graph and caching
- [ADR-0001](./ADR-0001-bun-package-manager.md) — Bun exclusivity
- [ADR-0002](./ADR-0002-turborepo-orchestration.md) — Turbo layer
- [ADR-0004](./ADR-0004-package-extraction-boundaries.md) — when to add `packages/*`
- [scripts/cli/](../scripts/cli/) — implementation
