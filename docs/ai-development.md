# AI-assisted development

How agents and humans should work in this repository. **Constraints** live in [AGENTS.md](../AGENTS.md); this doc is the **workflow map**.

---

## Start here (60 seconds)

1. Read root [AGENTS.md](../AGENTS.md) Chapter 7 entrypoint table.
2. Identify the **app workspace** you touch (`apps/<app>/` — list: [apps/README.md](../apps/README.md)). Read its `AGENTS.md` and `docs/adr/README.md` when present.
3. Load **one** skill from [.agents/skills/INDEX.md](../.agents/skills/INDEX.md) matching the task.
4. For features: find or write a **spec** before coding ([specs/README.md](../specs/README.md)).
5. Validate: `gate:quick` (commit) → `gate:push` (push) → `gate:full` (optional deep audit).

The starter currently includes **`web`** under `apps/web/` as a reference Next.js workspace. Another app replaces or sits beside it — root docs still use `apps/<app>/`, not `apps/web/` as universal truth.

---

## Push vs pull request (GitHub)

| | **Local `git push`** | **Pull request on GitHub** |
| :--- | :--- | :--- |
| **Your machine** | pre-commit → `gate:quick`; pre-push hook → `gate:push` | — |
| **What runs** | `gate:push`: audit, tests, build, gitleaks history, a11y + E2E smoke (Chromium) | `ci.yml` → `gate:ci` (quick + verify). **Plus** separate workflows: Playwright (3 browsers), visual regression, security, gitleaks, bundle analysis, … |
| **`gate:full`** | Not automatic — run manually or `GATE_FULL=1 git push` | Not the PR gate — PR uses `gate:ci` + specialized workflows, not one `gate:full` job |

Opening a PR does **not** run `gate:push`. Pushing to a branch runs GitHub Actions (`ci.yml` on push/PR), which is **`gate:ci`**, not the local pre-push hook.

---

## Documentation layers

| Layer | When to read | Location |
| :--- | :--- | :--- |
| **AGENTS.md** | Always — rules and boundaries | Root, `apps/*`, `packages/*` |
| **README** | Onboarding | Root, workspaces |
| **Spec** | Before implementing behavior | Tier 1–3 per [specs/README.md](../specs/README.md) |
| **ADR (monorepo)** | Cross-workspace architecture | [docs/adr/README.md](./adr/README.md) |
| **ADR (app)** | App-specific architecture | `apps/<app>/docs/adr/` |
| **docs/*.md** | How things work (reference) | `docs/` |
| **Folder README** | Local conventions | Under the workspace you edit (e.g. `src/modules/README.md`) |
| **Skills** | Procedure for a task type | `.agents/skills/` |

Do not duplicate command lists here — [docs/commands.md](./commands.md) and `package.json` are authoritative.

---

## Monorepo ADRs (root only)

| ADR | Topic |
| :--- | :--- |
| [ADR-0001](./adr/ADR-0001-bun-package-manager.md) | Bun only |
| [ADR-0002](./adr/ADR-0002-turborepo-orchestration.md) | Turbo task graph |
| [ADR-0003](./adr/ADR-0003-spec-driven-development.md) | Three-tier specs |
| [ADR-0004](./adr/ADR-0004-package-extraction-boundaries.md) | When to add `packages/*` |
| [ADR-0005](./adr/ADR-0005-scoped-cli.md) | Scoped CLI — explicit install/task scope |

Full index: [docs/adr/README.md](./adr/README.md). App-specific ADRs are **not** listed here.

---

## Scoped CLI (agents)

**Always** use explicit scope — never bare `bun add` at repo root for app libraries.

| Intent | Command |
| :--- | :--- |
| Repo tooling | `bun root add -d <pkg>` |
| App dependency | `bun ws <app> add <pkg>` |
| App task | `bun ws <app> <task>` (task ∈ `turbo.json` ∩ `package.json`) |
| List app tasks | `bun ws <app>` (no task arg) |
| Gates | `bun run gate:quick` / `gate:push` / `gate:full` |

Full rationale and troubleshooting: [cli.md](./cli.md).

---

## Application workspace (`apps/<app>/`)

For each app you work in:

1. `apps/<app>/AGENTS.md` — layout, boundaries, quality gates.
2. `apps/<app>/docs/adr/README.md` — durable decisions for **that** app (i18n, proxy, modules, etc.).
3. `bun run gate:quick` / `bun ws <app> test` — scoped validation.
4. **Web RSC:** [apps/web/docs/rsc.md](../apps/web/docs/rsc.md) — `cache()` and `use()` rules.

**Starter example:** `web` → [apps/web/docs/adr/README.md](../apps/web/docs/adr/README.md), [apps/web/src/modules/README.md](../apps/web/src/modules/README.md). If you remove `web`, add ADRs and folder READMEs under your replacement app the same way.

---

## Feature workflow

```text
Tier spec → implement-spec skill (optional) → co-located tests → bun run gate:quick test
→ gate:quick → ADR in correct scope (root vs apps/<app>) if durable decision → update docs
```

See [guides/feature-development.md](./guides/feature-development.md).

---

## Validation ladder (AI-assisted coding)

Three layers — each catches what the previous cannot:

| Layer | When | Command | Catches |
| :--- | :--- | :--- | :--- |
| **Anti-slop** | every commit | `gate:quick` (hook) | bad types, oxlint rules, boundaries, knip, format, secrets in staged files |
| **Verify** | every push | `gate:push` (hook) | dependency audit, broken tests, failed build, E2E/a11y smoke |
| **Full audit** | optional | `gate:full` | security scans, visual, Lighthouse, bundle (local only unless you run it) |

GitHub `ci.yml` runs `gate:ci` (= anti-slop + verify in one job). Pre-push skips re-running anti-slop — commit hook already ran it. After `git commit --no-verify`, run `gate:quick` manually before push.

**High-risk files:** edits to CSP, env schema, gates, dependency-cruiser, `turbo.json`, or `next.config.ts` need human review — see [security.md](./security.md#high-risk-files-ai-agents).

| Step | Command |
| :--- | :--- |
| Wiring | `bun root doctor` |
| Scoped | `bun run gate:quick`, `bun ws <app> test` |
| Anti-slop (commit) | `bun run gate:quick` |
| Verify (push) | `bun run gate:push` |
| Full (optional) | `bun run gate:full` |
| CI parity (local) | `bun run gate:ci` |

---

## Anti-patterns for agents

- Assuming `apps/web` always exists — read [apps/README.md](../apps/README.md) first
- Deep imports (`@/modules/foo/pages/...`, `@/components/button/button.tsx`)
- `process.env` in app code
- App ADRs in root `docs/adr/` (use `apps/<app>/docs/adr/`)
- Specs or ADRs for every typo fix
- Loading entire skill trees — one skill per task
- Hoisting app dependencies to root `package.json`
- Bare `bun add` at repository root for workspace libraries — use `bun ws` / `bun pkg` ([cli.md](./cli.md))
