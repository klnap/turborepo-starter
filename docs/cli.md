# Scoped CLI — how and why

This repository does not treat the monorepo as “one big Node project.” Every dependency and every task has an **owner**: root, a specific app, or a specific package. The scoped CLI makes that ownership **explicit in every command** so humans and AI agents install and run work in the right place.

**Decision record:** [ADR-0005](./adr/ADR-0005-scoped-cli.md).  
**Command tables:** [commands.md](./commands.md) (tables only — do not duplicate here).  
**Task graph:** [turborepo.md](./turborepo.md).

### Documentation split (maintainers)

| Document | Owns | Do not put here |
| :--- | :--- | :--- |
| **cli.md** (this file) | Why scoped CLI exists, mental model, ownership, workflows, troubleshooting, agent rules | Long command tables |
| **commands.md** | Command tables, flags, outputs, per-workspace script lists | Narrative “why” (link here instead) |

When you change CLI behavior, update **cli.md**. When you add/rename a script or Turbo task, update **commands.md** (and `turbo.json` / `package.json`).

---

## Why not plain `bun add` or `bun run`?

| Problem | What goes wrong | Scoped CLI answer |
| :--- | :--- | :--- |
| Root `bun add next` | Framework lands in root `package.json`; `lint:deps` fails; wrong install graph | `bun ws web add next` |
| `cd apps/web` then forget where you are | Next `bun add` hits wrong workspace after `cd ..` | `bun ws web add …` — scope in the command |
| `bun run dev` at repo root | No root dev server — script missing or wrong target | `bun ws web dev` |
| Script in `package.json` but not `turbo.json` | `bun ws web <task>` does not list it — looks “broken” | Intersection is intentional; use `cd apps/web && bun run …` for local-only scripts |
| `turbo run test` without filter | Runs all workspaces — slow, unclear intent | `bun ws web test` or `bun root test` |

The CLI is not ceremony. It is how we keep **dependency ownership**, **Turbo caching**, and **quality gates** aligned.

---

## Mental model — four layers

Think in four questions. Only the first is the scoped CLI’s job; the rest are separate systems you should not confuse.

```text
WHERE  →  bun root | bun ws | bun pkg     (scripts/cli/)
WHEN   →  turbo run, dependsOn, cache     (turbo.json)
WHAT   →  script name in package.json     (per workspace)
HOW    →  Next, Playwright, Biome, …      (tools + scripts/*.ts)
```

```text
bun ws web build
    →  turbo run build --filter=./apps/web
        →  apps/web/package.json "build": "next build"
            →  Next.js
```

**Quality policy** (which checks run on commit vs push vs PR) is a fifth layer — **gates** — not part of `bun ws`:

```text
bun run gate:quick   # anti-slop (pre-commit)
bun run gate:push    # verify: tests, build, E2E smoke (pre-push)
bun run gate:ci      # GitHub Actions job
bun run gate:full    # optional deep audit
```

See [ai-development.md](./ai-development.md#validation-ladder-ai-assisted-coding) and [ci-cd.md](./ci-cd.md).

---

## The three scopes

### `bun root` — repository

Use for:

- Installing **monorepo tooling** at root: `bun root install`, `bun root add -d turbo`
- Running a Turbo task **across all workspaces**: `bun root test`, `bun root build`, `bun run gate:quick`
- Repository operations: `bun root doctor`, `bun root adopt apps/admin`, `bun adopt ws cms`, `bun root audit`

Root `package.json` rules:

- **No `dependencies`** — runtime deps belong in apps/packages.
- **`devDependencies` only** — CI, lint, Turbo, gate scripts, shared tooling.
- Forbidden in root devDeps: `react`, `next`, `tailwindcss`, etc. (`scripts/audit/lint-deps.ts`).

```bash
bun root install
bun root add -d knip
bun run gate:quick
bun root doctor
```

### `bun ws <app>` — one application

Use for everything that belongs to `apps/<app>/`:

```bash
bun ws web dev
bun ws web add zod
bun ws web remove zod
bun run gate:quick
bun ws web test:e2e
```

`<app>` is the **folder name** under `apps/` (e.g. `web`), not necessarily the npm `name` field — the CLI resolves via workspace discovery.

List tasks available through Turbo for that app:

```bash
bun ws web
```

Output = intersection of `turbo.json` task keys and `apps/web/package.json` scripts.

### `bun pkg <name>` — one shared package

Same as `bun ws`, but for `packages/<name>/`. Use when you add shared libraries:

```bash
bun pkg ui add clsx
bun pkg ui test
bun pkg ui build
```

If you type `bun pkg web` but `web` is an app, the CLI suggests `bun ws web …`.

---

## Dependency management

Always route installs through scoped commands. They invoke Bun with the correct `--filter` for workspaces.

| Intent | Command |
| :--- | :--- |
| Install all workspaces | `bun root install` |
| Add repo tooling | `bun root add -d <pkg>` |
| Add app dependency | `bun ws <app> add <pkg>` |
| Add app devDependency | `bun ws <app> add -d <pkg>` |
| Add package dependency | `bun pkg <name> add <pkg>` |
| Remove / update | `bun ws <app> remove <pkg>` / `update <pkg>` |

After changing dependencies:

```bash
bun run lint:deps          # ownership audit
bun run gate:quick         # types + lint for that app
bun run gate:quick         # if you are about to commit
```

**AI agents:** never run bare `bun add <pkg>` at repository root for app libraries. Never edit root `package.json` `dependencies`. If unsure which workspace owns a package, read [apps/README.md](../apps/README.md) and the app’s `AGENTS.md`.

---

## Workspace-only scripts (not a CLI bug)

`bun ws <app>` lists **Turbo-backed** tasks only — the intersection of `turbo.json` and `package.json`. Many scripts are **intentionally excluded**:

- They are interactive or long-running in ways that should not be cached (`test:watch`, Playwright `--ui`)
- They are local dev conveniences, not CI/gate steps
- Registering them in Turbo would add noise to the graph without benefit

**If a script exists in `package.json` but not in `bun ws <app>` output, the CLI is working correctly.** Run:

```bash
cd apps/<app>
bun run <script>
```

Starter `web` examples: `test:watch`, `test:coverage`, `test:e2e:ui`, `docs`, `docs:serve`. Full list: [commands.md — Workspace-only scripts](./commands.md#workspace-only-scripts-not-bun-ws).

### When you *do* want `bun ws`

Add the task to **both** `package.json` and root `turbo.json`, then confirm with `bun ws <app>`. Use this for tasks that should run in CI, gates, or `bun root <task>` across workspaces.

---

## Common workflows

### New contributor

```bash
bun root install
bun root doctor
cp apps/web/.env.example apps/web/.env.local
bun ws web dev
```

### Day-to-day on one app

```bash
bun ws web dev
bun run gate:quick
bun ws web test
bun run gate:quick        # before commit (or rely on hook)
bun run gate:push         # before push (or rely on hook)
```

### Before opening a PR

```bash
bun run gate:full
# or: GATE_FULL=1 git push
```

### Add a new app from a generator

```bash
bunx create-next-app@latest apps/admin
bun adopt ws admin --dry-run
bun adopt ws admin                    # interactive tooling menu (TTY)
bun root install
bun ws admin dev
```

For a shared package: `bun adopt pkg <name>` (aliases: `pckg`, `package`).

`adopt` wires Turbo and optional tooling. Existing `AGENTS.md` from a generator is **appended**, not replaced — see [commands.md](./commands.md#workspace-adoption).

### Interactive picker

```bash
bun run cli
```

ANSI menu for frequent root and workspace tasks.

---

## What to avoid

| Do not | Do instead |
| :--- | :--- |
| `npm install` / `pnpm` / `yarn` | `bun root install` (blocked by `preinstall`) |
| `bun add react` at repo root | `bun ws <app> add react` |
| Put app deps in root `package.json` | Workspace `package.json` + `lint:deps` |
| Assume `bun run dev` works at root | `bun ws <app> dev` or `bun root dev` |
| Expect every `package.json` script in `bun ws` | Register in `turbo.json` or use `cd` + `bun run` |
| Use `bun ws` for gates | `bun run gate:quick` / `gate:push` / `gate:full` |
| Deep-import across workspaces | Extract to `packages/*` — [ADR-0004](./adr/ADR-0004-package-extraction-boundaries.md) |

---

## Troubleshooting

### Unknown task

```text
bun ws web foo
# → unknown task; suggests typo if close
```

- Check `bun ws web` for the allowed list.
- If the script exists only locally: `cd apps/web && bun run foo`.
- If missing from Turbo: add to `turbo.json`.

### Unknown workspace

```text
bun ws admin build
# → Unknown app "admin"
```

- Directory must exist under `apps/admin/` with `package.json`.
- Run `bun root doctor`.
- After external scaffold: `bun root adopt apps/admin`.

### Wrong scope hint

```text
bun pkg web test
# → app exists; suggests bun ws web test
```

### `lint:deps` failed

- Remove runtime `dependencies` from root `package.json`.
- Move `react` / `next` / etc. out of root `devDependencies` into the app workspace.

### Gate failed after dependency change

```bash
bun root install
bun run lint:deps
bun run gate:quick
bun run gate:quick
```

---

## For AI agents

1. **Read scope first** — [apps/README.md](../apps/README.md) for which app exists; do not assume `web` if the user replaced it.
2. **Install** — always `bun ws <app> add` or `bun pkg <name> add`; never root `bun add` for app libraries.
3. **Run tasks** — `bun ws <app> <task>` for Turbo tasks; gates via `bun run gate:*`.
4. **New task** — edit `package.json` + `turbo.json`; verify with `bun ws <app>`.
5. **Validate** — `bun run gate:quick` → `gate:quick` → `gate:push` → `gate:full` per [ai-development.md](./ai-development.md).
6. **Do not duplicate** command lists in specs or comments — link here or [commands.md](./commands.md).

Implementation reference: `scripts/cli/core/run.ts`, `resolver.ts`, `tasks.ts`. Layout: [scripts/cli/README.md](../scripts/cli/README.md).

---

## Related

| Doc | Topic |
| :--- | :--- |
| [architecture.md](./architecture.md) | Ownership and tooling layout |
| [development.md](./development.md) | Local setup and hooks |
| [commands.md](./commands.md) | Full command tables |
| [turborepo.md](./turborepo.md) | Cache, `dependsOn`, filters |
| [scripts/README.md](../scripts/README.md) | CLI vs gate vs shared libs |
| [change-impact.md](./guides/change-impact.md) | What to run after a change type |
