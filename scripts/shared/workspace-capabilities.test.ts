import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { ROOT_DIR } from './paths'
import {
  discoverWorkspaceCapabilities,
  e2eBrowserMatrix,
  workspacesWithCapability,
} from './workspace-capabilities'

describe('workspace capabilities', () => {
  it('discovers web e2e capability', () => {
    const e2e = workspacesWithCapability('e2e', ROOT_DIR)
    expect(e2e.some((workspace) => workspace.dirName === 'web')).toBe(true)
  })

  it('builds e2e browser matrix for web', () => {
    const matrix = e2eBrowserMatrix(ROOT_DIR)
    expect(matrix.length).toBeGreaterThanOrEqual(3)
    expect(matrix.some((entry) => entry.workspace === 'web' && entry.browser === 'chromium')).toBe(
      true
    )
  })

  it('returns stable capability records', () => {
    const capabilities = discoverWorkspaceCapabilities(ROOT_DIR)
    const web = capabilities.find((workspace) => workspace.dirName === 'web')
    expect(web?.capabilities).toContain('e2e')
    expect(web?.capabilities).toContain('visual')
    expect(web?.capabilities).toContain('next-bundle')
    expect(web?.relativePath).toBe(path.join('apps', 'web'))
  })
})
