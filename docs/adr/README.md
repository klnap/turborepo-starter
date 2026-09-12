## Starter ADRs (monorepo scope only)

Root `docs/adr/` records **cross-workspace** decisions. It does not list app-specific ADRs.

| ID | Title | Status |
| :--- | :--- | :--- |
| [ADR-0001](./ADR-0001-bun-package-manager.md) | Bun as sole package manager | accepted |
| [ADR-0002](./ADR-0002-turborepo-orchestration.md) | Turborepo orchestration | accepted |
| [ADR-0003](./ADR-0003-spec-driven-development.md) | Three-tier specs | accepted |
| [ADR-0004](./ADR-0004-package-extraction-boundaries.md) | When to add `packages/*` | accepted |
| [ADR-0005](./ADR-0005-scoped-cli.md) | Scoped CLI (`bun root` / `ws` / `pkg`) | accepted |

**Workspace ADRs** live under `apps/<app>/docs/adr/`. Root does not duplicate them. Starter example: [apps/web/docs/adr/](../apps/web/docs/adr/README.md).

**AI workflow map:** [docs/ai-development.md](../ai-development.md).
