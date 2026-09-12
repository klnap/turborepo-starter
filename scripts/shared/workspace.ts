/**
 * Workspace root resolution for reusable monorepo tooling.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { APPS_DIR, PACKAGES_DIR, ROOT_DIR } from './paths'

function isWorkspaceRoot(dir: string): boolean {
  if (!fs.existsSync(path.join(dir, 'package.json'))) return false

  const relApp = path.relative(APPS_DIR, dir)
  if (!relApp.startsWith('..') && !path.isAbsolute(relApp)) return true

  const relPkg = path.relative(PACKAGES_DIR, dir)
  if (!fs.existsSync(PACKAGES_DIR)) return false
  return !relPkg.startsWith('..') && !path.isAbsolute(relPkg)
}

/**
 * Resolves the nearest workspace root (`apps/*` or `packages/*`) from `cwd`.
 */
export function resolveWorkspaceRoot(cwd = process.cwd()): string {
  let dir = path.resolve(cwd)

  while (true) {
    if (isWorkspaceRoot(dir)) return dir

    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  throw new Error(
    `Not inside a monorepo workspace (apps/* or packages/*). cwd=${path.resolve(cwd)}`
  )
}

/**
 * Workspace-local generated output directory.
 */
export function workspaceGeneratedDir(workspaceRoot: string, ...segments: string[]): string {
  return path.join(workspaceRoot, '.generated', ...segments)
}

/**
 * Lists workspace directories that contain a given opt-in marker file.
 */
export function listWorkspacesWithFile(
  relativeFile: string,
  roots: string[] = [APPS_DIR, PACKAGES_DIR]
): string[] {
  const found: string[] = []

  for (const root of roots) {
    if (!fs.existsSync(root)) continue

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const workspaceRoot = path.join(root, entry.name)
      if (fs.existsSync(path.join(workspaceRoot, relativeFile))) {
        found.push(workspaceRoot)
      }
    }
  }

  return found.sort()
}

export { ROOT_DIR }
