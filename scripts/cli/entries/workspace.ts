#!/usr/bin/env bun
/**
 * Application scope CLI entrypoint.
 *
 * @packageDocumentation
 */

import { runScopeCli } from '../core/run'

const exitCode = await runScopeCli('ws', process.argv.slice(2))
process.exit(exitCode)
