#!/usr/bin/env bun
/**
 * Storybook visual regression — reusable across workspaces.
 * Workspace provides Playwright config, visual specs, and snapshots.
 * Missing baselines: local runs use `--update-snapshots=changed` (auto-create, still fail on drift).
 * `--update` rewrites all baselines. CI (`CI=true`) compares strictly.
 *
 * @packageDocumentation
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { resolveWorkspaceRoot, workspaceGeneratedDir } from '../shared/workspace'

const workspaceRoot = resolveWorkspaceRoot()
const storybookIndex = path.join(
  workspaceGeneratedDir(workspaceRoot),
  'storybook-static',
  'index.json'
)
const visualSpec = path.join(workspaceRoot, 'tests/e2e/visual-storybook.spec.ts')

if (!existsSync(path.join(workspaceRoot, 'playwright.config.ts'))) {
  console.error('[visual] Missing playwright.config.ts in workspace')
  process.exit(1)
}

if (!existsSync(visualSpec)) {
  console.error(`[visual] Missing ${path.relative(workspaceRoot, visualSpec)}`)
  process.exit(1)
}

function run(command: string, args: string[]): number {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
  })
  return result.status ?? 1
}

const userArgs = process.argv.slice(2)
const hasSnapshotFlag = userArgs.some(
  (arg) => arg === '--update' || arg.startsWith('--update-snapshots')
)

const playwrightArgs = userArgs.flatMap((arg) =>
  arg === '--update' ? ['--update-snapshots'] : [arg]
)

// Local / gate: write missing baselines; CI (visual-regression.yml) stays strict.
if (!hasSnapshotFlag && process.env.CI !== 'true') {
  playwrightArgs.push('--update-snapshots=changed')
}

if (!existsSync(storybookIndex)) {
  const buildCode = run('bun', ['run', 'build-storybook'])
  if (buildCode !== 0) process.exit(buildCode)
}

const code =
  spawnSync(
    'bunx',
    [
      'playwright',
      'test',
      path.relative(workspaceRoot, visualSpec),
      '--project=visual-storybook',
      ...playwrightArgs,
    ],
    {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: { ...process.env, STORYBOOK_VISUAL: '1' },
    }
  ).status ?? 1

process.exit(code)
