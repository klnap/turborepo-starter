/**
 * CLI usage text and formatted error messages.
 *
 * @packageDocumentation
 */

import { PACKAGE_MGMT_COMMANDS } from './commands'
import type { Scope, WorkspaceType } from './types'

export function formatAvailableList(items: string[]): string {
  if (items.length === 0) return '  (none)'
  return items.map((item) => `  ${item}`).join('\n')
}

function formatDependencyCommands(): string {
  return [...PACKAGE_MGMT_COMMANDS].map((command) => `  ${command}`).join('\n')
}

export function formatDependencyCommandList(): string {
  return formatDependencyCommands()
}

function formatTurboTasks(turboTasks: string[]): string {
  if (turboTasks.length === 0) return '  (none configured in turbo.json)'
  return turboTasks.map((task) => `  ${task}`).join('\n')
}

export function formatAvailableCommands(turboTasks: string[]): string {
  return `${formatDependencyCommands()}\n${formatTurboTasks(turboTasks)}`
}

export function printRootUsage(stderr: (msg: string) => void, turboTasks: string[]): void {
  stderr(`Usage:
  bun root <command> [...args]

Special commands:
  doctor
  adopt <path>
  audit

Commands:
${formatAvailableCommands(turboTasks)}

Examples:
  bun root install
  bun root add -d turbo
  bun root doctor
  bun root adopt apps/admin --dry-run
  bun run gate:quick
  bun root build`)
}

export function printWorkspaceUsage(
  scope: 'ws' | 'pkg',
  entityLabel: string,
  directoryLabel: string,
  available: string[],
  _turboTasks: string[],
  stderr: (msg: string) => void
): void {
  const exampleName = available[0] ?? entityLabel

  stderr(`Usage:
  bun ${scope} <${entityLabel}> <command> [...args]

Available ${directoryLabel}:
${formatAvailableList(available)}

Dependency commands:
${formatDependencyCommands()}

Run \`bun ${scope} <${entityLabel}>\` to list workspace-specific tasks.

Examples:
  bun ${scope} ${exampleName} install
  bun ${scope} ${exampleName} add clsx
  bun ${scope} ${exampleName} typecheck
  bun ${scope} ${exampleName} build`)
}

export function printMissingPackageUsage(
  scope: Scope,
  command: string,
  workspaceName?: string
): string {
  if (scope === 'root') {
    return `Missing package.

Usage:
  bun root ${command} <package>`
  }

  return `Missing package.

Usage:
  bun ${scope} ${workspaceName} ${command} <package>`
}

export function workspaceLabels(scope: 'ws' | 'pkg'): {
  entityLabel: string
  directoryLabel: string
  oppositeType: WorkspaceType
  currentType: WorkspaceType
  oppositeScope: Scope
} {
  const isWs = scope === 'ws'
  return {
    entityLabel: isWs ? 'app' : 'package',
    directoryLabel: isWs ? 'apps' : 'packages',
    oppositeType: isWs ? 'package' : 'app',
    currentType: isWs ? 'app' : 'package',
    oppositeScope: isWs ? 'pkg' : 'ws',
  }
}
