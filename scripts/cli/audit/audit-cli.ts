/**
 * `bun root audit` — repository drift audit CLI wrapper.
 *
 * @packageDocumentation
 */

import { auditExitCode, formatAuditReport, runRepoAudit } from '../../audit/repo'
import type { RunnerIO } from '../core/types'

export function runRepoAuditCli(rawArgs: string[], io: RunnerIO, rootDir: string): number {
  const json = rawArgs.includes('--json')
  const report = runRepoAudit(rootDir)

  if (json) {
    io.stdout(JSON.stringify(report, null, 2))
  } else {
    io.stdout(formatAuditReport(report))
  }

  return auditExitCode(report)
}
