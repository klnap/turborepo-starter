# Example — Workspace Health Panel (reference only)

> **This is an example spec**, not a planned product feature. Copy structure from [TEMPLATE.md](../TEMPLATE.md) for real work.

## 1. Problem Statement

Developers need a read-only dashboard showing whether a workspace passes local quality gates before opening a PR.

## 2. Solution Overview

Add a `/health` route in an app workspace that surfaces the latest `gate:quick` status from documented commands (no live shell execution in production).

## 3. Scope

**In scope:**

- Display pass/fail for documented validation commands
- Link to [docs/commands.md](../../docs/commands.md) and [docs/testing.md](../../docs/testing.md)

**Out of scope:**

- Running gates from the browser in production
- Cross-workspace aggregation
- Persisting historical results

## 4. User Stories & Acceptance Criteria

1. As a developer, I want to see which validation commands apply to my workspace, so that I know what to run before a PR.
   - **Acceptance Criteria**: Page lists `bun run gate:quick`, `test`, and `bun run gate:quick` with descriptions from docs.

## 5. Architectural & Implementation Decisions

- **Affected Workspaces / Modules**: `apps/<workspace>/` (tier-2); optional module under `src/modules/health/`
- **Contracts & Interfaces**: Static content or build-time generated manifest — no arbitrary shell from RSC
- **State Management & Data Flow**: Server Component; no client secrets

**Architectural Impact:**

- [x] None — fits existing architecture
- [ ] Uses existing architecture — no new ADR
- [ ] Requires ADR

## 6. Validation Commands

```bash
bun run gate:quick
bun ws web test
bun run gate:quick
```

## 7. Testing Decisions

- **Unit tests**: Optional — pure formatting helpers only
- **E2E / Playwright**: Optional smoke if route is added
- **Mutation**: Not required (documentation-only surface)

## 8. Documentation Impact

- [ ] No doc updates needed
- [x] Update `docs/commands.md` / `docs/testing.md` if new commands are introduced
- [ ] Update workspace `AGENTS.md`
- [ ] Other
