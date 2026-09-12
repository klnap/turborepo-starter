/**
 * Workspace capability discovery — single source for CI matrices and doctor.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { discoverWorkspaces } from '../cli/core/discovery'
import { readPackageScripts } from '../cli/core/tasks'
import { ROOT_DIR } from './paths'

export type WorkspaceCapability =
  | 'e2e'
  | 'visual'
  | 'storybook'
  | 'lighthouse'
  | 'checkly'
  | 'next-bundle'
  | 'mutation'

export interface WorkspaceCapabilityInfo {
  dirName: string
  relativePath: string
  dirPath: string
  type: 'app' | 'package'
  capabilities: WorkspaceCapability[]
}

const E2E_BROWSERS = ['chromium', 'firefox', 'webkit'] as const
export type E2eBrowser = (typeof E2E_BROWSERS)[number]

export function e2eBrowsers(): readonly E2eBrowser[] {
  return E2E_BROWSERS
}

function hasScript(scripts: string[], name: string): boolean {
  return scripts.includes(name)
}

function detectCapabilities(
  workspaceRoot: string,
  scripts: string[],
  type: 'app' | 'package'
): WorkspaceCapability[] {
  const capabilities: WorkspaceCapability[] = []

  if (
    hasScript(scripts, 'test:e2e') ||
    fs.existsSync(path.join(workspaceRoot, 'playwright.config.ts'))
  ) {
    capabilities.push('e2e')
  }

  if (
    hasScript(scripts, 'visual') ||
    fs.existsSync(path.join(workspaceRoot, 'tests', 'e2e', 'visual-storybook.spec.ts'))
  ) {
    capabilities.push('visual')
  }

  if (
    hasScript(scripts, 'storybook') ||
    hasScript(scripts, 'build-storybook') ||
    fs.existsSync(path.join(workspaceRoot, '.storybook'))
  ) {
    capabilities.push('storybook')
  }

  if (
    fs.existsSync(path.join(workspaceRoot, 'lighthouserc.cjs')) ||
    fs.existsSync(path.join(workspaceRoot, 'lighthouse.config.ts'))
  ) {
    capabilities.push('lighthouse')
  }

  if (
    hasScript(scripts, 'checkly:test') ||
    fs.existsSync(path.join(workspaceRoot, 'checkly.config.ts'))
  ) {
    capabilities.push('checkly')
  }

  if (hasScript(scripts, 'test:mutation')) {
    capabilities.push('mutation')
  }

  if (type === 'app') {
    const pkgPath = path.join(workspaceRoot, 'package.json')
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
          dependencies?: Record<string, string>
          devDependencies?: Record<string, string>
        }
        const deps = { ...pkg.dependencies, ...pkg.devDependencies }
        if (deps.next) {
          capabilities.push('next-bundle')
        }
      } catch {
        // ignore malformed package.json
      }
    }
  }

  return capabilities
}

export function discoverWorkspaceCapabilities(
  rootDir: string = ROOT_DIR
): WorkspaceCapabilityInfo[] {
  const results: WorkspaceCapabilityInfo[] = []

  for (const type of ['app', 'package'] as const) {
    for (const workspace of discoverWorkspaces(type, rootDir)) {
      const scripts = readPackageScripts(path.join(workspace.dirPath, 'package.json'))
      results.push({
        dirName: workspace.dirName,
        relativePath: `${type === 'app' ? 'apps' : 'packages'}/${workspace.dirName}`,
        dirPath: workspace.dirPath,
        type,
        capabilities: detectCapabilities(workspace.dirPath, scripts, type),
      })
    }
  }

  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

export function workspacesWithCapability(
  capability: WorkspaceCapability,
  rootDir: string = ROOT_DIR
): WorkspaceCapabilityInfo[] {
  return discoverWorkspaceCapabilities(rootDir).filter((workspace) =>
    workspace.capabilities.includes(capability)
  )
}

export interface E2eBrowserMatrixEntry {
  workspace: string
  browser: E2eBrowser
}

export function e2eBrowserMatrix(rootDir: string = ROOT_DIR): E2eBrowserMatrixEntry[] {
  const entries: E2eBrowserMatrixEntry[] = []
  for (const workspace of workspacesWithCapability('e2e', rootDir)) {
    for (const browser of E2E_BROWSERS) {
      entries.push({ workspace: workspace.dirName, browser })
    }
  }
  return entries
}
