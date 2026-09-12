# Technical Specifications

Specs describe **what a feature or system must do** before and during implementation. They are for the product you build on this starter — not documentation of the starter itself.

## What a spec is

| Document | Purpose |
| :--- | :--- |
| **Spec** | Intended behavior, acceptance criteria, scope |
| **ADR** | Durable architectural *decision* and why ([docs/adr/README.md](../docs/adr/README.md)) |
| **docs/*.md** | How the system works (reference) |
| **AGENTS.md** | Constraints and rules for agents/developers |

## When to write a spec

Write a spec before implementing:

- New features or user-facing behavior
- Cross-module or cross-workspace changes
- API or contract changes
- Non-trivial refactors with behavioral impact

Skip specs for: typo fixes, dependency bumps, pure CSS tweaks, one-line bugfixes with obvious scope.

## Tier selection

| Tier | Path | Use when |
| :--- | :--- | :--- |
| **1 — Global** | `specs/[feature-name].md` | Cross-workspace infra, shared CI pipelines, global auth, monorepo tooling |
| **2 — Workspace** | `apps/<workspace>/specs/[feature-name].md` | App routing, layouts, providers, workspace-wide behavior |
| **3 — Module** | `apps/<workspace>/src/modules/<module>/specs/[feature-name].md` | Domain feature, module UI, module Server Actions |
| **Package** | `packages/<package>/specs/[feature-name].md` | Shared library public API and behavior |

## Conventions

- **Naming**: kebab-case (`checkout-flow.md`, `auth-provider.md`)
- **Template**: [TEMPLATE.md](./TEMPLATE.md)
- **Example** (reference only): [examples/example-workspace-health-panel.md](./examples/example-workspace-health-panel.md)
- **Drafts**: `.generated/specs/` (git-ignored)
- **CI changes**: extend `scripts/gate/pipelines.ts` — [docs/ci-cd.md](../docs/ci-cd.md)

## Workflow

```
Spec → implement → tests → gate:quick → gate:push → gate:full  → (ADR if architectural decision) → update docs
```

See [docs/guides/feature-development.md](../docs/guides/feature-development.md).
