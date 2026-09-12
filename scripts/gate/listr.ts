/**
 * Listr2 group presets for gate pipelines.
 *
 * @packageDocumentation
 */

import { PRESET_TIMER } from 'listr2'

export const concurrentGroup = {
  concurrent: true,
  exitOnError: true,
  rendererOptions: {
    collapseSubtasks: false,
    timer: PRESET_TIMER,
  },
} as const

export const sequentialGroup = {
  concurrent: false,
  exitOnError: true,
  rendererOptions: {
    collapseSubtasks: false,
    timer: PRESET_TIMER,
  },
} as const
