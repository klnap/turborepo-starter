---
name: implement-spec
description: Execute a technical specification from specs/, apps/[workspace]/specs/, or apps/[workspace]/src/modules/[module]/specs/ against acceptance criteria.
---

# Implement Spec

## 1. Locate the spec

Read the spec at the correct tier:

| Tier | Path |
| :--- | :--- |
| Global (monorepo) | `specs/[feature-name].md` |
| Workspace | `apps/[workspace]/specs/[feature-name].md` |
| Module | `apps/[workspace]/src/modules/[module-name]/specs/[feature-name].md` |
| Package | `packages/[package]/specs/[feature-name].md` |

If no spec exists for a complex feature, author one from [specs/TEMPLATE.md](../../../specs/TEMPLATE.md) before coding.

## 2. Understand

- Read root [AGENTS.md](../../../AGENTS.md) and workspace `AGENTS.md` if present.
- Read relevant [docs/architecture.md](../../../docs/architecture.md) sections.
- Check [docs/adr/README.md](../../../docs/adr/README.md) and any existing ADRs for constraints.
- Use [.agents/skills/INDEX.md](../INDEX.md) to load `tdd` if test-first.

## 3. Implement

- Follow Red-Green-Refactor per user story and acceptance criteria.
- Respect module boundaries (`src/modules/<name>/` via public `index.ts` only).
- Place code in the owning workspace; do not hoist app dependencies to root.

## 4. Test

- Add or update co-located `*.test.ts(x)` for logic changes.
- Run scoped tests: `bun ws <app> test`.
- For critical business logic / validation / security: `bun ws <app> test:mutation`.

## 5. Validate

```bash
bun ws <app> test           # unit tests
bun run gate:quick          # anti-slop (commit)
bun run gate:full           # before PR
```

See [docs/guides/change-impact.md](../../../docs/guides/change-impact.md) for change-type-specific checks.

## 6. Update documentation

- **Spec** — mark acceptance criteria done or update if behavior shifted.
- **docs/** — update commands, guides, or reference when user-facing behavior changes.
- **ADR** — add under `docs/adr/` or `apps/<app>/docs/adr/` only when a durable architectural decision was made (not for routine features). See [docs/adr/README.md](../../../docs/adr/README.md).
