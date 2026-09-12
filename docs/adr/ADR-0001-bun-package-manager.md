# ADR-0001 — Bun as Sole Package Manager

Status: accepted  
Date: 2026-08-27

## Context

Monorepos need one package manager for lockfile integrity, reproducible CI, and predictable `bun ws` / workspace resolution. Mixing npm, pnpm, or yarn in the same repo creates conflicting lockfiles, hoisting surprises, and broken contributor onboarding.

## Decision

Use **Bun** exclusively for install, scripts, and the native test runner. Root `preinstall` rejects other package managers. The only permitted lockfile is `bun.lock`.

## Consequences

**Positive**

- Fast installs and script execution.
- Native `bun test` without extra test-runner wiring at root tooling.
- Single CLI surface aligned with `bun root` / `bun ws` / `bun pkg`.

**Negative**

- Contributors must install Bun (documented in README).
- Some npm-centric tooling needs explicit Bun compatibility checks.

## Alternatives considered

| Alternative | Why rejected |
| :--- | :--- |
| pnpm workspaces | Strong monorepo support, but this starter standardizes on Bun for speed and a single runtime for scripts + tests. |
| npm / yarn | Slower installs; no unified script runner; conflicts with Bun-first CI and hooks. |

## AI

**Never change without human review**

- `preinstall` script in root `package.json` that rejects non-Bun package managers.
- Permitted lockfile name (`bun.lock` only) and deletion of foreign lockfiles policy in docs/AGENTS.

**Ask first**

- Raising or lowering `engines.bun` / `engines.node` major versions.
- Adding a second package manager or hybrid install path “for compatibility”.
- Replacing Bun test runner with Jest/Vitest at repository root.

**Safe to extend or add**

- Workspace-scoped dependencies via `bun ws <app> add` / `bun pkg <name> add`.
- Root `devDependencies` for monorepo tooling only (`bun root add -d <pkg>`).
- Documenting Bun version in README when `engines` already updated by a human.

## Related

- [docs/cli.md](../cli.md) — scoped CLI guide
- [docs/architecture.md](../architecture.md) — dependency ownership
- [AGENTS.md](../../AGENTS.md) — Chapter 1
