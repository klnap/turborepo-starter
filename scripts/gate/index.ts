#!/usr/bin/env bun

/**
 * Verification gate entry point (`gate:quick` / `gate:full`).
 *
 * @packageDocumentation
 */

import { ROOT_DIR } from '../shared/paths'
import { runPipeline } from './runner'
import type { CiMode } from './types'

async function main(): Promise<void> {
  const arg = Bun.argv[2]
  if (arg !== 'quick' && arg !== 'ci' && arg !== 'push' && arg !== 'full') {
    console.error(
      'Usage: bun ./scripts/gate/index.ts <quick|ci|push|full>  (or: bun run gate:quick | gate:ci | gate:push | gate:full)'
    )
    process.exit(1)
  }

  const mode: CiMode = arg
  await runPipeline({
    mode,
    rootDir: ROOT_DIR,
    verbose: Bun.env.VERBOSE === '1' || Bun.env.CI_VERBOSE === '1',
  })
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
