/**
 * Capability-driven gate steps (E2E browsers, visual, bundle analysis).
 *
 * Local gates never use `playwright install --with-deps` (requires sudo).
 * Default E2E matrix is Chromium-only; set `GATE_E2E_ALL_BROWSERS=1` for firefox/webkit
 * after OS libraries are installed (GitHub Actions runs the full matrix in `playwright.yml`).
 *
 * @packageDocumentation
 */

import { runProcess } from '../shared/spawn'
import {
  type E2eBrowserMatrixEntry,
  e2eBrowserMatrix,
  workspacesWithCapability,
} from '../shared/workspace-capabilities'
import { sequentialGroup } from './listr'
import type { PipelineTask } from './types'

async function run(cmd: string, args: string[], opts: Parameters<typeof runProcess>[2] = {}) {
  return runProcess(cmd, args, opts)
}

function playwrightInstallArgs(browser: string): string[] {
  return ['playwright', 'install', browser]
}

function localE2eMatrix(rootDir: string): E2eBrowserMatrixEntry[] {
  const matrix = e2eBrowserMatrix(rootDir)
  if (Bun.env.GATE_E2E_ALL_BROWSERS === '1') return matrix
  return matrix.filter((entry) => entry.browser === 'chromium')
}

export function e2eBrowserTasks(rootDir: string): PipelineTask[] {
  const matrix = localE2eMatrix(rootDir)
  if (matrix.length === 0) return []

  const browsers = [...new Set(matrix.map((entry) => entry.browser))]
  const allBrowsers = Bun.env.GATE_E2E_ALL_BROWSERS === '1'

  return [
    {
      title: allBrowsers ? 'Playwright (all browsers)' : 'Playwright (chromium)',
      task: (_ctx, task) =>
        task.newListr(
          [
            {
              title: 'install browsers',
              task: (_c, sub) =>
                sub.newListr(
                  browsers.map((browser) => ({
                    title: browser,
                    task: async (_cc, t) =>
                      run('bunx', playwrightInstallArgs(browser), { task: t }),
                  })),
                  sequentialGroup
                ),
            },
            {
              title: 'e2e matrix',
              task: (_c, sub) =>
                sub.newListr(
                  matrix.map(({ workspace, browser }) => ({
                    title: `${workspace} / ${browser}`,
                    task: async (_cc, t) =>
                      run(
                        'bun',
                        [
                          'scripts/cli/entries/workspace.ts',
                          workspace,
                          'test:e2e',
                          '--',
                          `--project=${browser}`,
                        ],
                        { cwd: rootDir, env: { CI: 'true', SKIP_ENV_VALIDATION: '1' }, task: t }
                      ),
                  })),
                  sequentialGroup
                ),
            },
          ],
          sequentialGroup
        ),
    },
  ]
}

export function visualRegressionTasks(rootDir: string): PipelineTask[] {
  const workspaces = workspacesWithCapability('visual', rootDir)
  if (workspaces.length === 0) return []

  return [
    {
      title: 'Visual regression',
      task: (_ctx, task) =>
        task.newListr(
          workspaces.map((workspace) => ({
            title: workspace.dirName,
            task: (_c, sub) =>
              sub.newListr(
                [
                  {
                    title: 'install Chromium',
                    task: async (_cc, t) =>
                      run('bunx', playwrightInstallArgs('chromium'), { task: t }),
                  },
                  {
                    title: 'storybook screenshots',
                    task: async (_cc, t) =>
                      run(
                        'bun',
                        ['scripts/cli/entries/workspace.ts', workspace.dirName, 'visual'],
                        { cwd: rootDir, env: { SKIP_ENV_VALIDATION: '1' }, task: t }
                      ),
                  },
                ],
                sequentialGroup
              ),
          })),
          sequentialGroup
        ),
    },
  ]
}

export function bundleAnalysisTasks(rootDir: string): PipelineTask[] {
  const workspaces = workspacesWithCapability('next-bundle', rootDir)
  if (workspaces.length === 0) return []

  return [
    {
      title: 'Bundle analysis',
      task: (_ctx, task) =>
        task.newListr(
          workspaces.map((workspace) => ({
            title: workspace.dirName,
            task: async (_cc, t) =>
              run('bunx', ['next', 'experimental-analyze', '--output'], {
                cwd: workspace.dirPath,
                env: { SKIP_ENV_VALIDATION: '1' },
                task: t,
              }),
          })),
          sequentialGroup
        ),
    },
  ]
}
