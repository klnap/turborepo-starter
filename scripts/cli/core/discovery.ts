/**
 * Dynamic discovery of workspaces and Turbo tasks.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { ROOT_DIR } from '../../shared/paths'
import type { AppWorkspace, WorkspaceInfo, WorkspaceType } from './types'

export function discoverWorkspaces(
  type: WorkspaceType,
  rootDir: string = ROOT_DIR
): WorkspaceInfo[] {
  const targetDir = path.join(rootDir, type === 'app' ? 'apps' : 'packages')
  if (!fs.existsSync(targetDir)) {
    return []
  }

  const results: WorkspaceInfo[] = []

  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    const dirPath = path.join(targetDir, entry.name)
    const pkgPath = path.join(dirPath, 'package.json')

    let name = entry.name
    if (fs.existsSync(pkgPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string }
        if (parsed.name) {
          name = parsed.name
        }
      } catch {
        // Fall back to directory name
      }
    }

    results.push({
      name,
      dirName: entry.name,
      dirPath,
      type,
    })
  }

  return results.sort((a, b) => a.dirName.localeCompare(b.dirName))
}

export function findWorkspace(
  type: WorkspaceType,
  targetName: string,
  rootDir: string = ROOT_DIR
): WorkspaceInfo | undefined {
  return discoverWorkspaces(type, rootDir).find(
    (item) => item.dirName === targetName || item.name === targetName
  )
}

export function discoverApplications(rootDir: string = ROOT_DIR): AppWorkspace[] {
  return discoverWorkspaces('app', rootDir).map((workspace) => ({
    dirName: workspace.dirName,
    packageName: workspace.name,
    path: `apps/${workspace.dirName}`,
  }))
}

export function discoverTurboTasks(rootDir: string = ROOT_DIR): string[] {
  const turboPath = path.join(rootDir, 'turbo.json')
  if (!fs.existsSync(turboPath)) {
    return []
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(turboPath, 'utf8')) as {
      tasks?: Record<string, unknown>
    }
    return Object.keys(parsed.tasks ?? {}).sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}
