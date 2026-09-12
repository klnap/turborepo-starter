#!/usr/bin/env bun

/**
 * Repository drift audit CLI entry point.
 *
 * @packageDocumentation
 */

import { ROOT_DIR } from '../shared/paths'
import { auditExitCode, formatAuditReport, runRepoAudit } from './repo'

const json = Bun.argv.includes('--json')
const report = runRepoAudit(ROOT_DIR)

if (json) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(formatAuditReport(report))
}

process.exit(auditExitCode(report))
