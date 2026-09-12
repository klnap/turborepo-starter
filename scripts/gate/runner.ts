/**
 * Listr execution lifecycle runner for verification gates.
 *
 * @packageDocumentation
 */

import { Listr, PRESET_TIMER } from 'listr2'
import { ANSI } from '../shared/ansi'
import { VERBOSE } from '../shared/spawn'
import { tasksFor } from './pipelines'
import { reportLighthouseLinks, reportSuccess } from './reporter'
import type { CiOptions } from './types'

export async function runPipeline(options: CiOptions): Promise<void> {
  const { mode, rootDir, verbose } = options

  const tasks = new Listr(await tasksFor(mode, rootDir), {
    exitOnError: true,
    concurrent: false,
    renderer: verbose || VERBOSE || !process.stdout.isTTY ? 'verbose' : 'default',
    rendererOptions: {
      collapseSubtasks: false,
      suffixSkips: true,
      timer: PRESET_TIMER,
      showErrorMessage: true,
    },
  })

  console.log('')
  const label =
    mode === 'quick'
      ? 'anti-slop gate (pre-commit)'
      : mode === 'ci'
        ? 'CI verification (anti-slop + verify)'
        : mode === 'push'
          ? 'verify gate (pre-push: tests, build, smoke)'
          : 'full verification gate'
  console.log(`${ANSI.BOLD}[gate] Executing ${label}...${ANSI.RESET}`)
  console.log('')

  const t0 = Date.now()
  await tasks.run()
  const duration = ((Date.now() - t0) / 1000).toFixed(1)

  if (mode === 'full') {
    reportLighthouseLinks(rootDir)
  }

  reportSuccess(mode, duration)
}
