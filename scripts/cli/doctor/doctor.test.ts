import { afterEach, describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { runScopeCli } from '../core/run'
import type { RunnerIO } from '../core/types'
import { runDoctor, runDoctorChecks } from './doctor'

function createMockIO() {
  const stdoutLogs: string[] = []
  const stderrLogs: string[] = []

  const io: RunnerIO = {
    stdout: (msg) => stdoutLogs.push(msg),
    stderr: (msg) => stderrLogs.push(msg),
    isTTY: false,
  }

  return { io, stdoutLogs, stderrLogs }
}

describe('Repository doctor', () => {
  const testRootDir = path.join(import.meta.dir, '../../.generated/tests/tmp-doctor')

  function writeHealthyRepo() {
    fs.rmSync(testRootDir, { recursive: true, force: true })
    fs.mkdirSync(path.join(testRootDir, 'apps', 'web'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'packages'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'scripts', 'cli', 'entries'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, '.githooks'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, '.github', 'workflows'), { recursive: true })

    fs.writeFileSync(
      path.join(testRootDir, 'package.json'),
      JSON.stringify({
        name: 'test-monorepo',
        workspaces: ['apps/*', 'packages/*'],
        engines: { bun: '>=1.4.0', node: '^24.0.0' },
        devDependencies: { turbo: '^2.10.11', oxlint: '1.0.0' },
      })
    )
    fs.writeFileSync(path.join(testRootDir, 'bun.lock'), '')
    fs.writeFileSync(path.join(testRootDir, 'turbo.json'), JSON.stringify({ tasks: { build: {} } }))
    fs.writeFileSync(path.join(testRootDir, 'biome.json'), '{}')
    fs.writeFileSync(path.join(testRootDir, 'tsconfig.json'), '{}')
    fs.writeFileSync(path.join(testRootDir, 'trivy.yaml'), 'scan:\n  skip-dirs: []\n')
    fs.writeFileSync(path.join(testRootDir, '.githooks', 'pre-commit'), '#!/usr/bin/env bun\n')
    fs.writeFileSync(
      path.join(testRootDir, '.github', 'workflows', 'gitleaks.yml'),
      'name: Gitleaks\n'
    )
    fs.writeFileSync(
      path.join(testRootDir, '.github', 'workflows', 'security.yml'),
      'name: Security\n'
    )

    fs.writeFileSync(
      path.join(testRootDir, 'apps', 'web', 'package.json'),
      JSON.stringify({ name: 'web-app', version: '0.1.0', scripts: { build: 'build' } })
    )

    for (const entry of ['root', 'workspace', 'package']) {
      fs.writeFileSync(
        path.join(testRootDir, 'scripts', 'cli', 'entries', `${entry}.ts`),
        'export {}\n'
      )
    }
  }

  afterEach(() => {
    fs.rmSync(testRootDir, { recursive: true, force: true })
  })

  it('1. healthy repository', async () => {
    writeHealthyRepo()
    const report = await runDoctorChecks(testRootDir, {
      bunVersion: '1.4.0',
      hasGit: true,
      hasDocker: false,
    })
    expect(report.status).toBe('healthy')
  })

  it('2. missing package.json', async () => {
    writeHealthyRepo()
    fs.rmSync(path.join(testRootDir, 'package.json'))
    const report = await runDoctorChecks(testRootDir, { bunVersion: '1.4.0', hasGit: true })
    expect(report.status).toBe('unhealthy')
    expect(
      report.checks.some((check) => check.name === 'package.json' && check.status === 'fail')
    ).toBe(true)
  })

  it('3. missing bun.lock', async () => {
    writeHealthyRepo()
    fs.rmSync(path.join(testRootDir, 'bun.lock'))
    const report = await runDoctorChecks(testRootDir, { bunVersion: '1.4.0', hasGit: true })
    expect(
      report.checks.some((check) => check.name === 'bun.lock' && check.status === 'fail')
    ).toBe(true)
  })

  it('4. invalid workspace configuration', async () => {
    writeHealthyRepo()
    const rootPkg = JSON.parse(fs.readFileSync(path.join(testRootDir, 'package.json'), 'utf8')) as {
      workspaces: string[]
    }
    rootPkg.workspaces = ['apps/*']
    fs.writeFileSync(path.join(testRootDir, 'package.json'), JSON.stringify(rootPkg))
    const report = await runDoctorChecks(testRootDir, { bunVersion: '1.4.0', hasGit: true })
    expect(
      report.checks.some((check) => check.name === 'workspace patterns' && check.status === 'fail')
    ).toBe(true)
  })

  it('5. invalid workspace missing package.json', async () => {
    writeHealthyRepo()
    fs.mkdirSync(path.join(testRootDir, 'apps', 'broken'), { recursive: true })
    const report = await runDoctorChecks(testRootDir, { bunVersion: '1.4.0', hasGit: true })
    expect(report.status).toBe('unhealthy')
  })

  it('6. missing Bun version requirement', async () => {
    writeHealthyRepo()
    const report = await runDoctorChecks(testRootDir, {
      bunVersion: '1.0.0',
      hasGit: true,
    })
    expect(
      report.checks.some((check) => check.name === 'Bun version' && check.status === 'fail')
    ).toBe(true)
  })

  it('7. CLI discovery failure', async () => {
    writeHealthyRepo()
    fs.rmSync(path.join(testRootDir, 'scripts', 'cli', 'entries', 'root.ts'))
    const report = await runDoctorChecks(testRootDir, { bunVersion: '1.4.0', hasGit: true })
    expect(report.checks.some((check) => check.name === 'root' && check.status === 'fail')).toBe(
      true
    )
  })

  it('8. unhealthy repository', async () => {
    writeHealthyRepo()
    const rootPkg = JSON.parse(fs.readFileSync(path.join(testRootDir, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    rootPkg.dependencies = { react: '^19.0.0' }
    fs.writeFileSync(path.join(testRootDir, 'package.json'), JSON.stringify(rootPkg))
    const report = await runDoctorChecks(testRootDir, { bunVersion: '1.4.0', hasGit: true })
    expect(report.status).toBe('unhealthy')
  })

  it('9. JSON output', async () => {
    writeHealthyRepo()
    const { io, stdoutLogs } = createMockIO()
    const code = await runDoctor(['--json'], io, testRootDir)
    expect(code).toBe(0)
    const parsed = JSON.parse(stdoutLogs.join('\n')) as { status: string; checks: unknown[] }
    expect(parsed.status).toBe('healthy')
    expect(Array.isArray(parsed.checks)).toBe(true)
  })

  it('10. verbose output', async () => {
    writeHealthyRepo()
    const { io, stdoutLogs } = createMockIO()
    const code = await runDoctor(['--verbose'], io, testRootDir)
    expect(code).toBe(0)
    expect(stdoutLogs.join('\n')).toContain('Repository Doctor')
    expect(stdoutLogs.join('\n')).toContain('Result: HEALTHY')
  })

  it('11. no mutations', async () => {
    writeHealthyRepo()
    const before = fs.readFileSync(path.join(testRootDir, 'package.json'), 'utf8')
    const { io } = createMockIO()
    await runDoctor([], io, testRootDir)
    const after = fs.readFileSync(path.join(testRootDir, 'package.json'), 'utf8')
    expect(after).toBe(before)
  })

  it('12. non-interactive execution via root CLI', async () => {
    writeHealthyRepo()
    const { io } = createMockIO()
    const code = await runScopeCli('root', ['doctor'], io, testRootDir)
    expect(code).toBe(0)
  })
})
