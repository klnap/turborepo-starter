#!/usr/bin/env bun

import path from 'node:path'
import { auditEnvironmentVariables, formatDeadEnvironmentVariables } from './lint-env'

const rootDir = path.resolve(import.meta.dir, '../..')

const deadByWorkspace = auditEnvironmentVariables(rootDir)

if (deadByWorkspace.length > 0) {
  console.error('')
  console.error(formatDeadEnvironmentVariables(deadByWorkspace))
  console.error('')
  process.exit(1)
}

console.log('[lint:env] [PASS] All declared environment variables are actively used.')
