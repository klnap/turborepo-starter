/**
 * Scoped CLI entry — dispatches to root or workspace handlers.
 *
 * @packageDocumentation
 */

import { ROOT_DIR } from '../../shared/paths'
import { defaultPrompt, defaultSpawn } from './io'
import { handleRootScope } from './root-scope'
import type { RunnerIO, Scope } from './types'
import { handleWorkspaceScope } from './workspace-scope'

/**
 * Runs the scoped monorepo CLI for `root`, `ws`, or `pkg` entrypoints.
 *
 * @param scope - CLI scope (`root`, `ws`, or `pkg`).
 * @param rawArgs - Remaining argv after the entry script name.
 * @param io - Injectable I/O for tests (stdout, stderr, prompt, spawn).
 * @param rootDir - Repository root directory.
 * @returns Process exit code (`0` success, non-zero failure).
 *
 * @example
 * ```ts
 * const code = await runScopeCli('ws', ['web', 'test'], { stdout: () => {}, stderr: () => {} })
 * process.exit(code)
 * ```
 *
 * @see ../../../docs/adr/ADR-0005-scoped-cli.md
 */
export async function runScopeCli(
  scope: Scope,
  rawArgs: string[],
  io: RunnerIO = {
    stdout: (msg) => console.log(msg),
    stderr: (msg) => console.error(msg),
    isTTY: process.stdin.isTTY,
    prompt: defaultPrompt,
    spawn: defaultSpawn,
  },
  rootDir: string = ROOT_DIR
): Promise<number> {
  if (scope === 'root') {
    return handleRootScope(rawArgs, io, rootDir)
  }

  return handleWorkspaceScope(scope, rawArgs, io, rootDir, runScopeCli)
}
