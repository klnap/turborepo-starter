#!/usr/bin/env bun

import path from 'node:path'

const IGNORES = [
  'GHSA-848j-6mx2-7j84',
  'GHSA-jmr9-qjv8-65gv',
  'GHSA-5p2g-fcmc-qvqq',
  'GHSA-w3rx-r6r6-pgpr',
]

const rootDir = path.resolve(import.meta.dir, '../..')
const args = ['audit', ...IGNORES.flatMap((id) => ['--ignore', id])]
const result = Bun.spawnSync(['bun', ...args], {
  cwd: rootDir,
  stdout: 'inherit',
  stderr: 'inherit',
})

process.exit(result.exitCode ?? 1)
