/**
 * `bun root` command routing.
 *
 * @packageDocumentation
 */

import { runAdopt } from '../adopt/adopt'
import { runRepoAuditCli } from '../audit/audit-cli'
import { runDoctor } from '../doctor/doctor'
import { isPackageMgmtCommand } from './commands'
import { printMissingPackageUsage, printRootUsage } from './errors'
import { runResolvedCommand } from './io'
import { resolveRootPackageMgmt, resolveTurboTask } from './resolver'
import { discoverRootTasks, handleUnknownTask } from './tasks'
import type { RunnerIO } from './types'

/**
 * Handles `bun root <command> [...args]`.
 *
 * @param rawArgs - argv after `root`.
 * @param io - Injectable I/O for tests.
 * @param rootDir - Repository root.
 * @returns Process exit code.
 */
export async function handleRootScope(
  rawArgs: string[],
  io: RunnerIO,
  rootDir: string
): Promise<number> {
  const { stderr, spawn } = io
  const spawnFn = spawn!
  const rootTasks = discoverRootTasks(rootDir)
  const rootTaskSet = new Set(rootTasks)

  if (rawArgs.length === 0) {
    printRootUsage(stderr, rootTasks)
    return 1
  }

  const [command, ...commandArgs] = rawArgs
  if (!command) {
    printRootUsage(stderr, rootTasks)
    return 1
  }

  if (isPackageMgmtCommand(command)) {
    if (command !== 'install' && commandArgs.length === 0) {
      stderr(printMissingPackageUsage('root', command))
      return 1
    }

    return runResolvedCommand(resolveRootPackageMgmt(command, commandArgs), rootDir, spawnFn)
  }

  if (command === 'doctor') {
    return runDoctor(commandArgs, io, rootDir)
  }

  if (command === 'adopt') {
    return runAdopt(commandArgs, io, rootDir)
  }

  if (command === 'audit') {
    return runRepoAuditCli(commandArgs, io, rootDir)
  }

  if (command === 'secrets') {
    return runResolvedCommand(
      {
        cmd: ['bun'],
        args: ['scripts/cli/entries/secrets.ts', ...commandArgs],
      },
      rootDir,
      spawnFn
    )
  }

  if (!rootTaskSet.has(command)) {
    return handleUnknownTask(
      'root',
      command,
      rootTasks,
      commandArgs,
      undefined,
      io,
      async (correctedTask) =>
        runResolvedCommand(resolveTurboTask(correctedTask, commandArgs), rootDir, spawnFn)
    )
  }

  return runResolvedCommand(resolveTurboTask(command, commandArgs), rootDir, spawnFn)
}
