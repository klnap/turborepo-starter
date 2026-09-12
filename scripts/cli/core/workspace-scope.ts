/**
 * `bun ws` / `bun pkg` command routing.
 *
 * @packageDocumentation
 */

import { isPackageMgmtCommand } from './commands'
import { discoverWorkspaces, findWorkspace } from './discovery'
import {
  formatAvailableList,
  printMissingPackageUsage,
  printWorkspaceUsage,
  workspaceLabels,
} from './errors'
import { runResolvedCommand } from './io'
import { promptSuggestion } from './prompt'
import { formatScopeCommand, resolveTurboTask, resolveWorkspacePackageMgmt } from './resolver'
import {
  discoverRootTasks,
  discoverWorkspaceTasks,
  handleUnknownTask,
  printWorkspaceTaskUsage,
} from './tasks'
import type { RunnerIO, Scope } from './types'

export type ScopeDispatch = (
  scope: Scope,
  rawArgs: string[],
  io: RunnerIO,
  rootDir: string
) => Promise<number>

/**
 * Handles `bun ws <app> …` and `bun pkg <name> …`.
 *
 * @param scope - `ws` or `pkg`.
 * @param rawArgs - argv after scope name.
 * @param io - Injectable I/O for tests.
 * @param rootDir - Repository root.
 * @param dispatch - Re-enters the top-level scope runner (ws/pkg cross-suggestions).
 * @returns Process exit code.
 */
export async function handleWorkspaceScope(
  scope: 'ws' | 'pkg',
  rawArgs: string[],
  io: RunnerIO,
  rootDir: string,
  dispatch: ScopeDispatch
): Promise<number> {
  const { stderr, spawn } = io
  const spawnFn = spawn!
  const { entityLabel, directoryLabel, oppositeType, currentType, oppositeScope } =
    workspaceLabels(scope)
  const rootTasks = discoverRootTasks(rootDir)

  if (rawArgs.length === 0) {
    const available = discoverWorkspaces(currentType, rootDir).map((workspace) => workspace.dirName)
    printWorkspaceUsage(scope, entityLabel, directoryLabel, available, rootTasks, stderr)
    return 1
  }

  const [firstArg, secondArg, ...restArgs] = rawArgs

  if (firstArg && isPackageMgmtCommand(firstArg)) {
    const available = discoverWorkspaces(currentType, rootDir).map((workspace) => workspace.dirName)
    stderr(`Missing ${entityLabel}.

Usage:
  bun ${scope} <${entityLabel}> <command> [...args]

Available ${directoryLabel}:
${formatAvailableList(available)}`)
    return 1
  }

  const targetName = firstArg
  if (!targetName) {
    const available = discoverWorkspaces(currentType, rootDir).map((workspace) => workspace.dirName)
    stderr(`Missing ${entityLabel}.

Usage:
  bun ${scope} <${entityLabel}> <command> [...args]

Available ${directoryLabel}:
${formatAvailableList(available)}`)
    return 1
  }

  const workspace = findWorkspace(currentType, targetName, rootDir)
  if (!workspace) {
    const oppositeWorkspace = findWorkspace(oppositeType, targetName, rootDir)
    const tailArgs = rawArgs.slice(1)

    if (oppositeWorkspace) {
      const suggestedCmd = formatScopeCommand(oppositeScope, tailArgs, oppositeWorkspace.dirName)

      if (scope === 'pkg') {
        return promptSuggestion(
          `Package "${targetName}" was not found.

An app with this name exists:
  apps/${oppositeWorkspace.dirName}`,
          suggestedCmd,
          io,
          () => dispatch(oppositeScope, rawArgs, io, rootDir)
        )
      }

      return promptSuggestion(
        `Workspace "${targetName}" was not found.

A package with this name exists:
  packages/${oppositeWorkspace.dirName}`,
        suggestedCmd,
        io,
        () => dispatch(oppositeScope, rawArgs, io, rootDir)
      )
    }

    const available = discoverWorkspaces(currentType, rootDir).map((item) => item.dirName)
    stderr(`Unknown ${entityLabel} "${targetName}".

Available ${directoryLabel}:
${formatAvailableList(available)}`)
    return 1
  }

  const command = secondArg
  const workspaceTasks = discoverWorkspaceTasks(workspace, rootDir)
  const workspaceTaskSet = new Set(workspaceTasks)

  if (!command) {
    printWorkspaceTaskUsage(scope, workspace.dirName, workspaceTasks, stderr)
    return 1
  }

  if (command === 'secrets') {
    const envArg = restArgs[0] || 'dev'
    return runResolvedCommand(
      {
        cmd: ['bun'],
        args: ['scripts/cli/entries/secrets.ts', envArg, workspace.dirName],
      },
      rootDir,
      spawnFn
    )
  }

  if (isPackageMgmtCommand(command)) {
    if (command !== 'install' && restArgs.length === 0) {
      stderr(printMissingPackageUsage(scope, command, workspace.dirName))
      return 1
    }

    return runResolvedCommand(
      resolveWorkspacePackageMgmt(command, workspace, restArgs),
      rootDir,
      spawnFn
    )
  }

  if (!workspaceTaskSet.has(command)) {
    return handleUnknownTask(
      scope,
      command,
      workspaceTasks,
      restArgs,
      workspace.dirName,
      io,
      async (correctedTask) =>
        runResolvedCommand(resolveTurboTask(correctedTask, restArgs, workspace), rootDir, spawnFn)
    )
  }

  return runResolvedCommand(resolveTurboTask(command, restArgs, workspace), rootDir, spawnFn)
}
