/**
 * Optional Graphviz (`dot`) detection for coupling-graph tooling.
 *
 * @packageDocumentation
 */

import { spawnSync } from 'node:child_process'

export const GRAPHVIZ_INSTALL_HINT =
  'Install Graphviz: https://graphviz.org/download/ (e.g. `sudo apt install graphviz` on Debian/Ubuntu)'

export function hasGraphviz(): boolean {
  const result = spawnSync('dot', ['-V'], { encoding: 'utf8' })
  return result.status === 0
}

export function requireGraphviz(toolName = 'coupling-graph'): void {
  if (hasGraphviz()) return
  console.error(`[${toolName}] Graphviz is required but \`dot\` was not found.`)
  console.error(`[${toolName}] ${GRAPHVIZ_INSTALL_HINT}`)
  process.exit(1)
}
