# Skills Router

Load **one** skill per task. Read this file first; do not load every skill.

## Root vs workspace

| Tree | Path | Use when |
| :--- | :--- | :--- |
| **Workspace** | `apps/<app>/.agents/skills/<name>/SKILL.md` | Task is specific to that app (Next.js, UI, deploy, SEO, animations) |
| **Root** | `.agents/skills/<name>/SKILL.md` | Task is repo-wide (specs, TDD, refactor, turborepo, git hooks) |

**Precedence:** If a workspace skill matches, use it. Otherwise use root.

Entry point for an app workspace: `apps/<app>/AGENTS.md` (starter: [apps/web/AGENTS.md](../../apps/web/AGENTS.md)).

## Canonical routing targets

These skills are the default entry points for common tasks. Each link must resolve.

| Skill | Load when |
| :--- | :--- |
| [implement-spec](./implement-spec/SKILL.md) | Implementing a spec from `specs/` or `apps/*/specs/` |
| [tdd](./tdd/SKILL.md) | Test-driven development |
| [safe-refactor](./safe-refactor/SKILL.md) | Restructure code, preserve behavior |
| [turborepo](./turborepo/SKILL.md) | `turbo.json`, tasks, caching, workspaces — also [docs/turborepo.md](../../docs/turborepo.md) |
| [code-review](./code-review/SKILL.md) | Review changes since a branch/commit |
| [diagnosing-bugs](./diagnosing-bugs/SKILL.md) | Unknown failures, regressions |
| [domain-modeling](./domain-modeling/SKILL.md) | Domain boundaries, entities |
| [research](./research/SKILL.md) | Primary-source investigation |
| [resolving-merge-conflicts](./resolving-merge-conflicts/SKILL.md) | Git merge/rebase conflicts |
| [setup-pre-commit](./setup-pre-commit/SKILL.md) | Husky, lint-staged hooks |
| [implement](./implement/SKILL.md) | General implementation (no spec) |
| [to-spec](./to-spec/SKILL.md) | Turn a request into a spec |
| [prototype](./prototype/SKILL.md) | Throwaway prototype for a design question |
| [mcp-builder](./mcp-builder/SKILL.md) | Build MCP servers |
| [skill-creator](./skill-creator/SKILL.md) | Author or edit skills |
| [writing-for-agents](./writing-for-agents/SKILL.md) | Docs/skills for agents |
| [ponytail](./ponytail/SKILL.md) | Minimal diff, YAGNI |
| [caveman](./caveman/SKILL.md) | Terse communication mode |

## Other root skills

Support and workflow skills (`caveman-*`, `grill-*`, `handoff`, `retro`, `triage`, `wayfinder`, `wizard`, `setup-ts-deep-modules`, etc.) live under `.agents/skills/<name>/SKILL.md`.

**Find a skill not listed above:**

```bash
ls .agents/skills/
# or
rg -l '^name:' .agents/skills/*/SKILL.md apps/*/.agents/skills/*/SKILL.md
```

Load only when the user or task explicitly names the skill.

---

## Workspace skills (starter: `apps/web`)

Skills below live under `apps/<app>/.agents/skills/`. Links point at the shipped **`web`** workspace as reference; if you remove or replace `web`, use that app's tree (or `ls apps/<app>/.agents/skills/`).

| Skill | Load when |
| :--- | :--- |
| [next-best-practices](../../apps/web/.agents/skills/next-best-practices/SKILL.md) | Next.js App Router patterns |
| [next-cache-components-adoption](../../apps/web/.agents/skills/next-cache-components-adoption/SKILL.md) | Cache Components / PPR |
| [vercel-react-best-practices](../../apps/web/.agents/skills/vercel-react-best-practices/SKILL.md) | React/Next performance |
| [vercel-composition-patterns](../../apps/web/.agents/skills/vercel-composition-patterns/SKILL.md) | Component composition |
| [vercel-react-view-transitions](../../apps/web/.agents/skills/vercel-react-view-transitions/SKILL.md) | View transitions |
| [vercel-optimize](../../apps/web/.agents/skills/vercel-optimize/SKILL.md) | Vercel cost/performance |
| [deploy-to-vercel](../../apps/web/.agents/skills/deploy-to-vercel/SKILL.md) | Vercel deployment |
| [web-design-guidelines](../../apps/web/.agents/skills/web-design-guidelines/SKILL.md) | UI/accessibility review |
| [anti-ui-slop](../../apps/web/.agents/skills/anti-ui-slop/SKILL.md) | Reduce generic UI patterns |
| [design-taste-frontend](../../apps/web/.agents/skills/design-taste-frontend/SKILL.md) | Visual design direction |
| [emil-design-eng](../../apps/web/.agents/skills/emil-design-eng/SKILL.md) | Design engineering |
| [pick-ui-library](../../apps/web/.agents/skills/pick-ui-library/SKILL.md) | Choose UI library |
| [ui-ux-pro-max](../../apps/web/.agents/skills/ui-ux-pro-max/SKILL.md) | UX patterns |
| [animation-vocabulary](../../apps/web/.agents/skills/animation-vocabulary/SKILL.md) | Animation naming/system |
| [find-animation-opportunities](../../apps/web/.agents/skills/find-animation-opportunities/SKILL.md) | Where to animate |
| [improve-animations](../../apps/web/.agents/skills/improve-animations/SKILL.md) | Improve motion |
| [review-animations](../../apps/web/.agents/skills/review-animations/SKILL.md) | Animation review |
| [seo-audit](../../apps/web/.agents/skills/seo-audit/SKILL.md) | SEO audit |
| [playwright-cli](../../apps/web/.agents/skills/playwright-cli/SKILL.md) | Playwright CLI workflows |

Other workspace skills: `ls apps/<app>/.agents/skills/` (starter: `apps/web/.agents/skills/`).
