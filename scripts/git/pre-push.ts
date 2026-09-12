#!/usr/bin/env bun

/**
 * Pre-push hook: `gate:push` (verify + tests + smoke). `GATE_FULL=1` → `gate:full`.
 *
 * @packageDocumentation
 */

import { runPipeline } from '../gate/runner'
import type { CiMode } from '../gate/types'
import { ANSI } from '../shared/ansi'
import { ROOT_DIR } from '../shared/paths'

async function main(): Promise<void> {
  const mode: CiMode = Bun.env.GATE_FULL === '1' ? 'full' : 'push'
  const label = mode === 'full' ? 'full pre-push verification' : 'pre-push verification'

  console.log(`${ANSI.BOLD}[git:pre-push] Executing ${label}...${ANSI.RESET}`)

  try {
    await runPipeline({
      mode,
      rootDir: ROOT_DIR,
      verbose: Bun.env.VERBOSE === '1' || Bun.env.CI_VERBOSE === '1',
    })
    console.log(
      `${ANSI.BOLD}${ANSI.GREEN}[git:pre-push] [PASS] Pre-push verification passed successfully.${ANSI.RESET}\n`
    )
  } catch {
    console.error(
      `${ANSI.BOLD}${ANSI.RED}[git:pre-push] [ERROR] Pre-push verification failed. Push aborted.${ANSI.RESET}\n`
    )
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
