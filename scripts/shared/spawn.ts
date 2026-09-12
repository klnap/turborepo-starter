/**
 * Shared native Bun process execution utilities.
 *
 * @packageDocumentation
 */

import path from 'node:path'
import { ROOT_DIR } from './paths'

export const VERBOSE = Bun.env.VERBOSE === '1' || Bun.env.CI_VERBOSE === '1'

const BUN_EXEC = process.execPath || 'bun'
const BUN_DIR = path.dirname(BUN_EXEC)
const PATH_ENV = `${BUN_DIR}:${Bun.env.PATH ?? ''}`

export interface RunOptions {
  cwd?: string
  env?: Record<string, string | undefined>
  task?: { output?: string }
  onLine?: (line: string) => void
}

export async function runProcess(
  cmd: string,
  args: string[],
  opts: RunOptions = {}
): Promise<void> {
  const { cwd = ROOT_DIR, env, task, onLine } = opts

  let execArgs: string[]
  if (cmd === 'bunx') {
    execArgs = [BUN_EXEC, 'x', ...args]
  } else if (cmd === 'bun') {
    execArgs = [BUN_EXEC, ...args]
  } else {
    execArgs = [cmd, ...args]
  }

  const proc = Bun.spawn(execArgs, {
    cwd,
    env: {
      ...Bun.env,
      PATH: PATH_ENV,
      ...env,
    },
    stdin: 'ignore',
    stdout: VERBOSE ? 'inherit' : 'pipe',
    stderr: VERBOSE ? 'inherit' : 'pipe',
  })

  let output = ''

  if (!VERBOSE) {
    const handleStream = async (stream?: ReadableStream<Uint8Array> | null) => {
      if (!stream) return
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        output += text
        if (task || onLine) {
          const lines = text.trimEnd().split('\n').filter(Boolean)
          if (task && lines.length) task.output = lines.at(-1)
          if (onLine) {
            for (const line of lines) {
              onLine(line.trim())
            }
          }
        }
      }
    }

    await Promise.all([handleStream(proc.stdout), handleStream(proc.stderr)])
  }

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const tail = output.trim().split('\n').slice(-40).join('\n')
    const err = new Error(`${cmd} ${args.join(' ')} exited with code ${exitCode}`)
    if (tail) err.message += `\n\n${tail}`
    throw err
  }
}

/** Inherit stdio — for CLI subprocesses (no output capture). */
export async function spawnInherit(cmd: string[], args: string[], cwd: string): Promise<number> {
  const executable = cmd[0]
  if (!executable) {
    return 1
  }

  const proc = Bun.spawn([executable, ...args], {
    cwd,
    stdio: ['inherit', 'inherit', 'inherit'],
  })

  return proc.exited
}
