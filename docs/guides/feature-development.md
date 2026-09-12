# Feature Development Workflow

Lean workflow for building features on this starter. Commands listed here are verified against the scoped CLI (`package.json` scripts ∩ `turbo.json` tasks).

## 1. Understand

- Read [README.md](../../README.md) for onboarding context.
- Read [architecture.md](../architecture.md) for structure and ownership.

## 2. Discover instructions

- Root [AGENTS.md](../../AGENTS.md) — global constraints.
- Workspace `apps/<app>/AGENTS.md` — app-specific rules.
- [.agents/skills/INDEX.md](../../.agents/skills/INDEX.md) — load one root skill if needed.
- Workspace skills: `apps/<app>/.agents/skills/INDEX.md` (e.g. [apps/web/.agents/skills/INDEX.md](../../apps/web/.agents/skills/INDEX.md))

## 3. Inspect architecture

- Identify owning workspace: root, `apps/<app>`, or `packages/<pkg>`.
- Module code: `apps/<app>/src/modules/<module>/` (import via barrel only) — [modules/README.md](../../apps/web/src/modules/README.md)
- Shared UI: `src/components/` — [components/README.md](../../apps/web/src/components/README.md)
- Routing only: `src/app/` — [AGENTS.md](../../apps/web/AGENTS.md) §6

## 4. Find or create a spec

- Choose tier per [specs/README.md](../../specs/README.md).
- Copy [specs/TEMPLATE.md](../../specs/TEMPLATE.md).
- See [specs/examples/example-workspace-health-panel.md](../../specs/examples/example-workspace-health-panel.md) for a filled reference (not a real feature).
- For complex work, use skill `implement-spec`.

## 5. Check ADRs

- Read [docs/adr/README.md](../adr/README.md).
- Search `docs/adr/` and `apps/<app>/docs/adr/` for existing decisions.

## 6. Implement

- Respect client/server boundaries and validated env schemas.
- Co-locate tests with source (`*.test.ts`).

## 7. Test

```bash
bun ws web test                    # unit tests
bun ws web test:e2e                # if user journeys changed
bun ws web test:mutation           # critical logic only
```

Workspace-only scripts (not in `bun ws`):

```bash
cd apps/web && bun run test:watch
cd apps/web && bun run test:coverage
cd apps/web && bun run test:e2e:ui
```

## 8. Scoped checks

```bash
bun run gate:quick
bun ws web boundaries              # if imports/modules changed
```

## 9. Repository checks

```bash
bun run gate:quick
bun run gate:full                  # optional deep audit
```

## 10. Review architectural impact

- If a durable decision changed → add ADR (see [adr/README.md](../adr/README.md)).
- If behavior changed → update spec acceptance criteria.

## 11. Update docs

- Commands changed → [commands.md](../commands.md).
- Change type → [change-impact.md](./change-impact.md).

## 12. ADR if required

Only when the decision outlives the feature. Not for routine implementation details.
