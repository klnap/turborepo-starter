# Application Workspaces (`apps/`)

Governance layer for AI agents working on application workspaces. Inherits all rules from the root [AGENTS.md](../AGENTS.md).

---

## Workspace Architecture

This folder contains deployable applications. Each `apps/<app>/` is an independent Bun workspace with its own `package.json`, dependencies, and Turbo tasks.

In this starter shell, `apps/` is intentionally unpopulated until you add or adopt your applications using `bun adopt apps/<app>`.

| Layer | Path | Purpose |
| :--- | :--- | :--- |
| **Workspace Guide** | [README.md](./README.md) | How to adopt and manage applications |
| **App Rules** | `apps/<app>/AGENTS.md` | Specific constraints for that application (read before modifying) |
| **App Decisions** | `apps/<app>/docs/adr/` | Architectural decisions scoped to that app |
| **App Specs** | `apps/<app>/specs/` | Tier-2 feature specifications |

---

## Agent Rules for `apps/`

1. **Dynamic Workspace Discovery**: Never assume a hardcoded app name (`web`, `cms`). Discover active workspaces dynamically using `ls apps/` or the scoped CLI (`bun ws`).
2. **App-Specific Rules**: When working inside `apps/<app>/`, read that app's `AGENTS.md` first.
3. **Skill Hierarchy**: Workspace skills (`apps/<app>/.agents/skills/`) override root [INDEX.md](../.agents/skills/INDEX.md).
4. **Scoped CLI Only**: Always execute tasks via `bun ws <app> <task>`. Never run `bun add` at the repository root for application runtime libraries.
5. **Quality Gates**: Validate all changes using the verification ladder (`bun run gate:quick` → `gate:push`).
