# New Workspace Checklist

Use after creating `apps/<name>` or `packages/<name>` with an external generator, then integrate with the monorepo.

**Scoped CLI:** all installs and tasks use `bun root` / `bun ws` / `bun pkg` — [cli.md](../cli.md).

## 1. Integrate tooling

```bash
bun root adopt apps/<name> --dry-run
bun root adopt apps/<name>              # interactive tooling picker (TTY)
bun root install
bun root doctor
```

`adopt` adds missing `turbo.json`, optional scripts, engines, and AI-ready docs. In a terminal, **Space** toggles optional tooling (visual, e2e, storybook, lighthouse) before apply. `--yes` skips the picker (core only).

- **`AGENTS.md` missing** — creates full template (links to [cli.md](../cli.md))
- **`AGENTS.md` present** (e.g. Next.js generator) — **appends** monorepo section without removing framework rules
- **`specs/README.md` missing** — creates pointer

It does not scaffold apps or overwrite existing scripts, dependencies, or configs.

## 2. Required files

| Item | App (`apps/<name>/`) | Package (`packages/<name>/`) |
| :--- | :--- | :--- |
| `package.json` | Yes | Yes |
| `turbo.json` with `extends: ["//"]` | Yes | Yes |
| Workspace name in root `package.json` workspaces | Auto via `apps/*` / `packages/*` | Auto |

## 3. Recommended for AI-ready workspaces

| Item | Purpose |
| :--- | :--- |
| `AGENTS.md` | Workspace-specific rules (inherit root [AGENTS.md](../../AGENTS.md)); `adopt` scaffolds a starter with [cli.md](../../cli.md) links |
| `specs/README.md` | Pointer to tier-2 specs |
| `specs/<feature>.md` | When building features |
| `docs/adr/` | Only when you record app/package ADRs |
| `.env.example` + validated `env.ts` | If app uses env vars |
| Co-located `*.test.ts` | Unit tests |

Copy patterns from `apps/web/` — do not copy product code.

## 4. Turbo tasks

Every `bun ws <name> <task>` command requires:

1. Script in workspace `package.json`
2. Matching key in root `turbo.json`

Verify: `bun ws <name>` lists available tasks.

## 5. CI

CI steps: extend `scripts/gate/pipelines.ts`. See [ci-cd.md](../ci-cd.md).

GitHub workflows use `scripts/gate/adapters/gh-matrix.ts` for capability discovery.

| Workflow | Discovery | Notes |
| :--- | :--- | :--- |
| `ci.yml` | `ci.yml` pipeline | Repo-wide |
| `playwright.yml` | `e2e-browsers` matrix | Per workspace × browser |
| `visual-regression.yml` | `visual` matrix | Per workspace |
| `bundle-analysis.yml` | `next-bundle` matrix | Per Next.js app |
| `checkly.yml` | `checkly` matrix | Per Checkly workspace |
| `mutation.yml` | Turbo `test:mutation` | Opt-in workspaces |

After `bun root adopt`, add capability scripts (`test:e2e`, `visual`, …) and optional `apps/<name>/ci/`.

## 6. Validate

```bash
bun ws <name> dev
bun run gate:quick
bun ws <name> test
bun ws <name> build
bun run gate:quick
```

## 7. Documentation

- Add workspace to [commands.md](../commands.md) when it has distinct tasks.
- Document deployment in [deployment.md](../deployment.md) if applicable.
