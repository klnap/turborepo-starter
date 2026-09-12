import { afterEach, describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { runScopeCli } from '../core/run'
import type { RunnerIO } from '../core/types'
import {
  AdoptError,
  buildAdoptPlan,
  buildAdoptToolingOptions,
  parseAdoptArgs,
  resolveAdoptTarget,
  resolveAdoptToolingFlags,
  runAdopt,
} from './adopt'

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

describe('Workspace adoption', () => {
  const testRootDir = path.join(import.meta.dir, '../../.generated/tests/tmp-adopt')

  function writeRepo() {
    fs.rmSync(testRootDir, { recursive: true, force: true })
    fs.mkdirSync(path.join(testRootDir, 'apps', 'admin'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'packages', 'forms'), { recursive: true })

    fs.writeFileSync(
      path.join(testRootDir, 'package.json'),
      JSON.stringify({
        name: 'test-monorepo',
        workspaces: ['apps/*', 'packages/*'],
        engines: { bun: '>=1.4.0', node: '^24.0.0' },
      })
    )
    fs.mkdirSync(path.join(testRootDir, 'scripts', 'runners'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'apps', 'admin', 'scripts', 'lighthouse'), {
      recursive: true,
    })
    fs.writeFileSync(path.join(testRootDir, 'scripts', 'runners', 'visual.ts'), 'export {}\n')
    fs.writeFileSync(
      path.join(testRootDir, 'apps', 'admin', 'scripts', 'lighthouse', 'run.ts'),
      'export {}\n'
    )

    fs.writeFileSync(
      path.join(testRootDir, 'apps', 'admin', 'package.json'),
      JSON.stringify({
        name: 'admin-dashboard',
        version: '0.1.0',
        scripts: {
          dev: 'next dev',
          test: 'vitest',
        },
        dependencies: {
          next: '16.0.0',
          react: '19.0.0',
        },
      })
    )

    fs.writeFileSync(
      path.join(testRootDir, 'packages', 'forms', 'package.json'),
      JSON.stringify({
        name: '@acme/forms',
        version: '0.1.0',
        scripts: {
          test: 'vitest',
        },
      })
    )
  }

  afterEach(() => {
    fs.rmSync(testRootDir, { recursive: true, force: true })
  })

  it('1. valid app adoption', () => {
    writeRepo()
    const target = resolveAdoptTarget('apps/admin', testRootDir)
    const plan = buildAdoptPlan(target, testRootDir, {})
    expect(plan.changes.some((change) => change.kind === 'create-file')).toBe(true)
  })

  it('2. valid package adoption', () => {
    writeRepo()
    const target = resolveAdoptTarget('packages/forms', testRootDir)
    const plan = buildAdoptPlan(target, testRootDir, {})
    expect(plan.packageName).toBe('@acme/forms')
    expect(plan.target.type).toBe('package')
  })

  it('3. unknown path', () => {
    writeRepo()
    expect(() => resolveAdoptTarget('apps/missing', testRootDir)).toThrow(AdoptError)
  })

  it('4. missing package.json', () => {
    writeRepo()
    fs.mkdirSync(path.join(testRootDir, 'apps', 'empty'), { recursive: true })
    expect(() => resolveAdoptTarget('apps/empty', testRootDir)).toThrow(/not a workspace/)
  })

  it('5. root rejected', () => {
    writeRepo()
    expect(() => resolveAdoptTarget('.', testRootDir)).toThrow(/root cannot be adopted/)
  })

  it('6. outside repo rejected', () => {
    writeRepo()
    expect(() => resolveAdoptTarget('../outside', testRootDir)).toThrow(/outside the repository/)
  })

  it('7. path traversal rejected', () => {
    writeRepo()
    expect(() => resolveAdoptTarget('apps/../secrets', testRootDir)).toThrow(
      /outside the repository/
    )
  })

  it('8. framework detection', () => {
    writeRepo()
    const target = resolveAdoptTarget('apps/admin', testRootDir)
    const plan = buildAdoptPlan(target, testRootDir, {})
    expect(plan.frameworks).toContain('next')
    expect(plan.frameworks).toContain('react')
  })

  it('9. existing dependencies preserved', async () => {
    writeRepo()
    const { io } = createMockIO()
    await runAdopt(['apps/admin', '--visual'], io, testRootDir)
    const pkg = JSON.parse(
      fs.readFileSync(path.join(testRootDir, 'apps', 'admin', 'package.json'), 'utf8')
    ) as { dependencies: Record<string, string> }
    expect(pkg.dependencies.next).toBe('16.0.0')
  })

  it('10. existing scripts preserved', async () => {
    writeRepo()
    const { io } = createMockIO()
    await runAdopt(['apps/admin', '--visual'], io, testRootDir)
    const pkg = JSON.parse(
      fs.readFileSync(path.join(testRootDir, 'apps', 'admin', 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> }
    expect(pkg.scripts.test).toBe('vitest')
    expect(pkg.scripts.dev).toBe('next dev')
  })

  it('11. existing config preserved', async () => {
    writeRepo()
    fs.writeFileSync(
      path.join(testRootDir, 'apps', 'admin', 'next.config.ts'),
      'export default {}\n'
    )
    const before = fs.readFileSync(
      path.join(testRootDir, 'apps', 'admin', 'next.config.ts'),
      'utf8'
    )
    const { io } = createMockIO()
    await runAdopt(['apps/admin'], io, testRootDir)
    const after = fs.readFileSync(path.join(testRootDir, 'apps', 'admin', 'next.config.ts'), 'utf8')
    expect(after).toBe(before)
  })

  it('12. idempotency', async () => {
    writeRepo()
    const { io } = createMockIO()
    await runAdopt(['apps/admin', '--visual'], io, testRootDir)
    const first = fs.readFileSync(path.join(testRootDir, 'apps', 'admin', 'package.json'), 'utf8')
    const stdout = createMockIO()
    await runAdopt(['apps/admin', '--visual'], stdout.io, testRootDir)
    const second = fs.readFileSync(path.join(testRootDir, 'apps', 'admin', 'package.json'), 'utf8')
    expect(second).toBe(first)
    expect(stdout.stdoutLogs.join('\n')).toContain('No changes required.')
  })

  it('13. dry-run', async () => {
    writeRepo()
    const { io, stdoutLogs } = createMockIO()
    const code = await runAdopt(['apps/admin', '--dry-run', '--visual'], io, testRootDir)
    expect(code).toBe(0)
    expect(stdoutLogs.join('\n')).toContain('Planned changes:')
    expect(fs.existsSync(path.join(testRootDir, 'apps', 'admin', 'turbo.json'))).toBe(false)
  })

  it('14. optional tooling', () => {
    writeRepo()
    const target = resolveAdoptTarget('apps/admin', testRootDir)
    const plan = buildAdoptPlan(target, testRootDir, {
      visual: true,
      lighthouse: true,
      storybook: true,
      e2e: true,
    })
    const scriptNames = plan.changes
      .filter((change) => change.kind === 'add-script')
      .map((change) => (change.kind === 'add-script' ? change.name : ''))
    expect(scriptNames).toContain('visual')
    expect(scriptNames).toContain('lighthouse')
    expect(scriptNames).toContain('storybook')
    expect(scriptNames).toContain('test:e2e')
    expect(scriptNames).toContain('test:e2e:install')
  })

  it('15. no duplicate dependencies', async () => {
    writeRepo()
    const { io } = createMockIO()
    await runAdopt(['apps/admin', '--visual'], io, testRootDir)
    await runAdopt(['apps/admin', '--visual'], io, testRootDir)
    const pkg = JSON.parse(
      fs.readFileSync(path.join(testRootDir, 'apps', 'admin', 'package.json'), 'utf8')
    ) as { dependencies: Record<string, string> }
    expect(Object.keys(pkg.dependencies)).toHaveLength(2)
  })

  it('16. no duplicate scripts', async () => {
    writeRepo()
    const { io } = createMockIO()
    await runAdopt(['apps/admin', '--visual'], io, testRootDir)
    const pkg = JSON.parse(
      fs.readFileSync(path.join(testRootDir, 'apps', 'admin', 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> }
    const visualCount = Object.entries(pkg.scripts).filter(([name]) => name === 'visual').length
    expect(visualCount).toBe(1)
  })

  it('17. no duplicate config', async () => {
    writeRepo()
    const { io } = createMockIO()
    await runAdopt(['apps/admin'], io, testRootDir)
    await runAdopt(['apps/admin'], io, testRootDir)
    expect(
      fs.readdirSync(path.join(testRootDir, 'apps', 'admin')).filter((f) => f === 'turbo.json')
    ).toHaveLength(1)
  })

  it('18. command injection protection', async () => {
    writeRepo()
    const { io } = createMockIO()
    const malicious = 'apps/admin; rm -rf /'
    const code = await runAdopt([malicious], io, testRootDir)
    expect(code).toBe(1)
    expect(fs.existsSync(path.join(testRootDir, 'apps', 'admin; rm -rf /'))).toBe(false)
  })

  it('parses adopt flags', () => {
    const parsed = parseAdoptArgs(['apps/admin', '--dry-run', '--visual', '--e2e', '--yes'])
    expect(parsed.path).toBe('apps/admin')
    expect(parsed.flags.dryRun).toBe(true)
    expect(parsed.flags.visual).toBe(true)
    expect(parsed.flags.e2e).toBe(true)
    expect(parsed.flags.yes).toBe(true)
  })

  it('23. tooling options for apps', () => {
    writeRepo()
    const target = resolveAdoptTarget('apps/admin', testRootDir)
    const options = buildAdoptToolingOptions(target, testRootDir)
    expect(options.map((option) => option.id)).toEqual(['visual', 'storybook', 'e2e', 'lighthouse'])
    expect(options.every((option) => option.available)).toBe(true)
    expect(options.every((option) => !option.alreadyConfigured)).toBe(true)
  })

  it('24. resolveAdoptToolingFlags keeps explicit flags without TTY', async () => {
    writeRepo()
    const target = resolveAdoptTarget('apps/admin', testRootDir)
    const { io } = createMockIO()
    const resolved = await resolveAdoptToolingFlags(target, { visual: true }, io, testRootDir)
    expect(resolved?.visual).toBe(true)
    expect(resolved?.e2e).toBeUndefined()
  })

  it('19. scaffolds AGENTS.md and specs/README.md', async () => {
    writeRepo()
    const { io } = createMockIO()
    await runAdopt(['apps/admin'], io, testRootDir)
    expect(fs.existsSync(path.join(testRootDir, 'apps', 'admin', 'AGENTS.md'))).toBe(true)
    expect(fs.existsSync(path.join(testRootDir, 'apps', 'admin', 'specs', 'README.md'))).toBe(true)
    const agents = fs.readFileSync(path.join(testRootDir, 'apps', 'admin', 'AGENTS.md'), 'utf8')
    expect(agents).toContain('../../AGENTS.md')
    expect(agents).toContain('docs/cli.md')
    expect(agents).toContain('test:watch')
    expect(agents).not.toContain('next-intl')
  })

  it('20. package scaffold is neutral', async () => {
    writeRepo()
    const { io } = createMockIO()
    await runAdopt(['packages/forms'], io, testRootDir)
    const agents = fs.readFileSync(path.join(testRootDir, 'packages', 'forms', 'AGENTS.md'), 'utf8')
    expect(agents).toContain('Package')
    expect(agents).not.toContain('Next.js')
  })

  it('21. appends monorepo section to existing AGENTS.md', async () => {
    writeRepo()
    fs.writeFileSync(
      path.join(testRootDir, 'apps', 'admin', 'AGENTS.md'),
      '# Next.js\n\nUse App Router.\n'
    )
    const { io } = createMockIO()
    await runAdopt(['apps/admin'], io, testRootDir)
    const agents = fs.readFileSync(path.join(testRootDir, 'apps', 'admin', 'AGENTS.md'), 'utf8')
    expect(agents.startsWith('# Next.js')).toBe(true)
    expect(agents).toContain('Use App Router.')
    expect(agents).toContain('docs/cli.md')
    expect(agents).toContain('## Monorepo integration')
  })

  it('22. does not double-append AGENTS.md', async () => {
    writeRepo()
    fs.writeFileSync(path.join(testRootDir, 'apps', 'admin', 'AGENTS.md'), '# Existing\n')
    const { io } = createMockIO()
    await runAdopt(['apps/admin'], io, testRootDir)
    const afterFirst = fs.readFileSync(path.join(testRootDir, 'apps', 'admin', 'AGENTS.md'), 'utf8')
    const stdout = createMockIO()
    await runAdopt(['apps/admin'], stdout.io, testRootDir)
    const afterSecond = fs.readFileSync(
      path.join(testRootDir, 'apps', 'admin', 'AGENTS.md'),
      'utf8'
    )
    expect(afterSecond).toBe(afterFirst)
    expect(stdout.stdoutLogs.join('\n')).toContain('No changes required.')
  })

  it('integrates with root CLI', async () => {
    writeRepo()
    const { io } = createMockIO()
    const code = await runScopeCli('root', ['adopt', 'apps/admin', '--dry-run'], io, testRootDir)
    expect(code).toBe(0)
  })
})
