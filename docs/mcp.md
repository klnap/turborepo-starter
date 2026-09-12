# MCP server scopes

Model Context Protocol configuration: root [`mcp.json`](../mcp.json). Use these servers only within the paths below — do not assume full-disk access.

## Filesystem server

**Package:** `@modelcontextprotocol/server-filesystem`

**Allowed directories (read/write within Cursor):**

| Path | Why |
| :--- | :--- |
| `apps/web/src` | Application source |
| `apps/web/specs` | Tier-2 workspace specs |
| `docs` | Repository documentation |
| `specs` | Tier-1 monorepo specs |
| `scripts` | CLI, gates, audits |

**Excluded patterns:** `.env`, `.env.*`, `*.pem`, `*.key`, `node_modules`, `.git/config`

Agents editing root `package.json`, `turbo.json`, `.github/`, or other apps must use the IDE workspace tools — not this MCP server.

## Git server

**Package:** `@modelcontextprotocol/server-git`

**Restriction:** `--repository` is set to the monorepo root. All git operations are validated to stay inside this repository — no access to parent directories or other repos on disk.

Use for history, diffs, and branch operations on **this** project only.

## Related

- [ai-development.md](./ai-development.md) — agent workflow
- [security.md](./security.md) — high-risk files
