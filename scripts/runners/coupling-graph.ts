#!/usr/bin/env bun
/**
 * Coupling / architecture graph for a single workspace.
 * Output: `<workspace>/.generated/coupling-graph/graph.svg`
 *
 * @packageDocumentation
 */

import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { $ } from 'bun'
import { Listr, PRESET_TIMER } from 'listr2'
import { requireGraphviz } from '../shared/graphviz'
import { resolveWorkspaceRoot, workspaceGeneratedDir } from '../shared/workspace'

requireGraphviz()

const workspaceRoot = resolveWorkspaceRoot()
const depcruiseConfig = path.join(workspaceRoot, 'dependency-cruiser.config.mjs')

if (!existsSync(depcruiseConfig)) {
  console.error(`[coupling-graph] Missing dependency-cruiser.config.mjs in workspace`)
  process.exit(1)
}

const outDir = workspaceGeneratedDir(workspaceRoot, 'coupling-graph')
const svgFile = path.join(outDir, 'graph.svg')

const tasks = new Listr(
  [
    {
      title: 'Coupling graph',
      task: (_ctx, task) =>
        task.newListr(
          [
            {
              title: 'ensure output dir',
              task: (_c, t) => {
                if (!existsSync(outDir)) {
                  mkdirSync(outDir, { recursive: true })
                }
                t.output = path.relative(workspaceRoot, outDir)
              },
            },
            {
              title: 'write graph.svg',
              task: async (_c, t) => {
                const dotSource =
                  await $`bunx depcruise --config dependency-cruiser.config.mjs --output-type archi src`
                    .cwd(workspaceRoot)
                    .text()
                const svg = await $`dot -T svg < ${new Response(dotSource)}`.text()
                await Bun.write(svgFile, svg)
                t.output = path.relative(workspaceRoot, svgFile)
              },
            },
          ],
          {
            concurrent: false,
            exitOnError: true,
            rendererOptions: { collapseSubtasks: false },
          }
        ),
    },
  ],
  {
    exitOnError: true,
    rendererOptions: {
      collapseSubtasks: false,
      timer: PRESET_TIMER,
      showErrorMessage: true,
    },
  }
)

try {
  await tasks.run()
} catch {
  process.exit(1)
}
