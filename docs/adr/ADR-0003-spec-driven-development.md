# ADR-0003 — Spec-Driven Development (Three-Tier Specs)

Status: accepted  
Date: 2026-08-27

## Context

AI agents and human contributors need a single place for **intended behavior** before code changes. Ad-hoc prompts and README edits do not scale; neither do ADRs for routine features (ADRs record durable *decisions*, not every feature).

## Decision

Use **three-tier specs** for non-trivial work:

| Tier | Path | Scope |
| :--- | :--- | :--- |
| 1 | `specs/<feature>.md` | Monorepo-wide infra, CI, shared tooling |
| 2 | `apps/<app>/specs/<feature>.md` | App routing, layouts, workspace-wide behavior |
| 3 | `apps/<app>/src/modules/<module>/specs/<feature>.md` | Domain features, module UI, module actions |

Workflow: spec → implement (`implement-spec` skill) → tests → `gate:quick` → ADR only if a **new durable decision** emerges.

Scratchpads live only in `.generated/specs/` (git-ignored).

## Consequences

**Positive**

- Agents load one spec instead of inferring behavior from diffs.
- Acceptance criteria map directly to tests and gates.
- Tier-3 specs co-locate with modules they describe.

**Negative**

- Upfront writing cost for small fixes (specs skipped for typos and obvious one-line fixes per [specs/README.md](../../specs/README.md)).

## Alternatives considered

| Alternative | Why rejected |
| :--- | :--- |
| ADRs for every feature | ADRs are for decisions, not behavior; they become noisy. |
| Issues-only tracking | No in-repo source of truth for agents; poor offline/clone workflow. |
| Single `docs/features/` tree | Loses workspace vs module scoping; harder for Turbo boundaries. |

## AI

**Never change without human review**

- Deleting the three-tier path convention (`specs/`, `apps/<app>/specs/`, `modules/.../specs/`).
- Committing scratchpads from `.generated/specs/` (must stay git-ignored).
- Replacing specs with ADRs for routine feature behavior.

**Ask first**

- Moving a spec to a different tier (e.g. module spec → workspace spec).
- Adding mandatory specs for trivial fixes (typos, formatting) — default is skip per `specs/README.md`.
- Changing `specs/TEMPLATE.md` required sections.

**Safe to extend or add**

- New tier-1/2/3 spec files for non-trivial features before implementation.
- Acceptance criteria and test mapping inside an existing spec.
- Linking to [docs/commands.md](../commands.md) instead of duplicating command tables.

## Related

- [specs/README.md](../../specs/README.md), [specs/TEMPLATE.md](../../specs/TEMPLATE.md)
- [docs/guides/feature-development.md](../guides/feature-development.md)
- Example tier-3 module layout (when used): `apps/<app>/src/modules/README.md` — starter: [apps/web/src/modules/README.md](../../apps/web/src/modules/README.md)
