#!/usr/bin/env bun
/**
 * Root scope CLI entrypoint.
 *
 * @packageDocumentation
 */

import { runScopeCli } from '../core/run'

const exitCode = await runScopeCli('root', process.argv.slice(2))
process.exit(exitCode)
