/**
 * Dependency management command detection.
 *
 * @packageDocumentation
 */

import type { PackageMgmtCommand } from './types'

export const PACKAGE_MGMT_COMMANDS = new Set<PackageMgmtCommand>([
  'install',
  'add',
  'remove',
  'update',
])

/** Dependency commands take precedence over Turbo tasks with the same name. */
export function isPackageMgmtCommand(command: string): command is PackageMgmtCommand {
  return PACKAGE_MGMT_COMMANDS.has(command as PackageMgmtCommand)
}
