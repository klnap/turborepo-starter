#!/usr/bin/env bun

/**
 * Pre-commit hook: gitleaks (staged), .env guard, Biome staged fix, then `gate:quick` (knip, lint, types, …).
 *
 * @packageDocumentation
 */

import { runPipeline } from '../gate/runner'
import { ANSI } from '../shared/ansi'
import { ROOT_DIR } from '../shared/paths'
import { runProcess } from '../shared/spawn'
import { runGitleaksStaged } from './gitleaks'
import { runSecurityAudit } from './security'

async function autoFixStagedWithBiome(): Promise<void> {
  console.log(
    `${ANSI.BOLD}[git:pre-commit] Auto-fixing staged files (format, imports)...${ANSI.RESET}`
  )
  await runProcess('bunx', ['biome', 'check', '--write', '--staged', '--no-errors-on-unmatched'])
}

async function main(): Promise<void> {
  console.log(`${ANSI.BOLD}[git:pre-commit] Executing local commit gate...${ANSI.RESET}`)

  // 1. Gitleaks on staged diff only (fast)
  try {
    await runGitleaksStaged()
  } catch (err) {
    console.error('')
    console.error(
      `${ANSI.BOLD}${ANSI.RED}[git:pre-commit] [ERROR] Gitleaks found potential secrets in staged changes.${ANSI.RESET}`
    )
    console.error(err instanceof Error ? err.message : err)
    console.error('')
    process.exit(1)
  }

  // 2. Block committing real .env files (not covered by gitleaks rules)
  const security = await runSecurityAudit()
  if (!security.passed) {
    console.error('')
    console.error(
      `${ANSI.BOLD}${ANSI.RED}[git:pre-commit] [ERROR] Security check failed with ${security.violations.length} violation(s):${ANSI.RESET}`
    )
    for (const v of security.violations) {
      console.error(`  - ${ANSI.YELLOW}${v.rule}${ANSI.RESET}: ${v.detail}`)
      if (v.file) {
        console.error(`    File: ${v.file}`)
      }
    }
    console.error('')
    process.exit(1)
  }

  // 3. Biome: format, import order, safe lint fixes on staged files only
  await autoFixStagedWithBiome()

  // 4. Fast gate (gitleaks already ran above)
  Bun.env.SKIP_GITLEAKS = '1'
  try {
    await runPipeline({
      mode: 'quick',
      rootDir: ROOT_DIR,
      verbose: Bun.env.VERBOSE === '1' || Bun.env.CI_VERBOSE === '1',
    })
    console.log(
      `${ANSI.BOLD}${ANSI.GREEN}[git:pre-commit] [PASS] Pre-commit gate passed successfully.${ANSI.RESET}\n`
    )
  } catch {
    console.error(
      `${ANSI.BOLD}${ANSI.RED}[git:pre-commit] [ERROR] Quick CI verification failed. Commit aborted.${ANSI.RESET}\n`
    )
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
