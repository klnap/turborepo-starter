#!/usr/bin/env bun

/**
 * `bun adopt` — shorthand for workspace adoption.
 *
 * @packageDocumentation
 */

import { ROOT_DIR } from '../../shared/paths'
import { runAdopt } from '../adopt/adopt'
import { parseAdoptInvocation } from '../adopt/adopt-cli'

const parsed = parseAdoptInvocation(process.argv.slice(2), ROOT_DIR)

if ('error' in parsed) {
  console.error(parsed.error)
  process.exit(1)
}

const exitCode = await runAdopt(parsed.adoptArgs)
process.exit(exitCode)
