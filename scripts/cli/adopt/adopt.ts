/**
 * Workspace adoption — integrate external apps/packages with monorepo conventions.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { ROOT_DIR } from '../../shared/paths'
import type { RunnerIO, WorkspaceType } from '../core/types'
import { formatAdoptUsage } from './adopt-cli'
import { type AdoptToolingOption, promptAdoptTooling } from './adopt-prompt'

export interface AdoptFlags {
  dryRun?: boolean
  /** Skip interactive tooling picker; apply core integration only. */
  yes?: boolean
  visual?: boolean
  storybook?: boolean
  e2e?: boolean
  lighthouse?: boolean
}

export interface AdoptTarget {
  relativePath: string
  absolutePath: string
  type: WorkspaceType
  dirName: string
}

export interface AdoptPlan {
  target: AdoptTarget
  packageName: string
  frameworks: string[]
  existingScripts: string[]
  existingTooling: string[]
  availableTooling: string[]
  changes: AdoptChange[]
}

export type AdoptChange =
  | { kind: 'create-file'; path: string; content: string }
  | { kind: 'append-file'; path: string; content: string }
  | { kind: 'add-script'; name: string; command: string }
  | { kind: 'add-engines'; engines: Record<string, string> }

/** Idempotency marker — appended to existing AGENTS.md from external generators. */
export const ADOPT_AGENTS_MARKER = '<!-- turborepo-starter:adopt -->'
const LEGACY_ADOPT_MARKERS = ['<!-- turborepo-full-starter:adopt -->']

function agentsHasAdoptMarker(content: string): boolean {
  if (content.includes(ADOPT_AGENTS_MARKER)) return true
  return LEGACY_ADOPT_MARKERS.some((marker) => content.includes(marker))
}

export class AdoptError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdoptError'
  }
}

function readPackageJson(packageJsonPath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>
}

function writePackageJson(packageJsonPath: string, pkg: Record<string, unknown>): void {
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

export function resolveAdoptTarget(rawPath: string, rootDir: string = ROOT_DIR): AdoptTarget {
  const trimmed = rawPath.trim()
  if (!trimmed) {
    throw new AdoptError('Workspace path is required.\n\nUsage:\n  bun root adopt <path>')
  }

  if (trimmed.split(/[/\\]/).includes('..')) {
    throw new AdoptError('Path is outside the repository.')
  }

  const absolutePath = path.resolve(rootDir, trimmed)
  const relativePath = path.relative(rootDir, absolutePath)

  if (relativePath === '' || relativePath === '.') {
    throw new AdoptError('Repository root cannot be adopted as a workspace.')
  }

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new AdoptError('Path is outside the repository.')
  }

  const segments = relativePath.split(path.sep)
  if (segments.length !== 2 || (segments[0] !== 'apps' && segments[0] !== 'packages')) {
    throw new AdoptError('Directory is not a workspace.')
  }

  if (!fs.existsSync(absolutePath)) {
    throw new AdoptError(`Workspace "${trimmed}" was not found.`)
  }

  const packageJsonPath = path.join(absolutePath, 'package.json')
  if (!fs.existsSync(packageJsonPath)) {
    throw new AdoptError('Directory is not a workspace.')
  }

  return {
    relativePath: relativePath.split(path.sep).join('/'),
    absolutePath,
    type: segments[0] === 'apps' ? 'app' : 'package',
    dirName: segments[1]!,
  }
}

export function detectFrameworks(pkg: Record<string, unknown>, workspaceRoot: string): string[] {
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  }

  const frameworks: string[] = []
  if (
    deps.next ||
    fs.existsSync(path.join(workspaceRoot, 'next.config.ts')) ||
    fs.existsSync(path.join(workspaceRoot, 'next.config.mjs'))
  ) {
    frameworks.push('next')
  }
  if (deps.payload) {
    frameworks.push('payload')
  }
  if (deps.vite || fs.existsSync(path.join(workspaceRoot, 'vite.config.ts'))) {
    frameworks.push('vite')
  }
  if (deps.react) {
    frameworks.push('react')
  }

  return frameworks
}

function rootScriptCommand(workspaceRoot: string, rootDir: string, scriptFile: string): string {
  const rel = path.relative(workspaceRoot, path.join(rootDir, 'scripts', scriptFile))
  return `bun ${rel.split(path.sep).join('/')}`
}

function workspaceScriptCommand(scriptFile: string): string {
  return `bun scripts/${scriptFile}`
}

function detectExistingTooling(workspaceRoot: string, pkg: Record<string, unknown>): string[] {
  const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {}
  const tooling: string[] = []

  if (
    scripts.visual ||
    fs.existsSync(path.join(workspaceRoot, 'tests', 'e2e', 'visual-storybook.spec.ts'))
  ) {
    tooling.push('visual')
  }
  if (
    scripts.storybook ||
    scripts['build-storybook'] ||
    fs.existsSync(path.join(workspaceRoot, '.storybook'))
  ) {
    tooling.push('storybook')
  }
  if (scripts.lighthouse || fs.existsSync(path.join(workspaceRoot, 'lighthouserc.cjs'))) {
    tooling.push('lighthouse')
  }
  if (scripts['test:e2e'] || fs.existsSync(path.join(workspaceRoot, 'playwright.config.ts'))) {
    tooling.push('e2e')
  }
  if (scripts['coupling-graph']) {
    tooling.push('coupling-graph')
  }

  return tooling
}

function listAvailableTooling(targetType: WorkspaceType): string[] {
  if (targetType !== 'app') {
    return ['coupling-graph']
  }
  return ['visual', 'storybook', 'lighthouse', 'e2e', 'coupling-graph']
}

export function buildAdoptToolingOptions(
  target: AdoptTarget,
  _rootDir: string = ROOT_DIR
): AdoptToolingOption[] {
  const packageJsonPath = path.join(target.absolutePath, 'package.json')
  const pkg = readPackageJson(packageJsonPath)
  const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {}
  const existing = new Set(detectExistingTooling(target.absolutePath, pkg))
  const isApp = target.type === 'app'

  return [
    {
      id: 'visual',
      label: 'Visual regression (Storybook + Playwright)',
      hint: 'adds scripts.visual',
      available: isApp,
      alreadyConfigured: existing.has('visual') || Boolean(scripts.visual),
    },
    {
      id: 'storybook',
      label: 'Storybook dev + static build',
      hint: 'storybook, build-storybook',
      available: isApp,
      alreadyConfigured: existing.has('storybook'),
    },
    {
      id: 'e2e',
      label: 'Playwright E2E',
      hint: 'test:e2e, test:e2e:install',
      available: isApp,
      alreadyConfigured: existing.has('e2e'),
    },
    {
      id: 'lighthouse',
      label: 'Lighthouse CI',
      hint: 'requires apps/<app>/scripts/lighthouse/',
      available: isApp,
      alreadyConfigured: existing.has('lighthouse'),
    },
  ]
}

function hasExplicitToolingFlags(flags: AdoptFlags): boolean {
  return Boolean(flags.visual || flags.storybook || flags.e2e || flags.lighthouse)
}

export async function resolveAdoptToolingFlags(
  target: AdoptTarget,
  flags: AdoptFlags,
  io: RunnerIO,
  rootDir: string = ROOT_DIR
): Promise<AdoptFlags | null> {
  if (flags.yes || hasExplicitToolingFlags(flags) || !io.isTTY) {
    return flags
  }

  const options = buildAdoptToolingOptions(target, rootDir)
  if (options.filter((option) => option.available && !option.alreadyConfigured).length === 0) {
    return flags
  }

  const pick = await promptAdoptTooling(target.relativePath, options, io)
  if (pick.cancelled) {
    return null
  }

  return {
    ...flags,
    ...pick.flags,
  }
}

function relativeToRepoRoot(relativePath: string): string {
  const depth = relativePath.split('/').length
  return `${'../'.repeat(depth)}`
}

function agentsMonorepoBody(target: AdoptTarget): string {
  const root = relativeToRepoRoot(target.relativePath)
  const scopeCmd = target.type === 'app' ? `bun ws ${target.dirName}` : `bun pkg ${target.dirName}`
  const localRun =
    target.type === 'app'
      ? `cd apps/${target.dirName} && bun run <script>`
      : `cd packages/${target.dirName} && bun run <script>`

  const workspaceOnlyNote =
    target.type === 'app'
      ? `\`bun ws\` lists only tasks in **both** \`turbo.json\` and this \`package.json\`. Scripts like \`test:watch\` or \`test:e2e:ui\` are local dev helpers — not missing from the CLI. See [cli.md — Workspace-only scripts](${root}docs/cli.md#workspace-only-scripts-not-a-cli-bug).\n\n`
      : ''

  const specsBlock =
    target.type === 'app'
      ? `## Specs and ADRs

- Tier-2 specs: [specs/](./specs/)
- Module specs: \`src/modules/<module>/specs/\`
- App ADRs: \`docs/adr/\` when you record durable decisions

`
      : `## Specs

Package specs: [specs/](./specs/).

`

  const skillsBlock =
    target.type === 'app'
      ? `## Skills

- Router: [${root}.agents/skills/INDEX.md](${root}.agents/skills/INDEX.md)
- Workspace skills (optional): \`apps/${target.dirName}/.agents/skills/\`
`
      : `## Skills

- Router: [${root}.agents/skills/INDEX.md](${root}.agents/skills/INDEX.md)
`

  return `## Commands (scoped CLI)

Every install and Turbo task needs explicit scope — [docs/cli.md](${root}docs/cli.md). Command tables: [docs/commands.md](${root}docs/commands.md).

| Intent | Command |
| :--- | :--- |
| Install dependency | \`${scopeCmd} add <pkg>\` |
| Run Turbo task | \`${scopeCmd} <task>\` |
| List Turbo tasks | \`${scopeCmd}\` (no task argument) |
| Workspace-only script | \`${localRun}\` |

${workspaceOnlyNote}Validate: \`bun run gate:quick\` → \`gate:push\` → \`gate:full\` (optional).

${specsBlock}${skillsBlock}`
}

/** Appended when AGENTS.md already exists (e.g. create-next-app). Does not remove generator content. */
export function agentsMdAppendix(target: AdoptTarget): string {
  const root = relativeToRepoRoot(target.relativePath)
  const intro =
    target.type === 'app'
      ? `This app is a Bun workspace under \`${target.relativePath}/\`. Rules above (e.g. from the framework generator) stay in effect. Also follow [root AGENTS.md](${root}AGENTS.md) and [apps/AGENTS.md](${root}apps/AGENTS.md).`
      : `This package is a Bun workspace under \`${target.relativePath}/\`. Rules above stay in effect. Also follow [root AGENTS.md](${root}AGENTS.md).`

  return `

${ADOPT_AGENTS_MARKER}

## Monorepo integration

${intro}

${agentsMonorepoBody(target)}`
}

function agentsMdContent(target: AdoptTarget): string {
  const root = relativeToRepoRoot(target.relativePath)

  if (target.type === 'app') {
    return `# ${target.dirName} Application (AGENTS.md)

Inherits root [AGENTS.md](${root}AGENTS.md). Apps layer: [apps/AGENTS.md](${root}apps/AGENTS.md).

${ADOPT_AGENTS_MARKER}

${agentsMonorepoBody(target)}## Workspace-specific rules

Add layout, boundaries, and framework rules here. Starter reference (patterns only): \`apps/web/AGENTS.md\`.
`
  }

  return `# ${target.dirName} Package (AGENTS.md)

Inherits root [AGENTS.md](${root}AGENTS.md).

${ADOPT_AGENTS_MARKER}

${agentsMonorepoBody(target)}## Workspace-specific rules

Document public API (\`exports\`), versioning, and boundaries. Do not duplicate root rules.
`
}

function specsReadmeContent(target: AdoptTarget): string {
  const root = relativeToRepoRoot(target.relativePath)

  if (target.type === 'app') {
    return `# Workspace Specs (\`${target.relativePath}/specs/\`)

Tier-2 specifications for this application: routing, layouts, cross-module providers, and workspace-wide behavior.

- **Template**: [${root}specs/TEMPLATE.md](${root}specs/TEMPLATE.md)
- **Module-level specs**: \`src/modules/<module-name>/specs/\`
- **Global specs**: [${root}specs/](${root}specs/)
- **Workflow**: [${root}docs/guides/feature-development.md](${root}docs/guides/feature-development.md)
`
  }

  return `# Package Specs (\`${target.relativePath}/specs/\`)

Specifications for this shared library: public API, behavior, and breaking-change policy.

- **Template**: [${root}specs/TEMPLATE.md](${root}specs/TEMPLATE.md)
- **Global specs**: [${root}specs/](${root}specs/)
- **Workflow**: [${root}docs/guides/feature-development.md](${root}docs/guides/feature-development.md)
`
}

function maybeScaffoldDocs(target: AdoptTarget, changes: AdoptChange[]): void {
  const agentsPath = path.join(target.absolutePath, 'AGENTS.md')
  if (!fs.existsSync(agentsPath)) {
    changes.push({
      kind: 'create-file',
      path: agentsPath,
      content: agentsMdContent(target),
    })
  } else {
    const existing = fs.readFileSync(agentsPath, 'utf8')
    if (!agentsHasAdoptMarker(existing)) {
      changes.push({
        kind: 'append-file',
        path: agentsPath,
        content: agentsMdAppendix(target),
      })
    }
  }

  const specsDir = path.join(target.absolutePath, 'specs')
  const specsReadmePath = path.join(specsDir, 'README.md')
  if (!fs.existsSync(specsReadmePath)) {
    changes.push({
      kind: 'create-file',
      path: specsReadmePath,
      content: specsReadmeContent(target),
    })
  }
}

export function buildAdoptPlan(
  target: AdoptTarget,
  rootDir: string = ROOT_DIR,
  flags: AdoptFlags = {}
): AdoptPlan {
  const packageJsonPath = path.join(target.absolutePath, 'package.json')
  const pkg = readPackageJson(packageJsonPath)
  const packageName = String(pkg.name ?? target.dirName)
  const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {}
  const frameworks = detectFrameworks(pkg, target.absolutePath)
  const existingTooling = detectExistingTooling(target.absolutePath, pkg)
  const availableTooling = listAvailableTooling(target.type)
  const changes: AdoptChange[] = []

  const turboJsonPath = path.join(target.absolutePath, 'turbo.json')
  if (!fs.existsSync(turboJsonPath)) {
    changes.push({
      kind: 'create-file',
      path: turboJsonPath,
      content: `${JSON.stringify({ extends: ['//'] }, null, 2)}\n`,
    })
  }

  const rootPkg = readPackageJson(path.join(rootDir, 'package.json'))
  const rootEngines = (rootPkg.engines as Record<string, string> | undefined) ?? {}
  const workspaceEngines = (pkg.engines as Record<string, string> | undefined) ?? {}
  if (Object.keys(workspaceEngines).length === 0 && Object.keys(rootEngines).length > 0) {
    changes.push({ kind: 'add-engines', engines: { ...rootEngines } })
  }

  const scriptAdds: Record<string, string> = {}

  if (flags.visual && !scripts.visual) {
    scriptAdds.visual = rootScriptCommand(target.absolutePath, rootDir, 'runners/visual.ts')
  }

  if (flags.lighthouse && !scripts.lighthouse) {
    scriptAdds.lighthouse = workspaceScriptCommand('lighthouse/run.ts')
  }

  if (flags.storybook) {
    if (!scripts.storybook) {
      scriptAdds.storybook = 'storybook dev -p 6006'
    }
    if (!scripts['build-storybook']) {
      scriptAdds['build-storybook'] = 'storybook build -o ./.generated/storybook-static'
    }
  }

  if (flags.e2e && !scripts['test:e2e']) {
    scriptAdds['test:e2e'] = 'playwright test'
  }

  if (flags.e2e && !scripts['test:e2e:install']) {
    scriptAdds['test:e2e:install'] = 'playwright install'
  }

  for (const [name, command] of Object.entries(scriptAdds)) {
    changes.push({ kind: 'add-script', name, command })
  }

  maybeScaffoldDocs(target, changes)

  return {
    target,
    packageName,
    frameworks,
    existingScripts: Object.keys(scripts).sort(),
    existingTooling,
    availableTooling,
    changes,
  }
}

function applyAdoptPlan(plan: AdoptPlan): void {
  const packageJsonPath = path.join(plan.target.absolutePath, 'package.json')
  const pkg = readPackageJson(packageJsonPath)

  for (const change of plan.changes) {
    if (change.kind === 'create-file') {
      const dir = path.dirname(change.path)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(change.path, change.content)
      continue
    }

    if (change.kind === 'append-file') {
      fs.appendFileSync(change.path, change.content)
      continue
    }

    if (change.kind === 'add-engines') {
      if (!pkg.engines) {
        pkg.engines = change.engines
      }
      continue
    }

    if (change.kind === 'add-script') {
      const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {}
      if (!scripts[change.name]) {
        scripts[change.name] = change.command
        pkg.scripts = scripts
      }
    }
  }

  const touchedPackageJson = plan.changes.some(
    (change) => change.kind === 'add-script' || change.kind === 'add-engines'
  )
  if (touchedPackageJson) {
    writePackageJson(packageJsonPath, pkg)
  }
}

function printAdoptPlan(plan: AdoptPlan, io: RunnerIO, dryRun: boolean): void {
  io.stdout(`Workspace: ${plan.target.relativePath}`)
  io.stdout(`Package: ${plan.packageName}`)
  io.stdout(`Type: ${plan.target.type}`)
  io.stdout(`Framework: ${plan.frameworks.join(', ') || 'unknown'}`)
  io.stdout('')
  io.stdout('Existing tooling:')
  for (const item of plan.existingTooling.length > 0 ? plan.existingTooling : ['none']) {
    io.stdout(`  ${item}`)
  }
  io.stdout('')
  io.stdout('Available repository tooling:')
  for (const item of plan.availableTooling) {
    io.stdout(`  ${item}`)
  }
  io.stdout('')

  if (plan.changes.length === 0) {
    io.stdout('No changes required.')
    return
  }

  io.stdout(dryRun ? 'Planned changes:' : 'Applied changes:')
  for (const change of plan.changes) {
    if (change.kind === 'create-file') {
      io.stdout(`  + ${path.relative(plan.target.absolutePath, change.path) || change.path}`)
      continue
    }
    if (change.kind === 'append-file') {
      io.stdout(
        `  ~ ${path.relative(plan.target.absolutePath, change.path) || change.path} (append monorepo section)`
      )
      continue
    }
    if (change.kind === 'add-script') {
      io.stdout(`  + scripts.${change.name}`)
      continue
    }
    if (change.kind === 'add-engines') {
      io.stdout('  + engines')
    }
  }
}

export function parseAdoptArgs(rawArgs: string[]): { path?: string; flags: AdoptFlags } {
  const flags: AdoptFlags = {}
  const positional: string[] = []

  for (const arg of rawArgs) {
    if (arg === '--dry-run') {
      flags.dryRun = true
      continue
    }
    if (arg === '--yes' || arg === '-y') {
      flags.yes = true
      continue
    }
    if (arg === '--visual') {
      flags.visual = true
      continue
    }
    if (arg === '--storybook') {
      flags.storybook = true
      continue
    }
    if (arg === '--e2e') {
      flags.e2e = true
      continue
    }
    if (arg === '--lighthouse') {
      flags.lighthouse = true
      continue
    }
    positional.push(arg)
  }

  return { path: positional[0], flags }
}

export async function runAdopt(
  rawArgs: string[],
  io: RunnerIO = {
    stdout: (msg) => console.log(msg),
    stderr: (msg) => console.error(msg),
    isTTY: process.stdin.isTTY,
  },
  rootDir: string = ROOT_DIR
): Promise<number> {
  const { path: targetPath, flags } = parseAdoptArgs(rawArgs)

  if (!targetPath) {
    io.stderr(formatAdoptUsage(rootDir))
    return 1
  }

  try {
    const target = resolveAdoptTarget(targetPath, rootDir)
    const resolvedFlags = await resolveAdoptToolingFlags(target, flags, io, rootDir)
    if (resolvedFlags === null) {
      io.stderr('Adopt cancelled.')
      return 1
    }

    const plan = buildAdoptPlan(target, rootDir, resolvedFlags)

    if (!resolvedFlags.dryRun) {
      applyAdoptPlan(plan)
    }

    printAdoptPlan(plan, io, Boolean(resolvedFlags.dryRun))
    return 0
  } catch (error) {
    if (error instanceof AdoptError) {
      io.stderr(error.message)
      return 1
    }
    throw error
  }
}
