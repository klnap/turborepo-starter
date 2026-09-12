# Documentation Index

Start here for repository documentation. For onboarding, see [README.md](../README.md).

## Core

| Document | Purpose |
| :--- | :--- |
| [architecture.md](./architecture.md) | Structure, ownership, tooling model (source of truth) |
| [cli.md](./cli.md) | **Scoped CLI** — why `bun root` / `ws` / `pkg`, dependency rules, agent guide |
| [turborepo.md](./turborepo.md) | Turbo task graph, caching, CLI layers |
| [scripts/README.md](../scripts/README.md) | CLI, CI, audits, tooling scripts |
| [apps/README.md](../apps/README.md) | Application workspaces |
| [commands.md](./commands.md) | CLI and Turbo commands |
| [development.md](./development.md) | Local workflow |
| [testing.md](./testing.md) | Test levels and gates |
| [contributing.md](./contributing.md) | PR and commit standards |

## Operations

| Document | Purpose |
| :--- | :--- |
| [ci-cd.md](./ci-cd.md) | GitHub Actions |
| [.github/README.md](../.github/README.md) | Workflows folder index |
| [security.md](./security.md) | Security controls |
| [mcp.md](./mcp.md) | MCP server scopes for agents |
| [deployment.md](./deployment.md) | Vercel and hosting |
| [docker.md](./docker.md) | Container builds |

## AI & product development

| Document | Purpose |
| :--- | :--- |
| [AGENTS.md](../AGENTS.md) | Global constraints and AI entrypoint |
| [specs/README.md](../specs/README.md) | Feature specifications |
| [adr/README.md](./adr/README.md) | Architectural decisions |
| [ai-development.md](./ai-development.md) | AI workflow (monorepo vs app ADR scope) |
| [guides/feature-development.md](./guides/feature-development.md) | End-to-end feature workflow |
| [guides/change-impact.md](./guides/change-impact.md) | What to check after a change |
| [guides/new-workspace-checklist.md](./guides/new-workspace-checklist.md) | Adding apps/packages |
| [.agents/skills/INDEX.md](../.agents/skills/INDEX.md) | Skill router |

## Source of truth

| Topic | Authority |
| :--- | :--- |
| Turbo tasks | `turbo.json` — [turborepo.md](./turborepo.md) |
| Workspace scripts | `package.json` per workspace |
| CLI — why / workflows | [cli.md](./cli.md) |
| CLI — command tables | [commands.md](./commands.md) |
| CLI implementation | `scripts/cli/` |
| Architecture | `docs/architecture.md` |
| Agent rules | `AGENTS.md` hierarchy |
| Feature behavior | `specs/` |
| Architectural decisions | `docs/adr/` |
| Environment | Workspace `env.ts` schema |
| Import boundaries | `dependency-cruiser.config.mjs` |
