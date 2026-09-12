# Workspace runners (`scripts/runners/`)

Shared tooling invoked from workspace `package.json` scripts (via relative `bun ../../scripts/runners/…`).

| Script | Turbo task | Output |
| :--- | :--- | :--- |
| `visual.ts` | `visual` | Playwright Storybook screenshots → workspace `.generated/` |
| `coupling-graph.ts` | `coupling-graph` | dependency-cruiser + Graphviz → `.generated/coupling-graph/` |

Workspace-specific runners stay under `apps/<app>/scripts/` (Lighthouse, icons, benchmarks).
