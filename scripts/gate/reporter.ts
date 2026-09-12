/**
 * CI pipeline summary reporter and artifact link logger.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { ANSI } from '../shared/ansi'
import type { CiMode } from './types'

export function reportLighthouseLinks(rootDir: string): void {
  const linksPath = path.join(rootDir, 'apps/web/.generated/lighthouse/links.json')
  if (!fs.existsSync(linksPath)) {
    return
  }

  try {
    const links = JSON.parse(fs.readFileSync(linksPath, 'utf8')) as Record<string, string>
    const entries = Object.entries(links)
    if (entries.length === 0) return

    console.log('')
    console.log(
      `${ANSI.BOLD}🌐 Lighthouse CI Audit Reports (${entries.length} URL${entries.length > 1 ? 's' : ''}):${ANSI.RESET}`
    )
    for (const [targetUrl, reportUrl] of entries) {
      console.log('')
      console.log(`  ${ANSI.CYAN}● ${ANSI.BOLD}${targetUrl}${ANSI.RESET}`)
      console.log(
        `    ${ANSI.DIM}└── Report:${ANSI.RESET} ${ANSI.UNDERLINE}${ANSI.BLUE}${reportUrl}${ANSI.RESET}`
      )
    }
    console.log('')
  } catch {
    // Ignore unreadable report manifests
  }
}

export function reportSuccess(mode: CiMode, durationSeconds: string): void {
  const pipelineName =
    mode === 'quick'
      ? 'Anti-slop gate'
      : mode === 'ci'
        ? 'CI verification gate'
        : mode === 'push'
          ? 'Verify gate'
          : 'Full verification gate'
  console.log('')
  console.log(
    `${ANSI.BOLD}${ANSI.GREEN}[PASS] ${pipelineName} passed successfully in ${durationSeconds}s${ANSI.RESET}`
  )
  console.log('')
}
