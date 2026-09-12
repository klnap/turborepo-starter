# Command Reference

Complete list of commands available in this repository. Turbo tasks require explicit scope via `bun root`, `bun ws`, or `bun pkg`.

**Read first:** [cli.md](./cli.md) — why scoped commands exist, mental model, dependency ownership, agent rules.  
**Decision record:** [adr/ADR-0005-scoped-cli.md](./adr/ADR-0005-scoped-cli.md).

### Documentation split

| Document | Owns |
| :--- | :--- |
| **commands.md** (this file) | Tables — what to run, flags, outputs |
| **[cli.md](./cli.md)** | Narrative — why, ownership, troubleshooting, agent rules |

Do not add “why” paragraphs here; link to `cli.md`. Do not duplicate these tables in `cli.md`.

Current application workspaces: see [apps/README.md](../apps/README.md) (`apps/<app>/`). Starter ships **`web`**. `bun pkg <name>` applies when `packages/*` workspaces are added.

---

## Root

Repository-scoped Turbo tasks and root scripts.

| Command | Description |
| :--- | :--- |
| `bun run gate:quick` | Lint, typecheck, i18n across all workspaces |
| `bun root test` | Unit tests across all workspaces |
| `bun root build` | Topological production build |
| `bun root dev` | Start all dev servers |
| `bun root start` | Production servers (builds first) |
| `bun root typecheck` | TypeScript check |
| `bun root lint` | Biome check per workspace |
| `bun root lint:architecture` | dependency-cruiser boundary check |
| `bun root boundaries` | Alias for `lint:architecture` |
| `bun root knip` | Dead code audit |
| `bun root storybook` | Storybook in all opt-in workspaces |
| `bun root build-storybook` | Static Storybook build |
| `bun root visual` | Visual regression in all opt-in workspaces |
| `bun root lighthouse` | Lighthouse CI in all opt-in workspaces |
| `bun root coupling-graph` | Architecture graph in all opt-in workspaces |
| `bun root test:e2e` | Playwright E2E |
| `bun root test:a11y` | Playwright accessibility tests |
| `bun root test:mutation` | Stryker mutation testing (opt-in workspaces) |
| `bun root docs:generate` | TypeDoc HTML output |
| `bun root icons` | SVG sprite generation |
| `bun root clean` | Remove build artifacts |
| `bun root doctor` | Repository configuration diagnostics |
| `bun root audit` | Repository drift audit (links, CI assumptions, gates) |
| `bun root adopt <path>` | Integrate an existing workspace with repo conventions |

Shorthand (same behavior):

| Command | Description |
| :--- | :--- |
| `bun adopt ws <app> [flags]` | Adopt `apps/<app>` |
| `bun adopt pkg <name> [flags]` | Adopt `packages/<name>` |
| `bun adopt <path> [flags]` | Full path (`apps/…`, `packages/…`) |

Aliases: `app`/`apps` → `ws`; `package`/`pckg`/`packages` → `pkg`.

Root-only scripts (via `bun run`):

| Command | Description |
| :--- | :--- |
| `bun run build` | Topological production build (`turbo run build`) |
| `bun run dev` | Start all dev servers (`turbo run dev`) |
| `bun run start` | Production servers in all workspaces (builds first) |
| `bun run cli` | Interactive task picker |
| `bun adopt` | Workspace adoption shorthand (`bun adopt ws <app>`, `bun adopt pkg <name>`) |
| `bun run gate:quick` | **Anti-slop** — oxlint, types, boundaries (pre-commit, ~1 min) |
| `bun run gate:push` | **Verify** — knip, tests, build, E2E smoke (pre-push, ~1–2 min) |
| `bun run gate:ci` | Anti-slop + verify — GitHub `ci.yml` job |
| `bun run gate:full` | Deep audit — security, visual, Lighthouse (`bun run gate:full` or `GATE_FULL=1 git push`) |
| `bun run gitleaks:staged` | Scan **staged** diff only (fast — pre-commit path) |
| `bun run gitleaks:scan` | Scan working tree without git history (`gate:full`) |
| `bun run audit:repo` | Repository drift audit (same as `bun root audit`) |
| `bun run lint` | Biome check (root files) |
| `bun run lint:fix` | Biome auto-fix |
| `bun run format` | Biome format |
| `bun run lint:oxlint` | Oxlint anti-slop rules |
| `bun run lighthouse:report` | Lighthouse markdown report |
| `bun run lint:deps` | Dependency ownership audit (no runtime deps at root) |
| `bun run clean` | Purge `node_modules` and Turbo cache |
| `bun run git:pre-commit` | Run pre-commit hook |
| `bun run git:pre-push` | Run pre-push hook |

---

## Apps

Scoped to `apps/<app>`. Currently: `web`.

| Command | Description |
| :--- | :--- |
| `bun ws web dev` | Next.js dev server (`:3000`) |
| `bun ws web build` | Production build |
| `bun ws web start` | Production server |
| `bun run gate:quick` | Biome + types + Loccy |
| `bun ws web test` | Bun unit tests |
| `bun ws web test:e2e` | Playwright E2E |
| `bun ws web test:e2e:install` | Install Playwright browsers (`--with-deps` via `--`) |
| `bun ws web test:a11y` | Accessibility tests |
| `bun ws web test:mutation` | Stryker mutation testing |
| `bun ws web visual` | Storybook visual regression |
| `bun ws web visual --update` | Update visual baselines |
| `bun ws web storybook` | Storybook dev (`:6006`) |
| `bun ws web build-storybook` | Static Storybook → `.generated/storybook-static/` |
| `bun ws web lighthouse` | Lighthouse CI (`apps/web/scripts/lighthouse/`) → `.generated/lighthouse/` |
| `bun ws web coupling-graph` | Dep graph → `.generated/coupling-graph/` |
| `bun ws web icons` | SVG sprite build |
| `bun ws web lint:architecture` | dependency-cruiser |
| `bun ws web boundaries` | Alias for `lint:architecture` |
| `bun ws web knip` | Dead code audit |
| `bun ws web docs:generate` | TypeDoc → `.generated/docs/api/` |
| `bun ws web clean` | Remove workspace artifacts |
| `bun run gate:quickly:test` | Run Checkly synthetic checks locally |
| `bun run gate:quickly:deploy` | Deploy Checkly checks to Checkly cloud |

### Workspace-only scripts (not `bun ws`)

`bun ws` runs only tasks in the **intersection** of root `turbo.json` and workspace `package.json`. That is intentional — Turbo tasks participate in the graph and cache; local dev helpers do not need to.

**This is not a broken or incomplete CLI.** Watch mode, Playwright UI, and one-off dev servers are workspace-local by design. Run them from the workspace directory:

```bash
cd apps/web
bun run <script>
```

Starter `web` examples (no Turbo task — use `cd` + `bun run`):

| Script | Purpose |
| :--- | :--- |
| `test:watch` | Bun unit tests in watch mode |
| `test:coverage` | Coverage report |
| `test:e2e:ui` | Playwright UI mode |
| `docs` | Generate TypeDoc and serve locally |
| `docs:serve` | Serve generated API docs only |
| `benchmark:next-intl` | i18n benchmark (starter tooling) |

To expose a script via `bun ws`, register it in root `turbo.json` **and** workspace `package.json`. See [cli.md — Workspace-only scripts](./cli.md#workspace-only-scripts-not-a-cli-bug).

List Turbo-backed tasks: `bun ws web` (no task argument).

---

## Packages

Pattern when `packages/<name>` exists:

```bash
bun pkg <name> typecheck
bun pkg <name> test
bun pkg <name> build
```

---

## Dependency Management

Always routes to Bun regardless of Turbo task names.

| Command | Target |
| :--- | :--- |
| `bun root install` | Root `package.json` |
| `bun root add <pkg>` | Root dependency |
| `bun root add -d <pkg>` | Root devDependency |
| `bun root remove <pkg>` | Root |
| `bun root update <pkg>` | Root |
| `bun ws web install` | `apps/web` |
| `bun ws web add <pkg>` | `apps/web` |
| `bun ws web remove <pkg>` | `apps/web` |
| `bun ws web update <pkg>` | `apps/web` |
| `bun pkg <name> add <pkg>` | `packages/<name>` |

Global Bun (developer machine, not monorepo scope):

```bash
bun add -g <package>
```

---

## Turbo

Direct access when filters or low-level control are needed:

```bash
bun turbo run <task>
bun turbo run <task> --filter=web
bun turbo run build --force
```

Scoped CLI is preferred for day-to-day use. Internally, scoped tasks invoke `turbo run <task>` (not Turbo's built-in `turbo boundaries` subcommand).

---

## Testing

See [testing.md](./testing.md) for strategy. Quick reference:

```bash
bun root test
bun ws web test:e2e
bun ws web test:a11y
bun run gate:quick
bun run gate:full
```

---

## Visual Regression

```bash
bun root visual                  # all opt-in workspaces
bun ws web visual                # single workspace
bun ws web visual --update       # update committed baselines
```

Implementation: `scripts/runners/visual.ts`. Baselines: `apps/web/tests/e2e/visual-storybook.spec.ts-snapshots/`. Diffs/reports: `apps/web/.generated/`.

---

## Storybook

```bash
bun ws web storybook             # dev server :6006
bun ws web build-storybook       # static export
bun root storybook               # all opt-in workspaces
```

Config: `apps/web/.storybook/`. Stories: co-located `*.stories.tsx` in `src/`.

---

## Other Tooling

| Command | Output |
| :--- | :--- |
| `bun ws web lighthouse` | `apps/web/.generated/lighthouse/` |
| `bun ws web coupling-graph` | `apps/web/.generated/coupling-graph/graph.svg` |
| `bun run lighthouse:report` | Terminal + GitHub step summary |
| `bun ws web docs:generate` | `apps/web/.generated/docs/api/` |

Pass task arguments after `--` where supported:

```bash
bun root build --force
```

`bun ws` does not forward arbitrary flags to workspace-only scripts — use `cd apps/web && bun run <script>` for those.

---

## Repository Doctor

Read-only diagnostics for environment, workspaces, CLI wiring, and configuration.

```bash
bun root doctor
bun root doctor --verbose
bun root doctor --json
```

Exit code `1` only when critical repository problems are detected. Warnings exit `0`.

Doctor does not run gates, `test`, `build`, Playwright, Storybook, Lighthouse, or security scanners.

---

## Workspace Adoption

Integrate an existing `apps/*` or `packages/*` directory after an external generator creates it.

```bash
bun adopt ws cms                       # shorthand (preferred)
bun adopt pkg ui --dry-run
bun root adopt apps/admin              # full path (same as above)
bun root adopt apps/admin --dry-run    # preview without writing
bun root adopt apps/admin --yes        # core only, skip picker (CI)
bun root adopt packages/forms
```

### Interactive picker (default in TTY)

After you pass the workspace path, adopt **always** applies core integration (`turbo.json`, `engines`, `AGENTS.md` / `specs`). Then an optional menu appears:

```text
↑/↓ move • Space toggle • Enter apply • Esc cancel

✓ Visual regression (Storybook + Playwright)
○ Storybook dev + static build
○ Playwright E2E
○ Lighthouse CI
```

Already-configured items show `(already configured)` and cannot be toggled.

Non-interactive environments (CI, pipes): no menu — use flags below or `--yes` for core only.

| Flag | Effect |
| :--- | :--- |
| `--dry-run` | Show planned changes without writing files |
| `--yes` / `-y` | Skip interactive picker; core integration only |
| `--visual` | Add `visual` script (non-interactive / CI) |
| `--storybook` | Add `storybook` and `build-storybook` when missing |
| `--e2e` | Add `test:e2e` and `test:e2e:install` when missing |
| `--lighthouse` | Add `lighthouse` script (runner in `apps/<app>/scripts/lighthouse/`) |

Default adoption (no flags) creates `turbo.json` with `extends: ["//"]`, copies root `engines` when the workspace has none, and:

- **No `AGENTS.md`** — creates full workspace template
- **Existing `AGENTS.md`** (e.g. from `create-next-app`) — **appends** a `## Monorepo integration` section; generator content is preserved (idempotent marker: `<!-- turborepo-starter:adopt -->`)
- **No `specs/README.md`** — creates pointer file

It does not modify existing scripts or dependencies.

Errors:

| Condition | Message |
| :--- | :--- |
| Missing path | Usage help |
| Unknown directory | `Workspace "<path>" was not found.` |
| No `package.json` | `Directory is not a workspace.` |
| Repository root | `Repository root cannot be adopted as a workspace.` |
| Outside repo | `Path is outside the repository.` |
