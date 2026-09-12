/**
 * Turbo task discovery, validation, and error handling.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { discoverTurboTasks } from './discovery'
import { formatAvailableList, formatDependencyCommandList } from './errors'
import { promptSuggestion } from './prompt'
import { formatScopeCommand } from './resolver'
import type { RunnerIO, Scope, WorkspaceInfo } from './types'

export function readPackageScripts(packageJsonPath: string): string[] {
  if (!fs.existsSync(packageJsonPath)) {
    return []
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>
    }
    return Object.keys(parsed.scripts ?? {}).sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}

/** Tasks available for `bun root <task>` — all keys from turbo.json. */
export function discoverRootTasks(rootDir: string): string[] {
  return discoverTurboTasks(rootDir)
}

/** Tasks available for a workspace — intersection of turbo.json and package.json scripts. */
export function discoverWorkspaceTasks(workspace: WorkspaceInfo, rootDir: string): string[] {
  const turboTasks = new Set(discoverTurboTasks(rootDir))
  const scripts = readPackageScripts(path.join(workspace.dirPath, 'package.json'))
  return scripts.filter((script) => turboTasks.has(script))
}

export function suggestTaskTypo(input: string, candidates: string[]): string | undefined {
  if (candidates.length === 0) return undefined

  let best: { task: string; distance: number } | undefined

  for (const candidate of candidates) {
    const distance = levenshtein(input, candidate)
    if (distance > 2) continue
    if (!best || distance < best.distance) {
      best = { task: candidate, distance }
    }
  }

  return best?.task
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0))

  for (let i = 0; i < rows; i++) matrix[i]![0] = i
  for (let j = 0; j < cols; j++) matrix[0]![j] = j

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      )
    }
  }

  return matrix[a.length]![b.length]!
}

export function printWorkspaceTaskUsage(
  scope: 'ws' | 'pkg',
  workspaceDirName: string,
  tasks: string[],
  stderr: (msg: string) => void
): void {
  stderr(`Workspace: ${workspaceDirName}

Usage:
  bun ${scope} ${workspaceDirName} <command> [...args]

Available dependency commands:
${formatDependencyCommandList()}

Available tasks:
${formatAvailableList(tasks)}

Examples:
  bun ${scope} ${workspaceDirName} typecheck
  bun ${scope} ${workspaceDirName} test
  bun ${scope} ${workspaceDirName} build`)
}

export async function handleUnknownTask(
  scope: Scope,
  task: string,
  availableTasks: string[],
  taskArgs: string[],
  workspaceDirName: string | undefined,
  io: RunnerIO,
  onAccept: (correctedTask: string) => Promise<number>
): Promise<number> {
  const { stderr } = io
  const suggestion = suggestTaskTypo(task, availableTasks)

  if (!suggestion) {
    stderr(`Unknown task "${task}".

Available tasks:
${formatAvailableList(availableTasks)}`)
    return 1
  }

  const suggestedCmd = formatScopeCommand(scope, [suggestion, ...taskArgs], workspaceDirName)

  return promptSuggestion(`Unknown task "${task}".`, suggestedCmd, io, () => onAccept(suggestion), {
    nonInteractiveLabel: 'did-you-mean',
  })
}
