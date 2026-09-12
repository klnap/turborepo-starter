# Audit scripts (`scripts/audit/`)

Repository health checks — **not** the same as `bun run security:audit` (CVE scan).

| File | Command / consumer | Purpose |
| :--- | :--- | :--- |
| `check-package-manager.mjs` | `preinstall` | Reject npm/pnpm/yarn |
| `dependency-ownership.ts` | `bun run lint:deps` | CLI entry — fails on root runtime deps |
| `lint-deps.ts` | imported by `doctor` | `collectDependencyOwnershipIssues()` |
| `env.ts` | `bun run lint:env` | Root/workspace env schema checks |
| `lint-env.ts` | (shared helpers) | env lint implementation |
| `repo.ts` | `audit-cli` | Drift audit logic |
| `repo-cli.ts` | `bun run audit:repo` | Standalone repo audit entry |
| `security-audit.ts` | gates | `bun audit` wrapper with ignores |

**Naming:** `lint:deps` runs `dependency-ownership.ts`. `lint-deps.ts` is the library — do not run it directly.
