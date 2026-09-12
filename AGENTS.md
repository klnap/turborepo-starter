# Monorepo Constitution & Code of Conduct (AGENTS.md)

Governance for AI agents and human contributors. **Commands:** [docs/commands.md](./docs/commands.md). **Why scoped CLI:** [docs/cli.md](./docs/cli.md).

---

## Always

- **Bun only** — `bun.lock` only; never npm/pnpm/yarn.
- **Scoped CLI** — `bun root` / `bun ws <app>` / `bun pkg <name>` for installs and Turbo tasks. Root `package.json`: tooling `devDependencies` only.
- **Artifacts** — generated output in `.generated/` only.
- **Client/server boundaries** — server-only code never in client bundles.
- **Validation** — external payloads validated with explicit schemas before execution.
- **Env** — no `process.env` in application code; use validated `env.ts` schemas.
- **Logging** — structured logging in production logic; no raw `console.log` / `console.error`.
- **Specs** — non-trivial features need a tiered spec ([specs/README.md](./specs/README.md)) before implementation.
- **Skills** — load **one** skill from [.agents/skills/INDEX.md](./.agents/skills/INDEX.md) per task; workspace skills override root.
- **Validation ladder** — `bun run gate:quick` → `gate:push` (push) → `gate:full` (optional).

## Ask first

- CSP, security headers, or auth proxy changes.
- New Turbo task (needs **both** workspace `package.json` and root `turbo.json`).
- New `packages/*` workspace or extracting shared code ([ADR-0004](./docs/adr/ADR-0004-package-extraction-boundaries.md)).
- Root `turbo.json`, `scripts/gate/pipelines.ts`, or CI workflow changes.
- New or moved monorepo ADR scope (root vs `apps/<app>/docs/adr/`).
- Dependency adds at repository root (even as `devDependencies`).

## Never

- `bun add <app-library>` at repository root.
- Foreign lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`).
- Scratch files in root or `src/` (use `.generated/specs/` for drafts).
- Deep imports across workspace barrels.
- Duplicate command tables in specs — link [docs/commands.md](./docs/commands.md).
- App runtime dependencies in root `package.json`.

---

## Spec tiers

| Tier | Path |
| :--- | :--- |
| 1 Global | `specs/<feature>.md` |
| 2 Workspace | `apps/<app>/specs/<feature>.md` |
| 3 Module | `apps/<app>/src/modules/<module>/specs/<feature>.md` |

---

## Entrypoint map

| Question | Source |
| :--- | :--- |
| Structure | [docs/architecture.md](./docs/architecture.md) |
| CLI / tasks | [docs/cli.md](./docs/cli.md), [docs/commands.md](./docs/commands.md) |
| Apps | [apps/README.md](./apps/README.md) → `apps/<app>/AGENTS.md` |
| Packages | [packages/AGENTS.md](./packages/AGENTS.md) |
| AI workflow | [docs/ai-development.md](./docs/ai-development.md) |
| High-risk files | [docs/security.md](./security.md#high-risk-files-ai-agents) |
| MCP scopes | [docs/mcp.md](./docs/mcp.md) |
| Monorepo ADRs | [docs/adr/README.md](./docs/adr/README.md) |
| Change impact | [docs/guides/change-impact.md](./docs/guides/change-impact.md) |

When docs and code disagree, **code wins** — then fix the docs.

---

## Definition of done (non-trivial changes)

1. Correct workspace ownership (root / app / package).
2. `bun run lint:deps` after dependency changes.
3. Co-located tests for logic changes; `test:mutation` when critical.
4. `bun run gate:quick` + relevant gates.
5. Update specs, ADRs, or `docs/commands.md` when behavior changes.
