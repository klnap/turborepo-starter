# ADR-0002 — Turborepo for Task Orchestration

Status: accepted  
Date: 2026-08-27

## Context

Multiple workspaces (`apps/*`, `packages/*`) run overlapping tasks: `lint`, `typecheck`, `test`, `build`. Without a task graph, CI and local validation either run everything serially or duplicate orchestration in shell scripts.

## Decision

Use **Turborepo** as the orchestration layer between CLI scope (`bun ws`) and workspace `package.json` scripts. Task names, caching, and `dependsOn` live in root `turbo.json`; workspaces may extend with local `turbo.json`.

Composite gates (`gate:quick`, `gate:full`) use `scripts/gate/` (Listr2) and invoke Turbo for individual steps — Turbo does not replace CI policy.

## Consequences

**Positive**

- Remote/local cache for `build`, `typecheck`, `test`.
- Explicit task graph (`^build` before `test:e2e`).
- One vocabulary for humans and agents: `bun ws web test`.

**Negative**

- Every workspace task must exist in both `package.json` and `turbo.json` to be discoverable.
- Turbo version upgrades require occasional config review.

## Alternatives considered

| Alternative | Why rejected |
| :--- | :--- |
| Nx | Heavier abstraction; this starter favors minimal layers (CLI → Turbo → script). |
| Plain Bun workspaces without Turbo | No cross-workspace task cache or `dependsOn` graph at scale. |
| Per-workspace CI scripts only | Duplicated orchestration; harder to keep gates consistent. |

## AI

**Never change without human review**

- Removing `turbo.json` or replacing Turbo with ad-hoc shell-only CI orchestration.
- Changing `dependsOn` for `build`, `test`, or `test:e2e` in ways that skip `^build` ordering.
- Disabling remote/local cache globally without an ADR update.

**Ask first**

- Adding or renaming a task — must update **both** workspace `package.json` **and** root `turbo.json`.
- Adding workspace-level `turbo.json` extends.
- Changing `globalDependencies` or `globalEnv` (cache invalidation blast radius).

**Safe to extend or add**

- New tasks that follow existing naming (`lint`, `typecheck`, `test`, `build`) and mirror `package.json` scripts.
- `outputs` / `inputs` tweaks for a single workspace task after verifying cache behavior locally.

## Related

- [docs/cli.md](../cli.md) — scoped CLI surface
- [docs/turborepo.md](../turborepo.md)
- [turbo.json](../../turbo.json)
- [docs/ci-cd.md](../ci-cd.md)
- [ADR-0005](./ADR-0005-scoped-cli.md) — why `bun ws` wraps Turbo
