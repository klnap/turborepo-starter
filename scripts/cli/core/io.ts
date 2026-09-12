/**
 * Default CLI I/O helpers (prompt, subprocess dispatch).
 *
 * @packageDocumentation
 */

import readline from 'node:readline'
import { spawnInherit } from '../../shared/spawn'
import type { ResolvedInvocation } from './resolver'
import type { RunnerIO } from './types'

/**
 * Interactive readline prompt for typo suggestions.
 *
 * @param question - Prompt text shown to the user.
 * @returns Trimmed user input.
 */
export async function defaultPrompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise<string>((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * Spawns a resolved CLI invocation with inherited stdio.
 *
 * @param invocation - Command and argv from the resolver.
 * @param rootDir - Repository root directory.
 * @param spawn - Injectable spawn implementation (tests).
 * @returns Subprocess exit code.
 */
export async function runResolvedCommand(
  invocation: ResolvedInvocation,
  rootDir: string,
  spawn: NonNullable<RunnerIO['spawn']>
): Promise<number> {
  return spawn(invocation.cmd, invocation.args, rootDir)
}

/** Default spawn used when tests do not inject `RunnerIO.spawn`. */
export const defaultSpawn = spawnInherit
