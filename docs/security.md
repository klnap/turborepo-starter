# Security

Security controls implemented in this repository.

---

## Dependency & Supply Chain

| Control | Mechanism | Trigger |
| :--- | :--- | :--- |
| Lockfile integrity | `bun.lock` only; `preinstall` rejects npm/pnpm/yarn | Every install |
| CVE audit | `bun run security:audit` (`bun audit` with known ignores) | CI, `gate:full` |
| Trivy filesystem scan | `.github/workflows/security.yml` | Push, PR, weekly schedule |
| SPDX SBOM + Grype | `.github/workflows/sbom.yml` | Push, PR, weekly schedule |
| License compliance | `bun run licenses` (fails on GPL/AGPL) | `gate:quick`, `gate:full` |
| Dependency ownership | `bun run lint:deps` | Manual after dependency changes; `bun root doctor` |
| Renovate | `renovate.json` — scheduled dependency PRs | External bot |
| OpenSSF Scorecard | `.github/workflows/scorecard.yml` | Weekly, push |

---

## Static Analysis & Secrets

| Control | Mechanism | Trigger |
| :--- | :--- | :--- |
| CodeQL (SAST) | `.github/workflows/codeql.yml` | Push, PR, schedule |
| Gitleaks (staged) | `bun run gitleaks:staged` / `scripts/git/gitleaks.ts` | pre-commit, `gate:quick` |
| Gitleaks (workdir) | `bun run gitleaks:scan` | `gate:full`, pre-push |
| Pre-commit env guard | `scripts/git/security.ts` (.env files) | Git pre-commit hook |

---

## High-risk files (AI agents)

Changes to these files can break security, CI, or architecture silently. **Ask a human before editing** unless the task explicitly targets the file.

| File | Risk | Required before changing |
| :--- | :--- | :--- |
| `apps/web/src/proxies/security/security.ts` | CSP / security header regression | Human review |
| `apps/web/src/env.ts` | Env validation broken | Human review + `bun run gate:full` |
| `scripts/gate/pipelines.ts` | Silent CI drift | Sync `docs/testing.md` + `docs/ci-cd.md` |
| `apps/web/dependency-cruiser.config.mjs` | Architecture collapse | Review [ADR-0003](../apps/web/docs/adr/ADR-0003-module-barrel-boundaries.md) |
| `turbo.json` | Task discovery / cache bugs | Human review |
| `apps/web/next.config.ts` | Routing / i18n regressions | `bun run gate:full` |

Full agent workflow: [ai-development.md](./ai-development.md).

---

## Application Hardening

### HTTP security headers

Injected via the Next.js proxy chain (`src/proxies/security/security.ts`):

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera, microphone, geolocation disabled)

### Next.js configuration

- `poweredByHeader: false` — removes `X-Powered-By`
- Environment variables validated via `@t3-oss/env-nextjs` (`src/env.ts`) — no direct `process.env` in application code
- Input validation via Valibot schemas before server action execution

---

## CLI & Subprocess Safety

Scope CLI (`scripts/cli/process.ts`) and audit scripts spawn subprocesses with argv arrays (`Bun.spawn` or `spawnSync(command, args)`). No `eval`, no `sh -c` in application or audit code. Docker runner `CMD` uses shell only to expand build-time `APP_PATH`.

---

## CI Workflow Hardening

GitHub Actions workflows follow:

- `permissions: contents: read` (global default)
- `persist-credentials: false` on checkout
- Action pinning with full commit SHAs
- Scoped `permissions` overrides only where required (e.g. `security-events: write` for Trivy SARIF upload)

Details: [ci-cd.md](./ci-cd.md).

---

## Container Security

Docker image runs as non-root user `nextjs` (UID 1001). See [docker.md](./docker.md).

---

## Recommended Branch Protection (`main`)

- Require pull request with at least one approval
- Required status checks: CI, Playwright, CodeQL, Gitleaks, Trivy
- Require conversation resolution
- Require signed commits
- Do not allow bypassing
