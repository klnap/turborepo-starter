/**
 * Repository drift audit — links, gates, CI assumptions, turbo/script alignment.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { discoverTurboTasks, discoverWorkspaces } from '../cli/core/discovery'
import { readPackageScripts } from '../cli/core/tasks'
import { ROOT_DIR } from '../shared/paths'
import { discoverWorkspaceCapabilities } from '../shared/workspace-capabilities'

export type AuditSeverity = 'error' | 'warning'

export interface AuditFinding {
  severity: AuditSeverity
  category: string
  message: string
  file?: string
}

export interface AuditReport {
  findings: AuditFinding[]
  passed: boolean
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  'dist',
  '.generated',
  'coverage',
])

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)]+)\)/g
const PLACEHOLDER_PREFIXES = ['<', 'http://', 'https://', 'mailto:', '#']

function isSkippableLink(target: string): boolean {
  const trimmed = target.trim()
  if (!trimmed || trimmed.startsWith('#')) return true
  if (PLACEHOLDER_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return true
  if (trimmed.includes('<') && trimmed.includes('>')) return true
  if (/^(owner\/repo|\.\.\.\/|\.\/example)/.test(trimmed)) return true
  return false
}

function collectMarkdownFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectMarkdownFiles(fullPath, files)
      continue
    }
    if (entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

function auditMarkdownLinks(rootDir: string): AuditFinding[] {
  const findings: AuditFinding[] = []
  const roots = [
    rootDir,
    path.join(rootDir, '.agents'),
    path.join(rootDir, 'apps'),
    path.join(rootDir, 'packages'),
    path.join(rootDir, 'docs'),
    path.join(rootDir, 'specs'),
  ]

  const seen = new Set<string>()
  for (const root of roots) {
    for (const file of collectMarkdownFiles(root)) {
      if (seen.has(file)) continue
      seen.add(file)

      const content = fs.readFileSync(file, 'utf8')
      for (const match of content.matchAll(MARKDOWN_LINK)) {
        const target = match[2]?.trim()
        if (!target || isSkippableLink(target)) continue

        const resolved = path.resolve(path.dirname(file), target.split('#')[0] ?? target)
        if (!fs.existsSync(resolved)) {
          findings.push({
            severity: 'error',
            category: 'markdown-links',
            message: `Broken link: ${target}`,
            file: path.relative(rootDir, file),
          })
        }
      }
    }
  }

  return findings
}

function auditWorkflowYaml(rootDir: string): AuditFinding[] {
  const findings: AuditFinding[] = []
  const workflowsDir = path.join(rootDir, '.github', 'workflows')
  if (!fs.existsSync(workflowsDir)) return findings

  for (const file of fs.readdirSync(workflowsDir)) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue
    const fullPath = path.join(workflowsDir, file)
    try {
      const content = fs.readFileSync(fullPath, 'utf8')
      if (content.includes('\t')) {
        findings.push({
          severity: 'warning',
          category: 'workflow-yaml',
          message: 'Contains tab characters',
          file: path.relative(rootDir, fullPath),
        })
      }
      Bun.YAML.parse(content)
    } catch (error) {
      findings.push({
        severity: 'error',
        category: 'workflow-yaml',
        message: error instanceof Error ? error.message : 'Invalid YAML',
        file: path.relative(rootDir, fullPath),
      })
    }
  }

  return findings
}

function auditHardcodedWorkspacePaths(rootDir: string): AuditFinding[] {
  const findings: AuditFinding[] = []
  const workflowsDir = path.join(rootDir, '.github', 'workflows')
  if (!fs.existsSync(workflowsDir)) return findings

  const allowedHardcoded = new Set(['mutation.yml'])

  for (const file of fs.readdirSync(workflowsDir)) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue
    if (allowedHardcoded.has(file)) continue

    const fullPath = path.join(workflowsDir, file)
    const content = fs.readFileSync(fullPath, 'utf8')
    const matches = content.match(/apps\/web\b/g)
    if (matches && matches.length > 0) {
      findings.push({
        severity: 'error',
        category: 'ci-workspace-paths',
        message: `Hardcoded apps/web (${matches.length} occurrence(s)) — use gh-matrix discovery`,
        file: path.relative(rootDir, fullPath),
      })
    }
  }

  return findings
}

function auditTurboScriptAlignment(rootDir: string): AuditFinding[] {
  const findings: AuditFinding[] = []
  const turboTasks = new Set(discoverTurboTasks(rootDir))

  for (const type of ['app', 'package'] as const) {
    for (const workspace of discoverWorkspaces(type, rootDir)) {
      const scripts = readPackageScripts(path.join(workspace.dirPath, 'package.json'))
      for (const script of scripts) {
        if (!turboTasks.has(script)) continue
        // turbo task exists and script exists — OK
      }

      for (const task of turboTasks) {
        if (scripts.includes(task)) continue
        // root-only turbo tasks are fine for workspaces
        const rootOnly = ['dev', 'start', 'clean', 'docs:generate']
        if (rootOnly.includes(task)) continue
      }
    }
  }

  const rootPkgPath = path.join(rootDir, 'package.json')
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8')) as {
    scripts?: Record<string, string>
  }
  const gateScripts = ['gate:quick', 'gate:full'] as const
  for (const gate of gateScripts) {
    if (!rootPkg.scripts?.[gate]) {
      findings.push({
        severity: 'error',
        category: 'gate-scripts',
        message: `Missing root script: ${gate}`,
      })
    }
  }

  return findings
}

function auditCapabilityDiscovery(rootDir: string): AuditFinding[] {
  const findings: AuditFinding[] = []
  const capabilities = discoverWorkspaceCapabilities(rootDir)
  if (capabilities.length === 0) {
    findings.push({
      severity: 'warning',
      category: 'workspace-discovery',
      message: 'No workspaces discovered',
    })
  }
  return findings
}

export function runRepoAudit(rootDir: string = ROOT_DIR): AuditReport {
  const findings: AuditFinding[] = [
    ...auditMarkdownLinks(rootDir),
    ...auditWorkflowYaml(rootDir),
    ...auditHardcodedWorkspacePaths(rootDir),
    ...auditTurboScriptAlignment(rootDir),
    ...auditCapabilityDiscovery(rootDir),
  ]

  const errors = findings.filter((finding) => finding.severity === 'error')
  return {
    findings,
    passed: errors.length === 0,
  }
}

export function formatAuditReport(report: AuditReport): string {
  const lines: string[] = ['Repository Audit', '']

  if (report.findings.length === 0) {
    lines.push('PASS — 0 errors, 0 warnings')
    return lines.join('\n')
  }

  const errors = report.findings.filter((finding) => finding.severity === 'error')
  const warnings = report.findings.filter((finding) => finding.severity === 'warning')

  for (const finding of report.findings) {
    const icon = finding.severity === 'error' ? '✗' : '○'
    const location = finding.file ? ` (${finding.file})` : ''
    lines.push(`${icon} [${finding.category}]${location}: ${finding.message}`)
  }

  lines.push('')
  lines.push(
    errors.length === 0 && warnings.length === 0
      ? 'PASS'
      : `Result: ${errors.length} error(s), ${warnings.length} warning(s)`
  )

  if (errors.length === 0 && warnings.length > 0) {
    lines.push('PASS with warnings')
  }

  return lines.join('\n')
}

export function auditExitCode(report: AuditReport): number {
  const errors = report.findings.filter((finding) => finding.severity === 'error').length
  const warnings = report.findings.filter((finding) => finding.severity === 'warning').length
  return errors > 0 || warnings > 0 ? 1 : 0
}
