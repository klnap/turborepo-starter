import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { discoverWorkspaces, findWorkspace } from './discovery'
import { runScopeCli } from './run'
import { discoverRootTasks, discoverWorkspaceTasks, suggestTaskTypo } from './tasks'
import type { RunnerIO } from './types'

function createMockIO(overrides: Partial<RunnerIO> = {}) {
  const stderrLogs: string[] = []
  const spawnedCalls: { cmd: string[]; args: string[]; cwd: string }[] = []

  const io: RunnerIO = {
    stdout: () => {},
    stderr: (msg) => stderrLogs.push(msg),
    isTTY: overrides.isTTY ?? false,
    prompt: overrides.prompt ?? (async () => 'n'),
    spawn:
      overrides.spawn ??
      (async (cmd, args, cwd) => {
        spawnedCalls.push({ cmd, args, cwd })
        return 0
      }),
  }

  return { io, stderrLogs, spawnedCalls }
}

describe('Monorepo scope CLI — Turbo tasks', () => {
  const testRootDir = path.join(import.meta.dir, '../../.generated/tests/tmp-test-tasks')

  function setupFixture() {
    fs.rmSync(testRootDir, { recursive: true, force: true })
    fs.mkdirSync(path.join(testRootDir, 'apps', 'web'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'apps', 'cms'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'packages', 'ui'), { recursive: true })

    fs.writeFileSync(
      path.join(testRootDir, 'apps', 'web', 'package.json'),
      JSON.stringify({
        name: 'web-app',
        scripts: {
          build: 'build',
          test: 'test',
          lint: 'lint',
          typecheck: 'tsc',
        },
      })
    )
    fs.writeFileSync(
      path.join(testRootDir, 'apps', 'cms', 'package.json'),
      JSON.stringify({
        name: 'cms-payload',
        scripts: { build: 'build', test: 'test', storybook: 'storybook', typecheck: 'tsc' },
      })
    )
    fs.writeFileSync(
      path.join(testRootDir, 'packages', 'ui', 'package.json'),
      JSON.stringify({
        name: '@acme/ui',
        scripts: { test: 'test', build: 'build', typecheck: 'tsc' },
      })
    )

    fs.writeFileSync(
      path.join(testRootDir, 'turbo.json'),
      JSON.stringify({
        tasks: {
          build: {},
          test: {},
          lint: {},
          typecheck: {},
          storybook: {},
        },
      })
    )
  }

  function cleanupFixture() {
    fs.rmSync(testRootDir, { recursive: true, force: true })
  }

  beforeEach(setupFixture)
  afterEach(cleanupFixture)

  it('1. root task', async () => {
    const { io, spawnedCalls } = createMockIO()
    expect(await runScopeCli('root', ['typecheck'], io, testRootDir)).toBe(0)
    expect(spawnedCalls[0]?.args).toEqual(['turbo', 'run', 'typecheck'])
  })

  it('2. workspace task', async () => {
    const { io, spawnedCalls } = createMockIO()
    expect(await runScopeCli('ws', ['web', 'typecheck'], io, testRootDir)).toBe(0)
    expect(spawnedCalls[0]?.args).toEqual(['turbo', 'run', 'typecheck', '--filter=./apps/web'])
  })

  it('3. package task', async () => {
    const { io, spawnedCalls } = createMockIO()
    expect(await runScopeCli('pkg', ['ui', 'test'], io, testRootDir)).toBe(0)
    expect(spawnedCalls[0]?.args).toEqual(['turbo', 'run', 'test', '--filter=./packages/ui'])
  })

  it('4. root task runs without filter', async () => {
    const { io, spawnedCalls } = createMockIO()
    await runScopeCli('root', ['build'], io, testRootDir)
    expect(spawnedCalls[0]?.args.filter((arg) => arg.startsWith('--filter'))).toEqual([])
  })

  it('5. workspace task uses filter', async () => {
    const { io, spawnedCalls } = createMockIO()
    await runScopeCli('ws', ['web', 'build'], io, testRootDir)
    expect(spawnedCalls[0]?.args).toContain('--filter=./apps/web')
  })

  it('6. package task uses filter', async () => {
    const { io, spawnedCalls } = createMockIO()
    await runScopeCli('pkg', ['ui', 'build'], io, testRootDir)
    expect(spawnedCalls[0]?.args).toContain('--filter=./packages/ui')
  })

  it('7. forwards task arguments', async () => {
    const { io, spawnedCalls } = createMockIO()
    await runScopeCli('ws', ['web', 'test', '--watch'], io, testRootDir)
    expect(spawnedCalls[0]?.args).toEqual([
      'turbo',
      'run',
      'test',
      '--filter=./apps/web',
      '--',
      '--watch',
    ])
  })

  it('8. unknown root task', async () => {
    const { io, stderrLogs } = createMockIO()
    expect(await runScopeCli('root', ['deploy'], io, testRootDir)).toBe(1)
    expect(stderrLogs.join('\n')).toContain('Unknown task "deploy".')
  })

  it('9. typo suggestion interactive accept', async () => {
    const { io, spawnedCalls } = createMockIO({
      isTTY: true,
      prompt: async () => 'y',
    })
    expect(await runScopeCli('ws', ['web', 'typechek'], io, testRootDir)).toBe(0)
    expect(spawnedCalls[0]?.args).toEqual(['turbo', 'run', 'typecheck', '--filter=./apps/web'])
  })

  it('10. typo suggestion rejected', async () => {
    const { io, spawnedCalls } = createMockIO({
      isTTY: true,
      prompt: async () => 'n',
    })
    expect(await runScopeCli('ws', ['web', 'typechek'], io, testRootDir)).toBe(1)
    expect(spawnedCalls).toHaveLength(0)
  })

  it('11. typo suggestion non-interactive', async () => {
    const { io, stderrLogs } = createMockIO({ isTTY: false })
    expect(await runScopeCli('pkg', ['ui', 'typechek'], io, testRootDir)).toBe(1)
    expect(stderrLogs.join('\n')).toContain('Unknown task "typechek".')
    expect(stderrLogs.join('\n')).toContain('Did you mean:\n  bun pkg ui typecheck')
  })

  it('12. turbo exit code propagation', async () => {
    const { io } = createMockIO({ spawn: async () => 17 })
    expect(await runScopeCli('root', ['test'], io, testRootDir)).toBe(17)
  })

  it('13. dynamic root task discovery', () => {
    const turboPath = path.join(testRootDir, 'turbo.json')
    const turbo = JSON.parse(fs.readFileSync(turboPath, 'utf8')) as {
      tasks: Record<string, object>
    }
    turbo.tasks.deploy = {}
    fs.writeFileSync(turboPath, JSON.stringify(turbo))
    expect(discoverRootTasks(testRootDir)).toContain('deploy')
  })

  it('14. dynamic workspace discovery', () => {
    fs.mkdirSync(path.join(testRootDir, 'apps', 'admin'), { recursive: true })
    fs.writeFileSync(
      path.join(testRootDir, 'apps', 'admin', 'package.json'),
      JSON.stringify({ name: 'admin', scripts: { build: 'build' } })
    )
    expect(discoverWorkspaces('app', testRootDir).map((app) => app.dirName)).toContain('admin')
  })

  it('15. dynamic package discovery', () => {
    fs.mkdirSync(path.join(testRootDir, 'packages', 'forms'), { recursive: true })
    fs.writeFileSync(
      path.join(testRootDir, 'packages', 'forms', 'package.json'),
      JSON.stringify({ name: '@acme/forms', scripts: { test: 'test' } })
    )
    expect(discoverWorkspaces('package', testRootDir).map((pkg) => pkg.dirName)).toContain('forms')
  })

  it('16. newly added turbo task works without CLI changes', async () => {
    const turboPath = path.join(testRootDir, 'turbo.json')
    const turbo = JSON.parse(fs.readFileSync(turboPath, 'utf8')) as {
      tasks: Record<string, object>
    }
    turbo.tasks.deploy = {}
    fs.writeFileSync(turboPath, JSON.stringify(turbo))

    const { io, spawnedCalls } = createMockIO()
    expect(await runScopeCli('root', ['deploy'], io, testRootDir)).toBe(0)
    expect(spawnedCalls[0]?.args).toEqual(['turbo', 'run', 'deploy'])
  })

  it('17. task available only in one workspace is scoped', () => {
    const cms = findWorkspace('app', 'cms', testRootDir)!
    const web = findWorkspace('app', 'web', testRootDir)!
    expect(discoverWorkspaceTasks(cms, testRootDir)).toContain('storybook')
    expect(discoverWorkspaceTasks(web, testRootDir)).not.toContain('storybook')
  })

  it('18. task unavailable for workspace is rejected', async () => {
    const { io, stderrLogs } = createMockIO()
    expect(await runScopeCli('ws', ['web', 'storybook'], io, testRootDir)).toBe(1)
    expect(stderrLogs.join('\n')).toContain('Unknown task "storybook".')
  })

  it('19. root forwards turbo flags', async () => {
    const { io, spawnedCalls } = createMockIO()
    await runScopeCli('root', ['build', '--force'], io, testRootDir)
    expect(spawnedCalls[0]?.args).toEqual(['turbo', 'run', 'build', '--force'])
  })

  it('20. suggestTaskTypo finds close matches only within distance 2', () => {
    expect(suggestTaskTypo('typechek', ['typecheck', 'build'])).toBe('typecheck')
    expect(suggestTaskTypo('zzzzz', ['typecheck', 'build'])).toBeUndefined()
  })
})
