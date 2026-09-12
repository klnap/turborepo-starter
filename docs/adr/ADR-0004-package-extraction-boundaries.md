# ADR-0004 — Package Extraction Boundaries

Status: accepted  
Date: 2026-08-27

## Context

The monorepo reserves `packages/*` for code shared across workspaces. Without rules, packages become a dumping ground for app logic, or apps duplicate constants and schemas.

There is **no** shipped example package in this starter — add `packages/<name>` when a real cross-workspace need appears.

## Decision

**Extract to `packages/<name>` when:**

- Two or more workspaces need the same **stable** contract (constants, schemas, utilities).
- The code has **no** React, Next.js, or app env dependencies.
- The public API is small and versioned via the package `exports` field.

**Keep in `apps/<app>` when:**

- Code is UI, routing, Server Actions, or next-intl messages.
- Only one app uses it today (`src/modules/` or `src/lib/`).

Apps declare workspace dependencies as `"@scope/<pkg>": "workspace:*"`. **Locales and i18n** stay in the owning app (`apps/<app>/src/i18n/` or equivalent) — not in a shared package unless a non-app tool truly cannot depend on that app.

## Consequences

**Positive**

- Clear rule for when to create `packages/ui`, `packages/db`, etc.
- Turbo `^build` / `^typecheck` can order packages before apps when needed.

**Negative**

- Each package is another workspace in gates (`gate:quick`, `test`, `knip`).
- Duplicating app config in packages causes drift — prefer a single source of truth in the owning app.

## Alternatives considered

| Alternative | Why rejected |
| :--- | :--- |
| Shipped demo package in starter | Noise for forks; boundaries documented here instead. |
| Put shared code only at repo root | Violates dependency ownership; use `packages/*` workspaces. |
| No `packages/*` until many apps | Workspace layout already supports packages; rules needed before first extract. |

## AI

**Never change without human review**

- Loosening “no React/Next/next-intl in packages” without a new ADR.
- Moving app-only UI or Server Actions into `packages/*`.
- Putting locale message files in a shared package by default.

**Ask first**

- Creating the first `packages/<name>` workspace (run `bun adopt pkg` + checklist).
- Changing `package.json` `exports` map (breaking for all consumers).
- Extracting code used by only one app today.

**Safe to extend or add**

- New package when **two or more** workspaces need the same stable, framework-free contract.
- `workspace:*` dependency from apps after human-approved extraction.
- Tests and specs under `packages/<name>/specs/`.

## Related

- [docs/cli.md](../cli.md) — `bun pkg` for package workspaces
- [docs/architecture.md](../architecture.md)
- [docs/guides/new-workspace-checklist.md](../guides/new-workspace-checklist.md)
- [ADR-0005](./ADR-0005-scoped-cli.md) — scoped install commands
- [packages/README.md](../../packages/README.md)
