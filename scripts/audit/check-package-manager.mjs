/**
 * Fail installs started with npm / pnpm / yarn.
 * Invoked via root `preinstall` (runs under `node` before deps exist).
 *
 * @see ../../docs/adr/ADR-0001-bun-package-manager.md
 *
 * Uses Listr2 when available; falls back to plain checks on a fresh clone
 * so the first `bun install` is not blocked by a missing listr2.
 *
 * Detection uses `npm_config_user_agent` (set by every major package manager)
 * and `typeof Bun` when the script itself runs under Bun.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const ua = process.env.npm_config_user_agent ?? ''

function detectPackageManager() {
  if (typeof Bun !== 'undefined') return 'bun'
  if (ua.includes('bun/')) return 'bun'
  if (ua.includes('pnpm/')) return 'pnpm'
  if (ua.includes('yarn/')) return 'yarn'
  if (ua.includes('npm/')) return 'npm'
  if (ua) return ua.split('/')[0] ?? 'unknown'
  return 'unknown'
}

function parseSemver(version) {
  const [major = 0, minor = 0, patch = 0] = version.split('-')[0].split('.').map(Number)
  return { major, minor, patch }
}

function isAtLeast(actual, expected) {
  const a = parseSemver(actual)
  const e = parseSemver(expected)
  if (a.major !== e.major) return a.major > e.major
  if (a.minor !== e.minor) return a.minor > e.minor
  return a.patch >= e.patch
}

function readRequiredBunVersion() {
  const { packageManager } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  if (typeof packageManager !== 'string' || !packageManager.startsWith('bun@')) return null
  return packageManager.slice('bun@'.length)
}

function assertIsBun(detected) {
  if (detected === 'bun') return
  throw new Error(
    [
      'This repository uses Bun as its package manager.',
      '',
      'Please use:',
      '  bun install',
      '',
      `Detected: ${detected}`,
      '',
      'npm, pnpm, and yarn are not supported.',
    ].join('\n')
  )
}

function assertBunVersion() {
  if (typeof Bun === 'undefined') return

  const expected = readRequiredBunVersion()
  if (!expected) return

  const actual = Bun.version
  if (isAtLeast(actual, expected)) return

  throw new Error(
    [
      `This repository requires Bun >= ${expected} (see packageManager in package.json).`,
      '',
      `Detected Bun: ${actual}`,
      '',
      'Upgrade:',
      '  https://bun.sh/docs/installation',
    ].join('\n')
  )
}

/** @param {typeof import('listr2').Listr} Listr @param {typeof import('listr2').PRESET_TIMER} timer */
async function runWithListr(Listr, timer) {
  const tasks = new Listr(
    [
      {
        title: 'Package manager',
        task: (_ctx, task) =>
          task.newListr(
            [
              {
                title: 'require Bun',
                task: (_c, t) => {
                  const detected = detectPackageManager()
                  t.output = `detected ${detected}`
                  assertIsBun(detected)
                },
              },
              {
                title: 'Bun version',
                task: (_c, t) => {
                  if (typeof Bun === 'undefined') {
                    t.output = 'skipped (not running under Bun)'
                    return
                  }
                  const expected = readRequiredBunVersion()
                  if (!expected) {
                    t.output = 'no packageManager pin'
                    return
                  }
                  t.output = `${Bun.version} (need >= ${expected})`
                  assertBunVersion()
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
        timer,
        showErrorMessage: true,
      },
      fallbackRenderer: 'verbose',
    }
  )

  await tasks.run()
}

function runPlain() {
  try {
    assertIsBun(detectPackageManager())
    assertBunVersion()
  } catch (err) {
    console.error(`\n${err instanceof Error ? err.message : err}\n`)
    process.exit(1)
  }
}

async function main() {
  try {
    const { Listr, PRESET_TIMER } = await import('listr2')
    await runWithListr(Listr, PRESET_TIMER)
  } catch (err) {
    const missing =
      err instanceof Error &&
      (err.code === 'ERR_MODULE_NOT_FOUND' ||
        err.message.includes('Cannot find package') ||
        err.message.includes('Cannot find module'))

    if (missing) {
      runPlain()
      return
    }

    process.exit(1)
  }
}

await main()
