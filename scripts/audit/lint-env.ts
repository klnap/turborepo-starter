import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ANSI = {
  BOLD: '\x1b[1m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  RESET: '\x1b[0m',
} as const

function monorepoPaths(rootDir: string) {
  return {
    appsDir: path.join(rootDir, 'apps'),
    packagesDir: path.join(rootDir, 'packages'),
  }
}

function findEnvSchemaFiles(rootDir: string) {
  const { appsDir, packagesDir } = monorepoPaths(rootDir)
  const results: { workspaceRoot: string; envPath: string }[] = []

  for (const root of [appsDir, packagesDir]) {
    if (!fs.existsSync(root)) continue

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue

      const workspaceRoot = path.join(root, entry.name)
      const envPath = path.join(workspaceRoot, 'src/env.ts')
      if (fs.existsSync(envPath)) {
        results.push({ workspaceRoot, envPath })
      }
    }
  }

  return results.sort((a, b) => a.workspaceRoot.localeCompare(b.workspaceRoot))
}

function extractSchemaKeys(fileContent: string): string[] {
  const schemaPortion = fileContent.split(/experimental__runtimeEnv|runtimeEnv/)[0] ?? ''
  const keyMatches = schemaPortion.matchAll(/([A-Z0-9_]+)\s*:\s*v\./g)
  const keys: string[] = []

  for (const match of keyMatches) {
    const key = match[1]
    if (key && !keys.includes(key)) {
      keys.push(key)
    }
  }

  return keys
}

function commandSucceeded(rootDir: string, command: string, args: string[]): boolean {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'ignore',
  })
  return result.status === 0
}

function isKeyReferenced(
  key: string,
  rootDir: string,
  workspaceRoot: string,
  envPath: string
): boolean {
  const workspaceRel = path.relative(rootDir, workspaceRoot)
  const envRel = path.relative(rootDir, envPath)

  if (
    commandSucceeded(rootDir, 'git', [
      'grep',
      '-q',
      '-w',
      key,
      '--',
      workspaceRel,
      `:!${envRel}`,
      `:!${workspaceRel}/.env*`,
      `:!${workspaceRel}/**/README.md`,
    ])
  ) {
    return true
  }

  return commandSucceeded(rootDir, 'grep', [
    '-r',
    '-w',
    '--exclude=env.ts',
    '--exclude-dir=.next',
    '--exclude-dir=node_modules',
    '--exclude-dir=.turbo',
    '--exclude-dir=.generated',
    '--exclude=.env*',
    '--exclude=*.md',
    key,
    workspaceRoot,
  ])
}

function auditEnvironmentVariables(rootDir: string): { workspace: string; keys: string[] }[] {
  const envFiles = findEnvSchemaFiles(rootDir)
  const deadByWorkspace: { workspace: string; keys: string[] }[] = []

  for (const { workspaceRoot, envPath } of envFiles) {
    const content = fs.readFileSync(envPath, 'utf-8')
    const declaredKeys = extractSchemaKeys(content)
    const workspaceLabel = path.relative(rootDir, workspaceRoot)

    if (declaredKeys.length === 0) continue

    const deadVariables: string[] = []
    for (const key of declaredKeys) {
      if (!isKeyReferenced(key, rootDir, workspaceRoot, envPath)) {
        deadVariables.push(key)
      }
    }

    if (deadVariables.length > 0) {
      deadByWorkspace.push({ workspace: workspaceLabel, keys: deadVariables })
    }
  }

  return deadByWorkspace
}

function formatDeadEnvironmentVariables(
  deadByWorkspace: { workspace: string; keys: string[] }[]
): string {
  const lines: string[] = [
    `${ANSI.BOLD}${ANSI.RED}[lint:env] Detected dead/unused environment variable(s):${ANSI.RESET}`,
  ]

  for (const { workspace, keys } of deadByWorkspace) {
    for (const key of keys) {
      lines.push(
        `  - ${ANSI.YELLOW}${key}${ANSI.RESET} (${workspace}/src/env.ts — never referenced in workspace code)`
      )
    }
  }

  return lines.join('\n')
}

export { auditEnvironmentVariables, extractSchemaKeys, formatDeadEnvironmentVariables }
