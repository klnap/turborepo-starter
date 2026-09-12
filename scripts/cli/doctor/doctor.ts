/**
 * Repository doctor — read-only configuration and environment diagnostics.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { collectDependencyOwnershipIssues } from '../../audit/lint-deps'
import { GRAPHVIZ_INSTALL_HINT, hasGraphviz } from '../../shared/graphviz'
import { ROOT_DIR } from '../../shared/paths'
import {
  missingPlaywrightBrowsers,
  playwrightInstallCommand,
} from '../../shared/playwright-browsers'
import { spawnInherit } from '../../shared/spawn'
import { workspacesWithCapability } from '../../shared/workspace-capabilities'
import { discoverWorkspaces } from '../core/discovery'
import type { RunnerIO } from '../core/types'
import {
  type DoctorCheck,
  type DoctorReport,
  doctorExitCode,
  summarizeDoctorReport,
} from './checks'

export interface DoctorOptions {
  verbose?: boolean
  json?: boolean
}

export interface DoctorEnvironment {
  bunVersion?: string
  hasGit?: boolean
  hasDocker?: boolean
  spawn?: (cmd: string[], args: string[], cwd: string) => Promise<number>
}

function push(
  checks: DoctorCheck[],
  section: string,
  name: string,
  status: DoctorCheck['status'],
  message?: string
): void {
  checks.push({ section, name, status, message })
}

function readJsonFile<T>(filePath: string): T | undefined {
  if (!fs.existsSync(filePath)) return undefined
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
  } catch {
    return undefined
  }
}

function parseBunEngineRequirement(engines?: { bun?: string }): string | undefined {
  return engines?.bun
}

function bunVersionSatisfies(current: string, requirement?: string): boolean {
  if (!requirement) return true

  const match = requirement.match(/>=\s*(\d+\.\d+\.\d+)/)
  if (!match?.[1]) return true

  const required = match[1].split('.').map(Number)
  const actual = current.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const req = required[i] ?? 0
    const act = actual[i] ?? 0
    if (act > req) return true
    if (act < req) return false
  }

  return true
}

async function commandExists(
  cmd: string[],
  args: string[],
  cwd: string,
  spawn: DoctorEnvironment['spawn']
): Promise<boolean> {
  if (!spawn) return false
  try {
    const code = await spawn(cmd, args, cwd)
    return code === 0
  } catch {
    return false
  }
}

function collectWorkspaceNameCollisions(rootDir: string): string[] {
  const names = new Map<string, string[]>()

  for (const type of ['app', 'package'] as const) {
    for (const workspace of discoverWorkspaces(type, rootDir)) {
      const existing = names.get(workspace.name) ?? []
      existing.push(`${workspace.type}:${workspace.dirName}`)
      names.set(workspace.name, existing)
    }
  }

  const collisions: string[] = []
  for (const [name, locations] of names) {
    if (locations.length > 1) {
      collisions.push(`${name} (${locations.join(', ')})`)
    }
  }

  return collisions
}

function collectInvalidWorkspaceReferences(rootDir: string): string[] {
  const issues: string[] = []
  const workspaceNames = new Set<string>()

  for (const type of ['app', 'package'] as const) {
    for (const workspace of discoverWorkspaces(type, rootDir)) {
      workspaceNames.add(workspace.name)
    }
  }

  for (const type of ['app', 'package'] as const) {
    for (const workspace of discoverWorkspaces(type, rootDir)) {
      const pkgPath = path.join(workspace.dirPath, 'package.json')
      const pkg = readJsonFile<{
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
        peerDependencies?: Record<string, string>
      }>(pkgPath)

      if (!pkg) continue

      const depSections = [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]
      for (const section of depSections) {
        if (!section) continue
        for (const [dep, version] of Object.entries(section)) {
          if (!version.startsWith('workspace:')) continue
          const target = version.replace(/^workspace:/, '')
          const resolved = target === '*' ? dep : target
          if (!workspaceNames.has(resolved)) {
            issues.push(`${workspace.dirName} references missing workspace '${resolved}'`)
          }
        }
      }
    }
  }

  return issues
}

function collectAppToAppDependencies(rootDir: string): string[] {
  const issues: string[] = []
  const appNames = new Set(discoverWorkspaces('app', rootDir).map((workspace) => workspace.name))

  for (const workspace of discoverWorkspaces('app', rootDir)) {
    const pkg = readJsonFile<{
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }>(path.join(workspace.dirPath, 'package.json'))

    if (!pkg) continue

    for (const section of [pkg.dependencies, pkg.devDependencies]) {
      if (!section) continue
      for (const dep of Object.keys(section)) {
        if (appNames.has(dep) && dep !== workspace.name) {
          issues.push(`${workspace.dirName} depends on app package '${dep}'`)
        }
      }
    }
  }

  return issues
}

export async function runDoctorChecks(
  rootDir: string = ROOT_DIR,
  env: DoctorEnvironment = {}
): Promise<DoctorReport> {
  const checks: DoctorCheck[] = []
  const spawn = env.spawn ?? spawnInherit
  const bunVersion = env.bunVersion ?? Bun.version
  const rootPkg = readJsonFile<{
    workspaces?: string[]
    engines?: { bun?: string; node?: string }
    devDependencies?: Record<string, string>
  }>(path.join(rootDir, 'package.json'))

  push(checks, 'Environment', 'Bun', 'pass', bunVersion)
  const bunRequirement = parseBunEngineRequirement(rootPkg?.engines)
  if (!bunVersionSatisfies(bunVersion, bunRequirement)) {
    push(
      checks,
      'Environment',
      'Bun version',
      'fail',
      `Required ${bunRequirement ?? 'unknown'}, found ${bunVersion}`
    )
  } else if (bunRequirement) {
    push(checks, 'Environment', 'Bun version', 'pass', bunRequirement)
  }

  const hasGit = env.hasGit ?? (await commandExists(['git'], ['--version'], rootDir, spawn))
  push(checks, 'Environment', 'Git', hasGit ? 'pass' : 'fail')

  const dockerRequired = fs.existsSync(path.join(rootDir, '.github', 'workflows', 'docker.yml'))
  const hasDocker =
    env.hasDocker ?? (await commandExists(['docker'], ['--version'], rootDir, spawn))
  if (dockerRequired) {
    push(
      checks,
      'Environment',
      'Docker',
      hasDocker ? 'pass' : 'fail',
      hasDocker ? undefined : 'fix: install Docker — https://docs.docker.com/get-docker/'
    )
  } else {
    push(checks, 'Environment', 'Docker', 'optional', hasDocker ? 'installed' : 'not installed')
  }

  push(
    checks,
    'Environment',
    'Graphviz',
    'optional',
    hasGraphviz() ? 'installed' : `not installed — ${GRAPHVIZ_INSTALL_HINT}`
  )

  const requiredRepoFiles = [
    { name: 'package.json', path: 'package.json' },
    { name: 'bun.lock', path: 'bun.lock' },
    { name: 'turbo.json', path: 'turbo.json' },
  ]

  for (const file of requiredRepoFiles) {
    push(
      checks,
      'Repository',
      file.name,
      fs.existsSync(path.join(rootDir, file.path)) ? 'pass' : 'fail'
    )
  }

  const workspaces = rootPkg?.workspaces ?? []
  const hasWorkspacePatterns = workspaces.includes('apps/*') && workspaces.includes('packages/*')
  push(
    checks,
    'Repository',
    'workspace patterns',
    hasWorkspacePatterns ? 'pass' : 'fail',
    workspaces.join(', ') || 'missing'
  )

  const apps = discoverWorkspaces('app', rootDir)
  const packages = discoverWorkspaces('package', rootDir)

  const appsDir = path.join(rootDir, 'apps')
  const packagesDir = path.join(rootDir, 'packages')

  if (fs.existsSync(appsDir)) {
    for (const workspace of apps) {
      const pkgPath = path.join(workspace.dirPath, 'package.json')
      const valid =
        fs.existsSync(pkgPath) && Boolean(readJsonFile<{ name?: string }>(pkgPath)?.name)
      push(checks, 'Workspaces', `apps/${workspace.dirName}`, valid ? 'pass' : 'fail')
    }
  } else {
    push(checks, 'Workspaces', 'apps', 'warn', 'apps directory missing')
  }

  if (fs.existsSync(packagesDir)) {
    for (const workspace of packages) {
      const pkgPath = path.join(workspace.dirPath, 'package.json')
      const valid =
        fs.existsSync(pkgPath) && Boolean(readJsonFile<{ name?: string }>(pkgPath)?.name)
      push(checks, 'Workspaces', `packages/${workspace.dirName}`, valid ? 'pass' : 'fail')
    }
    if (packages.length === 0) {
      push(checks, 'Workspaces', 'packages', 'pass', 'no packages configured')
    }
  } else if (workspaces.includes('packages/*')) {
    push(checks, 'Workspaces', 'packages', 'pass', 'not present')
  } else {
    push(checks, 'Workspaces', 'packages', 'pass', 'not configured')
  }

  const collisions = collectWorkspaceNameCollisions(rootDir)
  push(
    checks,
    'Workspaces',
    'unique names',
    collisions.length === 0 ? 'pass' : 'fail',
    collisions.join('; ') || undefined
  )

  const cliEntries = ['root', 'workspace', 'package'] as const
  for (const entry of cliEntries) {
    const entryPath = path.join(rootDir, 'scripts', 'cli', 'entries', `${entry}.ts`)
    push(checks, 'CLI', entry, fs.existsSync(entryPath) ? 'pass' : 'fail')
  }

  push(
    checks,
    'CLI',
    'discovery',
    apps.length + packages.length > 0 ? 'pass' : 'warn',
    `${apps.length} apps, ${packages.length} packages`
  )

  push(
    checks,
    'Dependencies',
    'lockfile',
    fs.existsSync(path.join(rootDir, 'bun.lock')) ? 'pass' : 'fail'
  )

  const ownershipIssues = collectDependencyOwnershipIssues(rootDir)
  push(
    checks,
    'Dependencies',
    'workspace ownership',
    ownershipIssues.length === 0 ? 'pass' : 'fail',
    ownershipIssues[0]?.message
  )

  const invalidWorkspaceRefs = collectInvalidWorkspaceReferences(rootDir)
  push(
    checks,
    'Architecture',
    'workspace references',
    invalidWorkspaceRefs.length === 0 ? 'pass' : 'fail',
    invalidWorkspaceRefs[0]
  )

  const appToApp = collectAppToAppDependencies(rootDir)
  push(
    checks,
    'Architecture',
    'workspace boundaries',
    appToApp.length === 0 ? 'pass' : 'warn',
    appToApp[0]
  )

  const toolingFiles = [
    { name: 'Turbo', file: 'turbo.json' },
    { name: 'TypeScript', file: 'tsconfig.json' },
    { name: 'Biome', file: 'biome.json' },
    { name: 'Oxlint', file: '.oxlintrc.json' },
  ]

  for (const tool of toolingFiles) {
    const exists = fs.existsSync(path.join(rootDir, tool.file))
    if (tool.name === 'Oxlint') {
      const inRootPkg = Boolean(rootPkg?.devDependencies?.oxlint)
      push(
        checks,
        'Tooling',
        tool.name,
        exists || inRootPkg ? 'pass' : 'warn',
        exists ? undefined : 'configured via package.json'
      )
      continue
    }
    push(
      checks,
      'Tooling',
      tool.name,
      exists ? 'pass' : tool.name === 'TypeScript' ? 'warn' : 'fail'
    )
  }

  push(
    checks,
    'Configuration',
    'git hooks',
    fs.existsSync(path.join(rootDir, '.githooks', 'pre-commit')) ? 'pass' : 'warn'
  )

  const hasSecurityWorkflow = fs.existsSync(
    path.join(rootDir, '.github', 'workflows', 'security.yml')
  )
  push(
    checks,
    'Security',
    'Trivy config',
    fs.existsSync(path.join(rootDir, 'trivy.yaml'))
      ? 'pass'
      : hasSecurityWorkflow
        ? 'optional'
        : 'optional',
    hasSecurityWorkflow ? 'not configured' : 'not configured'
  )

  push(
    checks,
    'Security',
    'gitleaks workflow',
    fs.existsSync(path.join(rootDir, '.github', 'workflows', 'gitleaks.yml')) ? 'pass' : 'optional',
    'not configured'
  )

  for (const workspace of workspacesWithCapability('e2e', rootDir)) {
    const missing = missingPlaywrightBrowsers(workspace.dirPath)
    if (missing.length === 0) {
      push(checks, 'E2E', `Playwright (${workspace.dirName})`, 'pass', 'browsers installed')
      continue
    }

    push(
      checks,
      'E2E',
      `Playwright ${missing.join(', ')} (${workspace.dirName})`,
      'fail',
      `fix: ${playwrightInstallCommand(workspace.dirName)}`
    )
  }

  return {
    status: summarizeDoctorReport(checks),
    checks,
  }
}

function formatDoctorLine(check: DoctorCheck): string {
  const icon =
    check.status === 'fail'
      ? '✗'
      : check.status === 'optional'
        ? '○'
        : check.status === 'warn'
          ? '○'
          : '✓'
  const suffix = check.message ? ` — ${check.message}` : ''
  return `  ${icon} ${check.name}${suffix}`
}

function printDoctorReport(report: DoctorReport, io: RunnerIO, verbose: boolean): void {
  const sections = new Map<string, DoctorCheck[]>()
  for (const check of report.checks) {
    const group = sections.get(check.section) ?? []
    group.push(check)
    sections.set(check.section, group)
  }

  io.stdout('Repository Doctor')
  io.stdout('')

  for (const [section, sectionChecks] of sections) {
    io.stdout(section)
    for (const check of sectionChecks) {
      if (!verbose && check.status === 'pass' && check.message && check.name !== 'Bun') {
        io.stdout(`  ✓ ${check.name}`)
        continue
      }
      io.stdout(formatDoctorLine(check))
    }
    io.stdout('')
  }

  const result =
    report.status === 'healthy'
      ? 'HEALTHY'
      : report.status === 'warnings'
        ? 'WARNINGS'
        : 'UNHEALTHY'
  io.stdout(`Result: ${result}`)
}

export async function runDoctor(
  rawArgs: string[],
  io: RunnerIO,
  rootDir: string = ROOT_DIR,
  env: DoctorEnvironment = {}
): Promise<number> {
  const verbose = rawArgs.includes('--verbose')
  const json = rawArgs.includes('--json')
  const report = await runDoctorChecks(rootDir, env)

  if (json) {
    io.stdout(JSON.stringify(report, null, 2))
  } else {
    printDoctorReport(report, io, verbose)
  }

  return doctorExitCode(report.status)
}
