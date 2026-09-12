/**
 * Type definitions for Continuous Integration pipelines.
 *
 * @packageDocumentation
 */

import type { ListrContext, ListrTask } from 'listr2'

export type CiMode = 'quick' | 'ci' | 'push' | 'full'

export type PipelineTask = ListrTask<ListrContext>

export interface CiOptions {
  mode: CiMode
  rootDir: string
  verbose: boolean
}
