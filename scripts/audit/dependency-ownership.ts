#!/usr/bin/env bun

import path from 'node:path'
import { collectDependencyOwnershipIssues } from './lint-deps'

export { collectDependencyOwnershipIssues }

const rootDir = path.resolve(import.meta.dir, '../..')
const issues = collectDependencyOwnershipIssues(rootDir)

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`❌ Violation: ${issue.message}`)
  }
  console.error('[audit:dependencies] ❌ Monorepo dependency ownership audit failed.')
  process.exit(1)
}

console.log(
  '[audit:dependencies] [PASS] All dependency ownership boundaries are strictly preserved.'
)
