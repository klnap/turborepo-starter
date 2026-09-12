# CI/CD

GitHub Actions workflows in `.github/workflows/`.

---

## Workflows

| Workflow | Trigger | Purpose |
| :--- | :--- | :--- |
| `ci.yml` | Push/PR to main, master, develop; manual | Lint, types, oxlint, knip, boundaries, audit, unit tests, build |
| `playwright.yml` | Push/PR; manual | E2E + a11y (Chromium, Firefox, WebKit) |
| `visual-regression.yml` | PR (UI paths); manual | Storybook visual regression |
| `mutation.yml` | Weekly schedule; manual | Stryker mutation testing (opt-in workspaces) |
| `visual-regression-update-baseline.yml` | Manual dispatch | Regenerate and commit visual baselines |
| `security.yml` | Push/PR; weekly schedule; manual | Trivy filesystem CVE scan |
| `codeql.yml` | Push/PR; schedule; manual | CodeQL static analysis |
| `gitleaks.yml` | Push/PR | Secret detection |
| `sbom.yml` | Push/PR; weekly schedule; manual | SPDX SBOM generation + Grype scan |
| `scorecard.yml` | Schedule; push | OpenSSF Scorecard |
| `bundle-analysis.yml` | PR to main/develop; manual | Next.js bundle size analysis |
| `checkly.yml` | Manual dispatch | Deploy Checkly synthetic checks (if enabled) |

---

## CI Pipeline (`ci.yml`)

Job: **Code Quality & Verification Gates**

1. Checkout (shallow, `persist-credentials: false`)
2. Setup Bun 1.4.0, Node 24.x
3. Restore `.turbo` cache
4. `bun install --frozen-lockfile`
5. `bun run gate:ci` — lint, format, oxlint, typecheck, i18n, env, licenses, knip, `bun audit`, unit tests, build (parallel quick checks, then sequential CI steps; same as this workflow)

Environment: `SKIP_ENV_VALIDATION=1`, `CI=true`. Optional Turbo remote cache: `TURBO_TOKEN`, `TURBO_TEAM`.

---

## Workspace capability discovery

Specialized workflows discover opt-in workspaces via `scripts/shared/workspace-capabilities.ts` and `bun scripts/gate/adapters/gh-matrix.ts` (no hardcoded `apps/web` in workflow jobs):

| Matrix mode | Workflows |
| :--- | :--- |
| `e2e-browsers` | `playwright.yml` |
| `visual` | `visual-regression.yml`, `visual-regression-update-baseline.yml` |
| `next-bundle` | `bundle-analysis.yml` |
| `checkly` | `checkly.yml` |

After `bun root adopt apps/<name>`, add capability scripts (e.g. `test:e2e`, `visual`) — CI picks up the workspace automatically.

---

## Playwright (`playwright.yml`)

Matrix: discovered E2E workspaces × `chromium`, `firefox`, `webkit`.

1. Install dependencies
2. `bun ws <workspace> test:e2e:install -- --with-deps <browser>`
3. `bun root build`
4. `bun ws <workspace> test:e2e -- --project=<browser>`

On failure: uploads `apps/<workspace>/.generated/playwright-report/` (7-day retention).

---

## Visual Regression (`visual-regression.yml`)

Triggered on PRs touching UI components, Storybook config, visual spec, or tooling paths.

1. Discover visual workspaces
2. `bun ws <workspace> test:e2e:install -- --with-deps chromium`
3. `bun ws <workspace> visual`

On failure: uploads `apps/<workspace>/.generated/test-results/` and `playwright-report/`.

Local `gate:full` / `bun ws <workspace> visual` pass `--update-snapshots=changed` — new Storybook stories write baselines instead of failing; existing baselines still fail on pixel drift. GitHub CI (`CI=true`) compares strictly. Regenerate all: `bun ws <workspace> visual -- --update`.

Baseline update workflow commits snapshot changes via `git-auto-commit-action`.

---

## Security Scanning

### Trivy (`security.yml`)

Filesystem scan with `trivy.yaml` config. Fails on HIGH/CRITICAL. Uploads SARIF to GitHub Code Scanning.

### CodeQL (`codeql.yml`)

Semantic analysis for JavaScript/TypeScript.

### Gitleaks (`gitleaks.yml`)

Scans for secrets and API keys in commits.

### SBOM (`sbom.yml`)

Generates SPDX SBOM via Anchore and scans with Grype (fails on HIGH+).

### Scorecard (`scorecard.yml`)

OpenSSF supply chain posture evaluation.

---

## Local CI Scripts

| Command | Layer | What runs | When |
| :--- | :--- | :--- | :--- |
| `bun run gate:quick` | **Anti-slop** | oxlint, biome, types, boundaries, env, i18n, licenses, gitleaks staged | pre-commit (~1 min) |
| `bun run gate:push` | **Verify** | knip, audit, tests, build, gitleaks history, a11y, E2E Chromium | pre-push (~1–2 min) |
| `bun run gate:ci` | Anti-slop + verify | both layers (GitHub `ci.yml`) | CI / local parity |
| `bun run gate:full` | Full audit | `gate:ci` + security, visual, Lighthouse, bundle | manual / `GATE_FULL=1` |
| `bun run ci:*` | — | aliases for `gate:*` | |

Hooks: pre-commit → `gate:quick`, pre-push → `gate:push`. See [ai-development.md](./ai-development.md#validation-ladder-ai-assisted-coding).

Security CLIs (Trivy, Syft, Grype, Gitleaks) auto-download to `.generated/bin` when missing from `PATH`. Skip with `SKIP_TRIVY=1`, `SKIP_SBOM=1`, or `SKIP_GITLEAKS=1`.

Playwright: local `gate:full` installs browser binaries only — **no sudo**, no `--with-deps`. E2E runs on **Chromium** by default (works on macOS, Windows, WSL without root). Firefox/WebKit run on GitHub (`playwright.yml`); opt in locally with `GATE_E2E_ALL_BROWSERS=1` if system libraries are already present.

**Not in local gates** (GitHub-only or scheduled): CodeQL, OpenSSF Scorecard, Checkly deploy, mutation testing (weekly). Run `bun root test:mutation` manually when needed.

Pipelines live in `scripts/gate/pipelines.ts`. Extend by adding turbo tasks or Listr steps there.

---

## Caching

- **Turbo**: `.turbo/` directory (CI restores by OS + commit SHA)
- **Next.js**: `apps/web/.next/cache` (bundle-analysis workflow)
- **Bun**: `bun install --frozen-lockfile` on every run

---

## Artifacts

Failed test workflows upload reports from `apps/web/.generated/` (gitignored locally, ephemeral in CI).

---

## Permissions

Default: `contents: read`. Write permissions only where needed (visual baseline update, Scorecard, Trivy SARIF upload).

Security details: [security.md](./security.md).
