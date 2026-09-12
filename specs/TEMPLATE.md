# [Feature Name] Technical Specification

## 1. Problem Statement

Describe the user problem and motivation from the user/business perspective.

## 2. Solution Overview

High-level summary of the proposed solution architecture and user experience.

## 3. Scope

**In scope:**

- [What this spec covers]

**Out of scope:**

- [What will NOT be built in this iteration]

## 4. User Stories & Acceptance Criteria

1. As a [actor], I want [capability], so that [business value].
   - **Acceptance Criteria**: [Concrete verifiable check]

## 5. Architectural & Implementation Decisions

- **Affected Workspaces / Modules**: [e.g., `apps/web/src/modules/<module-name>`]
- **Contracts & Interfaces**: [TypeScript signatures, Valibot schemas]
- **State Management & Data Flow**: [Server actions, RSC boundaries]
- **Error Handling**: [Safe sanitization, fallback UI]

**Architectural Impact:**

- [ ] None — fits existing architecture
- [ ] Uses existing architecture — no new ADR
- [ ] Requires ADR — document in `docs/adr/` or `apps/<app>/docs/adr/` before merge

## 6. Validation Commands

Commands to run after implementation:

```bash
bun run gate:quick
bun ws web test
# bun ws web test:e2e    # if user journeys changed
# bun run gate:quick
# bun run gate:full      # optional deep audit
```

## 7. Testing Decisions

- **Unit tests**: [paths, scenarios]
- **E2E / Playwright**: [user journeys, if any]
- **Mutation** (`test:mutation`): [only if critical logic]

## 8. Documentation Impact

- [ ] No doc updates needed
- [ ] Update `docs/commands.md` / `docs/testing.md`
- [ ] Update workspace `AGENTS.md`
- [ ] Other: [list]
