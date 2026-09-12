#!/usr/bin/env bun
/**
 * Package scope CLI entrypoint.
 *
 * @packageDocumentation
 */

import { runScopeCli } from '../core/run'

const exitCode = await runScopeCli('pkg', process.argv.slice(2))
process.exit(exitCode)
