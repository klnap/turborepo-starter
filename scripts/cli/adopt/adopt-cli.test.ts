import { afterEach, describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { parseAdoptInvocation } from './adopt-cli'

describe('parseAdoptInvocation', () => {
  const testRootDir = path.join(import.meta.dir, '../../.generated/tests/tmp-adopt-cli')

  function writeRepo() {
    fs.rmSync(testRootDir, { recursive: true, force: true })
    fs.mkdirSync(path.join(testRootDir, 'apps', 'cms'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'apps', 'web'), { recursive: true })
    fs.mkdirSync(path.join(testRootDir, 'packages', 'ui'), { recursive: true })

    for (const rel of ['apps/cms', 'apps/web', 'packages/ui']) {
      fs.writeFileSync(
        path.join(testRootDir, rel, 'package.json'),
        JSON.stringify({ name: rel.replace('/', '-'), version: '0.0.0' })
      )
    }
  }

  afterEach(() => {
    fs.rmSync(testRootDir, { recursive: true, force: true })
  })

  it('maps ws scope to apps/<name>', () => {
    writeRepo()
    expect(parseAdoptInvocation(['ws', 'cms'], testRootDir)).toEqual({
      adoptArgs: ['apps/cms'],
    })
    expect(parseAdoptInvocation(['app', 'web', '--dry-run'], testRootDir)).toEqual({
      adoptArgs: ['apps/web', '--dry-run'],
    })
  })

  it('maps pkg aliases to packages/<name>', () => {
    writeRepo()
    for (const scope of ['pkg', 'package', 'pckg', 'packages']) {
      expect(parseAdoptInvocation([scope, 'ui'], testRootDir)).toEqual({
        adoptArgs: ['packages/ui'],
      })
    }
  })

  it('passes through full paths', () => {
    writeRepo()
    expect(parseAdoptInvocation(['apps/cms', '--yes'], testRootDir)).toEqual({
      adoptArgs: ['apps/cms', '--yes'],
    })
  })

  it('resolves unique shorthand name', () => {
    writeRepo()
    expect(parseAdoptInvocation(['cms'], testRootDir)).toEqual({ adoptArgs: ['apps/cms'] })
    expect(parseAdoptInvocation(['ui'], testRootDir)).toEqual({ adoptArgs: ['packages/ui'] })
  })

  it('errors on missing scoped name', () => {
    writeRepo()
    const ws = parseAdoptInvocation(['ws'], testRootDir)
    expect(ws).toHaveProperty('error')
    if ('error' in ws) {
      expect(ws.error).toContain('Missing app name')
    }
  })

  it('errors on unknown workspace', () => {
    writeRepo()
    const result = parseAdoptInvocation(['nope'], testRootDir)
    expect(result).toHaveProperty('error')
    if ('error' in result) {
      expect(result.error).toContain('Unknown workspace')
    }
  })
})
