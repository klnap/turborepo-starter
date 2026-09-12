#!/usr/bin/env bun

/**
 * CLI entry for manual gitleaks runs (`bun run gitleaks:staged` / `gitleaks:scan`).
 *
 * @packageDocumentation
 */

import { runGitleaksStaged, runGitleaksWorkdir } from './gitleaks'

const mode = Bun.argv[2]

async function main(): Promise<void> {
  if (mode === 'staged') {
    await runGitleaksStaged()
    return
  }
  if (mode === 'workdir') {
    await runGitleaksWorkdir()
    return
  }
  console.error('Usage: bun ./scripts/git/gitleaks-cli.ts <staged|workdir>')
  process.exit(1)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
