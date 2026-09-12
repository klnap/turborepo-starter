import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { APPS_DIR, ROOT_DIR } from './paths'
import { listWorkspacesWithFile, resolveWorkspaceRoot, workspaceGeneratedDir } from './workspace'

describe('workspace tooling helpers', () => {
  it('resolves workspace root from nested cwd in real monorepo', () => {
    const webRoot = path.join(APPS_DIR, 'web')
    expect(resolveWorkspaceRoot(path.join(webRoot, 'src', 'components'))).toBe(webRoot)
  })

  it('isolates generated output per workspace', () => {
    const web = path.join(APPS_DIR, 'web')
    const admin = path.join(APPS_DIR, 'admin')
    expect(workspaceGeneratedDir(web, 'lighthouse')).toBe(
      path.join(web, '.generated', 'lighthouse')
    )
    expect(workspaceGeneratedDir(admin, 'lighthouse')).toBe(
      path.join(admin, '.generated', 'lighthouse')
    )
  })

  it('lists only workspaces with opt-in config', () => {
    const found = listWorkspacesWithFile('lighthouse.config.ts', [APPS_DIR])
    expect(found).toContain(path.join(APPS_DIR, 'web'))
  })

  it('throws outside workspace tree', () => {
    expect(() => resolveWorkspaceRoot(ROOT_DIR)).toThrow(/Not inside a monorepo workspace/)
  })
})
