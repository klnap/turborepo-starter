/**
 * Verification gate pipelines — layered by intent:
 *
 * - quick: anti-slop (pre-commit) — lint, types, boundaries, knip
 * - push:  verify (pre-push) — tests, build, browser smoke (skips anti-slop — hook already ran)
 * - ci:    quick + verify — GitHub `ci.yml`
 * - full:  ci + security / visual / perf — optional deep audit (`bun run gate:full` or `GATE_FULL=1 git push`)
 *
 * @see ../../docs/testing.md
 * @see ../../docs/security.md#high-risk-files-ai-agents
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { runGitleaksGitHistory, runGitleaksStaged, runGitleaksWorkdir } from '../git/gitleaks'
import { runSbomAndGrypeScan } from '../security/sbom'
import { runTrivyFilesystemScan } from '../security/trivy'
import { runProcess } from '../shared/spawn'
import { concurrentGroup, sequentialGroup } from './listr'
import type { CiMode, PipelineTask } from './types'
import { bundleAnalysisTasks, e2eBrowserTasks, visualRegressionTasks } from './workspace-tasks'

async function run(cmd: string, args: string[], opts: Parameters<typeof runProcess>[2] = {}) {
  return runProcess(cmd, args, opts)
}

async function gitHead(cwd: string): Promise<string> {
  try {
    return (await Bun.$`git rev-parse HEAD`.cwd(cwd).text()).trim()
  } catch {
    return 'unknown'
  }
}

/** Lint, types, boundaries — catches AI slop before it lands in git */
function antiSlopSteps(): PipelineTask[] {
  return [
    {
      title: 'gitleaks (staged)',
      task: async (_cc, t) => runGitleaksStaged({ task: t }),
    },
    {
      title: 'lint:code (format + fix)',
      task: async (_cc, t) => run('bun', ['run', 'lint:fix'], { task: t }),
    },
    {
      title: 'lint:oxlint (anti-slop)',
      task: async (_cc, t) => run('bun', ['run', 'lint:oxlint'], { task: t }),
    },
    {
      title: 'lint:i18n',
      task: async (_cc, t) => run('bunx', ['turbo', 'run', 'lint:i18n'], { task: t }),
    },
    {
      title: 'lint:env',
      task: async (_cc, t) => run('bun', ['run', 'lint:env'], { task: t }),
    },
    {
      title: 'lint:architecture',
      task: async (_cc, t) => run('bunx', ['turbo', 'run', 'lint:architecture'], { task: t }),
    },
    {
      title: 'typecheck',
      task: async (_cc, t) => run('bunx', ['turbo', 'run', 'typecheck'], { task: t }),
    },
    {
      title: 'knip dead-code audit',
      task: async (_cc, t) => run('bun', ['run', 'check:dead-code'], { task: t }),
    },
    {
      title: 'licenses',
      task: async (_cc, t) => run('bun', ['run', 'licenses'], { task: t }),
    },
  ]
}

/** Dead code, deps, tests, build — catches regressions before push */
function verifySteps(): PipelineTask[] {
  return [
    {
      title: 'security vulnerability audit',
      task: async (_c: unknown, t: any) => run('bun', ['run', 'security:audit'], { task: t }),
    },
    {
      title: 'unit tests',
      task: async (_c: any, t: any) => run('bun', ['run', 'test'], { task: t }),
    },
    {
      title: 'production build',
      task: async (_c, t) => run('bun', ['run', 'build'], { task: t }),
    },
  ]
}

/** `gate:quick` — pre-commit: anti-slop only (~1 min) */
export function quickTasks(): PipelineTask[] {
  return [
    {
      title: 'Anti-slop',
      task: (_ctx, task) =>
        task.newListr(
          [{ title: 'checks', task: (_c, sub) => sub.newListr(antiSlopSteps(), concurrentGroup) }],
          sequentialGroup
        ),
    },
  ]
}

/** `gate:ci` — GitHub `ci.yml`: anti-slop + verify */
export function ciTasks(): PipelineTask[] {
  return [
    {
      title: 'CI verification',
      task: (_ctx, task) =>
        task.newListr(
          [
            {
              title: 'anti-slop',
              task: (_c, sub) => sub.newListr(antiSlopSteps(), concurrentGroup),
            },
            {
              title: 'verify',
              task: (_c, sub) => sub.newListr(verifySteps(), sequentialGroup),
            },
          ],
          sequentialGroup
        ),
    },
  ]
}

/** `gate:push` — pre-push: verify + secrets + browser smoke (skips anti-slop — pre-commit already ran) */
export function pushTasks(root: string): PipelineTask[] {
  return [
    {
      title: 'Verify',
      task: (_ctx, task) => task.newListr(verifySteps(), sequentialGroup),
    },
    {
      title: 'Secrets (git history)',
      task: async (_c, t) => runGitleaksGitHistory({ task: t }),
    },
    {
      title: 'Accessibility',
      task: async (_c, t) =>
        run('bunx', ['turbo', 'run', 'test:a11y'], {
          env: { CI: 'true', SKIP_ENV_VALIDATION: '1' },
          task: t,
        }),
    },
    ...e2eBrowserTasks(root),
  ]
}

/** `gate:full` — deep audit: ci + security / visual / perf (manual, or `GATE_FULL=1 git push`) */
export async function fullTasks(root: string): Promise<PipelineTask[]> {
  const hash = Bun.env.LHCI_BUILD_CONTEXT__CURRENT_HASH ?? (await gitHead(root))
  const appsWebDir = path.join(root, 'apps/web')

  return [
    ...ciTasks(),
    {
      title: 'Security scanning',
      task: (_ctx, task) =>
        task.newListr(
          [
            {
              title: 'gitleaks (git history)',
              task: async (_c, t) => runGitleaksGitHistory({ task: t }),
            },
            {
              title: 'gitleaks (workdir)',
              task: async (_c, t) => runGitleaksWorkdir({ task: t }),
            },
            {
              title: 'trivy (filesystem)',
              task: async (_c, t) => runTrivyFilesystemScan({ task: t }),
            },
            {
              title: 'sbom + grype',
              task: async (_c, t) => runSbomAndGrypeScan({ task: t }),
            },
          ],
          sequentialGroup
        ),
    },
    {
      title: 'CLI unit tests',
      task: async (_c, t) => run('bun', ['test', 'scripts/cli'], { task: t }),
    },
    {
      title: 'documentation',
      task: async (_c, t) => run('bun', ['run', 'docs:generate'], { task: t }),
    },
    {
      title: 'Accessibility',
      task: async (_c, t) =>
        run('bunx', ['turbo', 'run', 'test:a11y'], {
          env: { CI: 'true', SKIP_ENV_VALIDATION: '1' },
          task: t,
        }),
    },
    ...e2eBrowserTasks(root),
    ...visualRegressionTasks(root),
    ...bundleAnalysisTasks(root),
    ...(fs.existsSync(appsWebDir)
      ? [
          {
            title: 'Lighthouse',
            task: async (_c: any, t: any) =>
              run('bun', ['run', 'lighthouse'], {
                cwd: appsWebDir,
                env: {
                  LHCI_BUILD_CONTEXT__CURRENT_HASH: hash,
                  CI: 'true',
                  SKIP_ENV_VALIDATION: '1',
                },
                task: t,
              }),
          },
        ]
      : []),
  ]
}

export async function tasksFor(mode: CiMode, root: string): Promise<PipelineTask[]> {
  if (mode === 'quick') return quickTasks()
  if (mode === 'ci') return ciTasks()
  if (mode === 'push') return pushTasks(root)
  return fullTasks(root)
}
