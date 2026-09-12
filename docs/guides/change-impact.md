# Change Impact Checklist

After changing X, inspect and validate the related areas below.

| Change | Inspect | Validate | Update docs |
| :--- | :--- | :--- | :--- |
| **Dependency** | Correct `package.json` (root vs workspace); `lint:deps` | `bun run lint:deps`, `bun run gate:quick` | `docs/commands.md` if new script |
| **Env variable** | `apps/<app>/src/env.ts`, `.env.example` | `bun run lint:env`, app boots | `docs/development.md`, security |
| **CI pipeline / hook step** | `scripts/gate/` | edit `pipelines.ts` | [ci-cd.md](../ci-cd.md) |
| **CLI command** | `scripts/cli/`, `tasks.ts` intersection | `bun ws <app>` lists task; CLI tests | [cli.md](../cli.md), `docs/commands.md` |
| **New workspace** | `package.json` workspaces, turbo filter | `bun root doctor`, `bun root adopt` | [new-workspace-checklist](./new-workspace-checklist.md) |
| **New package** | `packages/<name>/`, boundaries | `bun run gate:quick`, `lint:deps` | Package `AGENTS.md`, specs |
| **New module** | `src/modules/<name>/index.ts` barrel | `bun ws web boundaries` | Module spec if non-trivial |
| **API route / handler** | `src/app/api/`, validation schemas | Unit tests, `bun ws web test` | Spec, OpenAPI if used |
| **Database / schema** | Migrations, server-only imports | Tests, E2E if applicable | ADR if model decision |
| **Auth** | Server actions, middleware, env | E2E, security review | ADR + spec |
| **Routing** | `src/app/`, i18n routing | E2E, `lint:i18n` | Spec, `docs/i18n.md` |
| **i18n strings** | `messages/`, `next-intl` usage | `bun ws web lint:i18n` | — |
| **Caching** | Next.js segments, cache config | Manual / E2E | ADR if strategy changes |
| **Deployment** | `vercel.json`, Dockerfile, env | Build, health check | `docs/deployment.md`, `docker.md` |
| **Security-sensitive** | Secrets, auth, validation | `gate:full`, `security:audit` | `docs/security.md`, ADR |
| **Visual baseline** | Storybook stories, snapshots | `bun ws web visual` | Commit snapshots if intentional |
| **Generated files** | `.generated/` paths only | No committed artifacts | AGENTS Ch.2 |
| **Architecture boundary** | `dependency-cruiser`, module barrels | `bun ws web boundaries` | ADR if boundary rule changes |
| **Documentation** | Single source of truth | Links work | Avoid duplicating SoT |
| **ADR** | Scope (root vs app vs package) | Status lifecycle | Cross-link specs |
| **Spec** | Correct tier path | Acceptance criteria met | Mark done in spec |

**Default validation path:**

```bash
bun run gate:quick
bun ws <app> test
bun run gate:quick
bun run gate:full   # optional deep audit
```

See [feature-development.md](./feature-development.md).
