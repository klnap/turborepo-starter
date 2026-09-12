import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { discoverWorkspaces, findWorkspace } from './discovery'
import { runScopeCli } from './run'
import type { RunnerIO } from './types'

function createMockIO(overrides: Partial<RunnerIO> = {}) {
  const stdoutLogs: string[] = []
  const stderrLogs: string[] = []
  const spawnedCalls: { cmd: string[]; args: string[]; cwd: string }[] = []

  const io: RunnerIO = {
    stdout: (msg) => stdoutLogs.push(msg),
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

  return { io, stdoutLogs, stderrLogs, spawnedCalls }
}

describe('Monorepo scope CLI', () => {
  const testRootDir = path.join(import.meta.dir, '../../.generated/tests/tmp-test-workspaces')

  function setupTestWorkspaces() {
    fs.rmSync(testRootDir, { recursive: true, force: true })
    fs.mkdirSync(path.join(testRootDir, 'apps', 'web'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'apps', 'cms'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'packages', 'ui'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'packages', 'forms'), { recursive: true })

    fs.writeFileSync(
      path.join(testRootDir, 'apps', 'web', 'package.json'),
      JSON.stringify({
        name: 'web-app',
        version: '0.1.0',
        scripts: { build: 'build', test: 'test', lint: 'lint', typecheck: 'tsc' },
      })
    )
    fs.writeFileSync(
      path.join(testRootDir, 'apps', 'cms', 'package.json'),
      JSON.stringify({
        name: 'cms-payload',
        version: '0.1.0',
        scripts: { build: 'build', test: 'test' },
      })
    )
    fs.writeFileSync(
      path.join(testRootDir, 'packages', 'ui', 'package.json'),
      JSON.stringify({
        name: '@acme/ui',
        version: '0.1.0',
        scripts: { test: 'test', build: 'build', typecheck: 'tsc' },
      })
    )
    fs.writeFileSync(
      path.join(testRootDir, 'packages', 'forms', 'package.json'),
      JSON.stringify({
        name: '@acme/forms',
        version: '0.1.0',
        scripts: { test: 'test' },
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
        },
      })
    )
  }

  function cleanupTestWorkspaces() {
    fs.rmSync(testRootDir, { recursive: true, force: true })
  }

  describe('ROOT scope', () => {
    beforeEach(setupTestWorkspaces)
    afterEach(cleanupTestWorkspaces)

    it('1. executes root install', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('root', ['install'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([{ cmd: ['bun'], args: ['install'], cwd: testRootDir }])
    })

    it('2. executes root add with flags and package', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('root', ['add', '-d', 'turbo'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['add', '-d', 'turbo'], cwd: testRootDir },
      ])
    })

    it('3. executes root remove', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('root', ['remove', 'turbo'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([{ cmd: ['bun'], args: ['remove', 'turbo'], cwd: testRootDir }])
    })

    it('4. executes root update', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('root', ['update', 'turbo'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([{ cmd: ['bun'], args: ['update', 'turbo'], cwd: testRootDir }])
    })

    it('5. handles missing root command', async () => {
      const { io, stderrLogs } = createMockIO()
      const code = await runScopeCli('root', [], io, testRootDir)
      expect(code).toBe(1)
      expect(stderrLogs.join('\n')).toContain('Usage:\n  bun root <command> [...args]')
    })

    it('6. handles missing package in root add', async () => {
      const { io, stderrLogs } = createMockIO()
      const code = await runScopeCli('root', ['add'], io, testRootDir)
      expect(code).toBe(1)
      expect(stderrLogs.join('\n')).toContain('Missing package.')
      expect(stderrLogs.join('\n')).toContain('Usage:\n  bun root add <package>')
    })
  })

  describe('WS scope', () => {
    beforeEach(setupTestWorkspaces)
    afterEach(cleanupTestWorkspaces)

    it('7. valid app + install', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('ws', ['web', 'install'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['install', '--filter', 'web-app'], cwd: testRootDir },
      ])
    })

    it('8. valid app + add', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('ws', ['web', 'add', 'next@latest'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([
        {
          cmd: ['bun'],
          args: ['add', '--filter', 'web-app', 'next@latest'],
          cwd: testRootDir,
        },
      ])
    })

    it('9. valid app + remove', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('ws', ['web', 'remove', 'zod'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['remove', '--filter', 'web-app', 'zod'], cwd: testRootDir },
      ])
    })

    it('10. valid app + update', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('ws', ['cms', 'update', 'payload'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['update', '--filter', 'cms-payload', 'payload'], cwd: testRootDir },
      ])
    })

    it('11. missing command in ws', async () => {
      const { io, stderrLogs } = createMockIO()
      const code = await runScopeCli('ws', ['web'], io, testRootDir)
      expect(code).toBe(1)
      expect(stderrLogs.join('\n')).toContain('Workspace: web')
      expect(stderrLogs.join('\n')).toContain('Available dependency commands:')
      expect(stderrLogs.join('\n')).toContain('Available tasks:')
    })

    it('12. unknown app', async () => {
      const { io, stderrLogs } = createMockIO()
      const code = await runScopeCli('ws', ['frontend', 'add', 'next'], io, testRootDir)
      expect(code).toBe(1)
      expect(stderrLogs.join('\n')).toContain('Unknown app "frontend".')
      expect(stderrLogs.join('\n')).toContain('Available apps:\n  cms\n  web')
    })

    it('13. missing app', async () => {
      const { io, stderrLogs } = createMockIO()
      const code = await runScopeCli('ws', ['add', 'next'], io, testRootDir)
      expect(code).toBe(1)
      expect(stderrLogs.join('\n')).toContain('Missing app.')
      expect(stderrLogs.join('\n')).toContain('Available apps:\n  cms\n  web')
    })

    it('14. missing package in ws add', async () => {
      const { io, stderrLogs } = createMockIO()
      const code = await runScopeCli('ws', ['web', 'add'], io, testRootDir)
      expect(code).toBe(1)
      expect(stderrLogs.join('\n')).toContain('Missing package.')
      expect(stderrLogs.join('\n')).toContain('Usage:\n  bun ws web add <package>')
    })
  })

  describe('PKG scope', () => {
    beforeEach(setupTestWorkspaces)
    afterEach(cleanupTestWorkspaces)

    it('16. valid package + install', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('pkg', ['ui', 'install'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['install', '--filter', '@acme/ui'], cwd: testRootDir },
      ])
    })

    it('17. valid package + add', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('pkg', ['ui', 'add', 'clsx'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['add', '--filter', '@acme/ui', 'clsx'], cwd: testRootDir },
      ])
    })

    it('18. valid package + remove', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('pkg', ['ui', 'remove', 'clsx'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['remove', '--filter', '@acme/ui', 'clsx'], cwd: testRootDir },
      ])
    })

    it('19. valid package + update', async () => {
      const { io, spawnedCalls } = createMockIO()
      const code = await runScopeCli('pkg', ['forms', 'update', 'zod'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['update', '--filter', '@acme/forms', 'zod'], cwd: testRootDir },
      ])
    })

    it('20. unknown package', async () => {
      const { io, stderrLogs } = createMockIO()
      const code = await runScopeCli('pkg', ['components', 'add', 'clsx'], io, testRootDir)
      expect(code).toBe(1)
      expect(stderrLogs.join('\n')).toContain('Unknown package "components".')
      expect(stderrLogs.join('\n')).toContain('Available packages:\n  forms\n  ui')
    })

    it('21. missing package name', async () => {
      const { io, stderrLogs } = createMockIO()
      const code = await runScopeCli('pkg', ['add', 'clsx'], io, testRootDir)
      expect(code).toBe(1)
      expect(stderrLogs.join('\n')).toContain('Missing package.')
      expect(stderrLogs.join('\n')).toContain('Available packages:\n  forms\n  ui')
    })
  })

  describe('WS <-> PKG confusion detection', () => {
    beforeEach(setupTestWorkspaces)
    afterEach(cleanupTestWorkspaces)

    it('23. pkg receives existing app name (non-interactive)', async () => {
      const { io, stderrLogs } = createMockIO({ isTTY: false })
      const code = await runScopeCli('pkg', ['web', 'add', 'clsx'], io, testRootDir)
      expect(code).toBe(1)
      expect(stderrLogs.join('\n')).toContain('Package "web" was not found.')
      expect(stderrLogs.join('\n')).toContain('An app with this name exists:\n  apps/web')
      expect(stderrLogs.join('\n')).toContain('Suggested command:\n  bun ws web add clsx')
    })

    it('24. ws receives existing package name (non-interactive)', async () => {
      const { io, stderrLogs } = createMockIO({ isTTY: false })
      const code = await runScopeCli('ws', ['ui', 'add', 'clsx'], io, testRootDir)
      expect(code).toBe(1)
      expect(stderrLogs.join('\n')).toContain('Workspace "ui" was not found.')
      expect(stderrLogs.join('\n')).toContain('A package with this name exists:\n  packages/ui')
      expect(stderrLogs.join('\n')).toContain('Suggested command:\n  bun pkg ui add clsx')
    })

    it('25. suggestion accepted', async () => {
      const { io, spawnedCalls } = createMockIO({
        isTTY: true,
        prompt: async () => 'y',
      })
      const code = await runScopeCli('pkg', ['web', 'add', 'clsx'], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['add', '--filter', 'web-app', 'clsx'], cwd: testRootDir },
      ])
    })

    it('26. suggestion rejected', async () => {
      const { io, spawnedCalls } = createMockIO({
        isTTY: true,
        prompt: async () => 'n',
      })
      const code = await runScopeCli('ws', ['ui', 'add', 'clsx'], io, testRootDir)
      expect(code).toBe(1)
      expect(spawnedCalls).toHaveLength(0)
    })

    it('27. non-interactive suggestion exits with code 1', async () => {
      const { io } = createMockIO({ isTTY: false })
      const code = await runScopeCli('pkg', ['web', 'add', 'clsx'], io, testRootDir)
      expect(code).toBe(1)
    })

    it('28. same name exists in apps and packages', async () => {
      fs.mkdirSync(path.join(testRootDir, 'packages', 'web'), { recursive: true })
      fs.writeFileSync(
        path.join(testRootDir, 'packages', 'web', 'package.json'),
        JSON.stringify({ name: '@acme/web-pkg' })
      )

      const wsIO = createMockIO()
      const wsCode = await runScopeCli('ws', ['web', 'add', 'next'], wsIO.io, testRootDir)
      expect(wsCode).toBe(0)
      expect(wsIO.spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['add', '--filter', 'web-app', 'next'], cwd: testRootDir },
      ])

      const pkgIO = createMockIO()
      const pkgCode = await runScopeCli('pkg', ['web', 'add', 'clsx'], pkgIO.io, testRootDir)
      expect(pkgCode).toBe(0)
      expect(pkgIO.spawnedCalls).toEqual([
        { cmd: ['bun'], args: ['add', '--filter', '@acme/web-pkg', 'clsx'], cwd: testRootDir },
      ])
    })
  })

  describe('Dynamic discovery', () => {
    beforeEach(setupTestWorkspaces)
    afterEach(cleanupTestWorkspaces)

    it('29. dynamic app discovery', async () => {
      fs.mkdirSync(path.join(testRootDir, 'apps', 'admin'), { recursive: true })
      fs.writeFileSync(
        path.join(testRootDir, 'apps', 'admin', 'package.json'),
        JSON.stringify({ name: 'admin-dashboard' })
      )

      const apps = discoverWorkspaces('app', testRootDir)
      expect(apps.map((app) => app.dirName)).toEqual(['admin', 'cms', 'web'])
      expect(findWorkspace('app', 'admin', testRootDir)?.name).toBe('admin-dashboard')
    })

    it('30. dynamic package discovery', async () => {
      fs.mkdirSync(path.join(testRootDir, 'packages', 'auth'), { recursive: true })
      fs.writeFileSync(
        path.join(testRootDir, 'packages', 'auth', 'package.json'),
        JSON.stringify({ name: '@acme/auth' })
      )

      const packages = discoverWorkspaces('package', testRootDir)
      expect(packages.map((pkg) => pkg.dirName)).toEqual(['auth', 'forms', 'ui'])
      expect(findWorkspace('package', 'auth', testRootDir)?.name).toBe('@acme/auth')
    })
  })

  describe('Process propagation', () => {
    beforeEach(setupTestWorkspaces)
    afterEach(cleanupTestWorkspaces)

    it('32. Bun exit code propagation', async () => {
      const { io } = createMockIO({
        spawn: async () => 42,
      })
      const code = await runScopeCli('root', ['install'], io, testRootDir)
      expect(code).toBe(42)
    })

    it('33. arguments are passed without shell interpolation', async () => {
      const { io, spawnedCalls } = createMockIO()
      const maliciousPkgName = 'pkg; rm -rf /; echo `whoami`'
      const code = await runScopeCli('ws', ['web', 'add', maliciousPkgName], io, testRootDir)
      expect(code).toBe(0)
      expect(spawnedCalls[0]?.args).toEqual(['add', '--filter', 'web-app', maliciousPkgName])
    })
  })
})
