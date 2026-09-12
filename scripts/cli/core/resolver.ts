/**
 * Resolve Bun and Turbo invocations for each scope.
 *
 * @packageDocumentation
 */

import type { PackageMgmtCommand, Scope, WorkspaceInfo } from './types'

export interface ResolvedInvocation {
  cmd: string[]
  args: string[]
}

export function resolveRootPackageMgmt(
  command: PackageMgmtCommand,
  commandArgs: string[]
): ResolvedInvocation {
  return {
    cmd: ['bun'],
    args: [command, ...commandArgs],
  }
}

export function resolveWorkspacePackageMgmt(
  command: PackageMgmtCommand,
  workspace: WorkspaceInfo,
  commandArgs: string[]
): ResolvedInvocation {
  if (command === 'install') {
    return {
      cmd: ['bun'],
      args: ['install', '--filter', workspace.name, ...commandArgs],
    }
  }

  return {
    cmd: ['bun'],
    args: [command, '--filter', workspace.name, ...commandArgs],
  }
}

export function resolveTurboTask(
  task: string,
  taskArgs: string[],
  workspace?: WorkspaceInfo
): ResolvedInvocation {
  const passthrough = workspace && taskArgs.length > 0 ? ['--', ...taskArgs] : []
  const args = workspace
    ? [
        'turbo',
        'run',
        task,
        `--filter=./${workspace.type === 'app' ? 'apps' : 'packages'}/${workspace.dirName}`,
        ...passthrough,
      ]
    : ['turbo', 'run', task, ...taskArgs]

  return {
    cmd: ['bun'],
    args,
  }
}

export function formatScopeCommand(
  scope: Scope,
  commandParts: string[],
  workspaceDirName?: string
): string {
  const tail = commandParts.filter(Boolean).join(' ')
  if (scope === 'root') return `bun root ${tail}`
  return `bun ${scope} ${workspaceDirName} ${tail}`
}
