# `scripts/` — monorepo tooling

TypeScript/Bun automation. **Not** application runtime code.

| Doc | Topic |
| :--- | :--- |
| [cli/README.md](./cli/README.md) | Scoped CLI layout (`bun root` / `ws` / `pkg`) |
| [audit/README.md](./audit/README.md) | lint:deps vs doctor vs repo audit |
| [runners/README.md](./runners/README.md) | visual, coupling-graph |
| [docs/cli.md](../docs/cli.md) | Why scoped CLI exists |
| [docs/ci-cd.md](../docs/ci-cd.md) | Gates and CI |

## CLI vs gate

| Folder | Commands | Job |
| :--- | :--- | :--- |
| **`cli/`** | `bun root`, `bun ws`, `bun pkg`, `bun cli` | **Where** — scope → Turbo/Bun |
| **`gate/`** | `gate:quick` … `gate:full` | **What** — verification pipelines |
| **`shared/`** | (imported) | paths, spawn, workspace discovery |
| **`git/`** | hooks, gitleaks | pre-commit / pre-push |
| **`audit/`** | lint:deps, doctor data, repo audit | ownership + drift |
| **`runners/`** | visual, coupling-graph | cross-workspace tool runners |
| **`security/`** | Trivy, SBOM | `gate:full` only |
| **`oxlint/`** | anti-slop plugin | loaded from `oxlint.config.ts` |

Workspace-only: `apps/<app>/scripts/`.

## Entry points

| Command | Script |
| :--- | :--- |
| `bun root …` | `cli/entries/root.ts` |
| `bun ws <app> …` | `cli/entries/workspace.ts` |
| `bun pkg <name> …` | `cli/entries/package.ts` |
| `bun adopt …` | `cli/entries/adopt.ts` |
| `bun cli` | `cli/index.ts` → `cli/menu/` |
| `bun run gate:*` | `gate/index.ts` |
| `bun run git:pre-commit` | `git/pre-commit.ts` |

## Adding a gate step

1. `gate/pipelines.ts`
2. Matrix: `shared/workspace-capabilities.ts` + `gate/adapters/gh-matrix.ts`
3. [docs/ci-cd.md](../docs/ci-cd.md)

## Conventions

- Subprocess: argv arrays via `shared/spawn.ts` — no shell interpolation
- Artifacts: `.generated/`
- Tests: co-located `*.test.ts` under each folder
