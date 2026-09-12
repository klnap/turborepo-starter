# Scoped CLI (`scripts/cli/`)

**Where** to run commands: `bun root`, `bun ws`, `bun pkg`, `bun adopt`, `bun cli`.

Narrative: [docs/cli.md](../../docs/cli.md). Decision: [ADR-0005](../../docs/adr/ADR-0005-scoped-cli.md).

## Layout

```text
cli/
  entries/          # Thin argv wrappers (package.json points here)
    root.ts         # bun root
    workspace.ts    # bun ws
    package.ts      # bun pkg
    adopt.ts        # bun adopt
  core/             # Scope routing + task resolution
    run.ts          # runScopeCli — single public entry for entries/
    root-scope.ts   # bun root <cmd>
    workspace-scope.ts
    discovery.ts    # workspaces + turbo task keys
    resolver.ts     # bun / turbo argv
    tasks.ts        # task lists, typo suggestions
    commands.ts     # install | add | remove | update
    errors.ts       # usage text
    prompt.ts       # interactive “did you mean?”
    types.ts
    io.ts           # prompt + spawn helpers
    *.test.ts       # integration tests for scope routing
  adopt/            # bun root adopt / bun adopt
  doctor/           # bun root doctor
  audit/            # bun root audit (repo drift)
  menu/             # bun cli — interactive Control Center
  index.ts          # re-exports menu (package.json "cli" script)
```

## Request flow

```text
bun ws web test
  → entries/workspace.ts
  → core/run.ts → core/workspace-scope.ts
  → core/resolver.ts → turbo run test --filter=./apps/web
```

Special root commands (not in `turbo.json`): `doctor`, `adopt`, `audit`.

## Adding behavior

| Change | Edit |
| :--- | :--- |
| New Turbo-backed task | workspace `package.json` + root `turbo.json` |
| New root-only command | `core/root-scope.ts` + handler module |
| Usage text | `core/errors.ts` |
| Interactive menu item | `menu/registry.ts` |

Tests: `bun test scripts/cli` from repo root.
