#!/usr/bin/env bun

/**
 * GitHub Actions matrix discovery from workspace capabilities.
 */

import {
  e2eBrowserMatrix,
  type WorkspaceCapability,
  workspacesWithCapability,
} from '../../shared/workspace-capabilities'

const mode = Bun.argv[2]

function workspaceMatrix(capability: WorkspaceCapability): void {
  const workspaces = workspacesWithCapability(capability)
  const include = workspaces.map((workspace) => ({ workspace: workspace.dirName }))
  console.log(
    JSON.stringify({
      include,
      has: include.length > 0 ? 'true' : 'false',
    })
  )
}

switch (mode) {
  case 'e2e-browsers': {
    const include = e2eBrowserMatrix()
    console.log(
      JSON.stringify({
        include,
        has: include.length > 0 ? 'true' : 'false',
      })
    )
    break
  }
  case 'visual':
    workspaceMatrix('visual')
    break
  case 'checkly':
    workspaceMatrix('checkly')
    break
  case 'next-bundle':
    workspaceMatrix('next-bundle')
    break
  default:
    console.error(
      `Usage: bun scripts/gate/adapters/gh-matrix.ts <e2e-browsers|visual|checkly|next-bundle>`
    )
    process.exit(1)
}
