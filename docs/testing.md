# Testing

How quality is verified in this repository. Architecture overview: [architecture.md](./architecture.md).

---

## Test Levels

| Level | Tool | Command | Location |
| :--- | :--- | :--- | :--- |
| Unit & integration | Bun test | `bun root test` / `bun ws web test` | Co-located `src/**/*.test.ts(x)` |
| E2E | Playwright | `bun ws web test:e2e` | `apps/web/tests/e2e/` |
| Accessibility | Playwright + axe-core | `bun ws web test:a11y` | `tests/e2e/a11y.spec.ts` |
| Visual regression | Playwright + Storybook | `bun ws web visual` | `scripts/runners/visual.ts` |
| Mutation | Stryker + Bun | `bun ws web test:mutation` | `apps/web/stryker.config.mjs` |
| Architecture | dependency-cruiser | `bun ws web boundaries` | `dependency-cruiser.config.mjs` |
| Dead code | Knip | `bun root knip` | Per-workspace |
| Synthetic monitoring | Checkly | `bun run gate:quickly:test` / `checkly:deploy` | `apps/web/checkly/` |

---

## Checkly (synthetic monitoring)

Production uptime checks as TypeScript ([Monitoring as Code](https://www.checklyhq.com/docs/cli/)).

```bash
bun run gate:quickly:test      # run checks locally
bun run gate:quickly:deploy    # deploy to Checkly cloud
```

Config: `apps/web/checkly.config.ts`. Checks: `apps/web/checkly/*.check.ts`. Guide: [apps/web/checkly/README.md](../apps/web/checkly/README.md).

CI: `.github/workflows/checkly.yml` (manual dispatch; requires `CHECKLY_ENABLED=true` and secrets).

---

## Unit & Integration (Bun)

Native `bun test` — no Jest or Vitest.

```bash
bun root test
bun ws web test
```

Watch mode and coverage are workspace-only scripts (no Turbo task):

```bash
cd apps/web && bun run test:watch
cd apps/web && bun run test:coverage
```

Tests live next to source files.

---

## Mutation Testing

Stryker mutates source code and verifies that the Bun test suite catches each change. Workspace-scoped: only workspaces with `test:mutation` in `package.json` run under `bun root test:mutation`.

```bash
bun root test:mutation          # all opt-in workspaces
bun ws web test:mutation        # single workspace
```

| Artifact | Location | Git |
| :--- | :--- | :--- |
| Config | `apps/web/stryker.config.mjs` | committed |
| HTML report | `apps/web/.generated/stryker/report.html` | ignored |
| JSON report | `apps/web/.generated/stryker/mutation-report.json` | ignored |
| Incremental cache | `apps/web/.generated/stryker/incremental.json` | ignored |
| Sandbox | `apps/web/.generated/stryker/sandbox/` | ignored |

**When to run:** after changing critical business logic, validation, security rules, or tests that guard them. Not required for cosmetic UI-only changes.

**CI:** `.github/workflows/mutation.yml` — weekly schedule + manual `workflow_dispatch`. Not part of `ci.yml` (too slow for every PR).

Stack: `@stryker-mutator/core` + `@hughescr/stryker-bun-runner` (Bun test runner plugin).

---

## E2E (Playwright)

```bash
bun root test:e2e
bun ws web test:e2e
```

Interactive UI mode (workspace-only):

```bash
cd apps/web && bun run test:e2e:ui
```

Config: `apps/web/playwright.config.ts`. Base URL: `http://127.0.0.1:3000` (requires built or running app for non-Storybook tests).

CI runs Chromium, Firefox, and WebKit in matrix (`.github/workflows/playwright.yml`) via `bun ws web test:e2e -- --project=<browser>`.

**Local browser install:** if tests fail with “Executable doesn't exist”, run `bun ws web test:e2e:install` (or `bun ws web test:e2e:install -- --with-deps webkit` for one engine). `bun root doctor` reports missing browsers with the exact fix command.

Reports on failure: `apps/web/.generated/playwright-report/`.

---

## Accessibility

```bash
bun root test:a11y
bun ws web test:a11y
```

Uses `@axe-core/playwright` against the running application.

---

## Visual Regression

Storybook component screenshots via Playwright `toHaveScreenshot`.

| Artifact | Location | Git |
| :--- | :--- | :--- |
| Spec | `apps/web/tests/e2e/visual-storybook.spec.ts` | committed |
| Baselines | `visual-storybook.spec.ts-snapshots/` | committed |
| Diffs, reports | `apps/web/.generated/` | ignored |

```bash
bun root visual                  # all workspaces with visual setup
bun ws web visual                # single workspace
bun ws web visual --update       # regenerate baselines — review diff, then commit
```

Depends on `build-storybook` (Turbo `dependsOn`). Static Storybook output: `apps/web/.generated/storybook-static/`.

CI: `.github/workflows/visual-regression.yml` on PRs touching UI files. Baseline updates: `visual-regression-update-baseline.yml` (manual `workflow_dispatch`).

---

## Lighthouse & Coupling Graph

Root tooling, workspace config, workspace output:

```bash
bun root lighthouse
bun ws web lighthouse              # → apps/web/.generated/lighthouse/

bun root coupling-graph
bun ws web coupling-graph          # → apps/web/.generated/coupling-graph/
```

---

## Verification Gates

Composite scripts (not Turbo tasks). Source of truth: `scripts/gate/pipelines.ts`.

| Command | When | Steps (summary) | Typical time |
| :--- | :--- | :--- | :--- |
| `bun run gate:quick` | pre-commit | Gitleaks staged, Biome fix, Oxlint, i18n, env, architecture, typecheck, knip, licenses | ~1 min |
| `bun run gate:push` | pre-push | Security audit, unit tests, build, gitleaks history, a11y, E2E smoke (Chromium) | ~1–2 min |
| `bun run gate:ci` | GitHub `ci.yml` | `gate:quick` + `gate:push` verify block (anti-slop then verify) | ~2–5 min |
| `bun run gate:full` | manual / `GATE_FULL=1 git push` | `gate:ci` + gitleaks history/workdir, Trivy, SBOM/Grype, CLI tests, docs:generate, a11y, E2E (3 browsers), visual regression, bundle analysis, Lighthouse | varies |

`gate:push` intentionally skips anti-slop — pre-commit already ran `gate:quick`. After `git commit --no-verify`, run `bun run gate:quick` manually before push.

Dependency ownership (`bun run lint:deps`) is **not** part of gate pipelines — run after dependency changes. `bun root doctor` also reports ownership issues.

Turbo tasks (`test`, `build`) always need scope: `bun run gate:quick`, `bun run gate:quick`.

---

## CI Testing

| Workflow | Tests run |
| :--- | :--- |
| `ci.yml` | `bun run gate:ci` |
| `mutation.yml` | Stryker mutation testing (weekly + manual) |
| `playwright.yml` | E2E + a11y (3 browsers) |
| `visual-regression.yml` | Storybook visual regression |
| `checkly.yml` | Checkly deploy (manual; opt-in via `CHECKLY_ENABLED`) |

Details: [ci-cd.md](./ci-cd.md).

---

## Storybook

Component workbench used for development and visual regression.

```bash
bun ws web storybook
bun ws web build-storybook
```

Config: [apps/web/.storybook/README.md](../apps/web/.storybook/README.md).

Output: `apps/web/.generated/storybook-static/`.
