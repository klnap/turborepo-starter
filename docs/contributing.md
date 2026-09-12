# Contributing

Standards for contributing to this repository.

---

## Monorepo Rules

1. **Bun only** — never use npm, yarn, or pnpm.
2. **Generated output** — build artifacts, reports, and temp files go in `.generated/`.
3. **Barrel exports** — import modules and components only via their public `index.ts`.

Architecture details: [architecture.md](./architecture.md).

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add checkout flow
fix: resolve hydration mismatch
docs: update deployment guide
chore: update dependencies
```

Enforced by `@commitlint/cli` and git hooks.

---

## Dependencies

Use explicit scope — **why:** [cli.md](./cli.md), [ADR-0005](./adr/ADR-0005-scoped-cli.md).

```bash
bun root add -d <package>     # repo tooling
bun ws web add <package>      # app dependency
bun pkg <name> add <package>  # package dependency
bun run lint:deps             # verify ownership after changes
```

Install dependencies in the workspace that uses them. Do not hoist app runtime deps to root.

---

## Tasks

Use scoped CLI for Turbo tasks:

```bash
bun root <task>
bun ws <app> <task>
bun pkg <name> <task>
```

Do not add a new CLI per tool. Add a `package.json` script + `turbo.json` task instead.

---

## Tooling

| What | Where |
| :--- | :--- |
| Reusable implementation | `scripts/*.ts`, `scripts/audit/` |
| Workspace-only scripts | `apps/<app>/scripts/` |
| Workspace configuration | `apps/<app>/*.config.ts` |
| Generated output | `<workspace>/.generated/<tool>/` |
| Versioned baselines | Next to tests in workspace (committed) |

Full model: [architecture.md — Tooling](./architecture.md#tooling-architecture).

---

## Testing

Code changes should include or update tests at the appropriate level:

- Logic changes → unit tests (`*.test.ts`)
- UI behavior → component tests or E2E
- Visual changes → review `bun ws web visual` output

Before opening a PR:

```bash
bun run gate:full
```

---

## Generated Files

Never commit contents of `.generated/` (gitignored). Exception: visual regression baselines in `*-snapshots/` directories next to specs.

---

## Security

- Do not bypass git hooks or CI checks
- Do not commit secrets (Gitleaks scans every push)
- Use validated env schemas — no raw `process.env` in application code
- Subprocess calls must use argv arrays, not shell strings

Details: [security.md](./security.md).

---

## Pull Requests

1. Run `bun run gate:full` locally
2. Ensure CI passes (CI, Playwright, security workflows)
3. Update documentation if behavior or commands change
4. Follow conventional commit format
