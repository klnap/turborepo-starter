/**
 * Gitleaks runner: staged (fast) and workdir scans with optional binary bootstrap.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { ROOT_DIR } from '../shared/paths'
import type { RunOptions } from '../shared/spawn'
import { runProcess } from '../shared/spawn'

/** Pinned release — keep in sync with `.github/workflows/gitleaks.yml` action generation. */
const GITLEAKS_VERSION = '8.24.3'

const BIN_DIR = path.join(ROOT_DIR, '.generated/bin')
const CACHED_BIN = path.join(BIN_DIR, 'gitleaks')

function platformAsset(): string | null {
  const { platform, arch } = process
  if (platform === 'linux' && arch === 'x64') return `gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz`
  if (platform === 'darwin' && arch === 'arm64')
    return `gitleaks_${GITLEAKS_VERSION}_darwin_arm64.tar.gz`
  if (platform === 'darwin' && arch === 'x64')
    return `gitleaks_${GITLEAKS_VERSION}_darwin_x64.tar.gz`
  return null
}

async function getStagedFileCount(): Promise<number> {
  const proc = Bun.spawn(['git', 'diff', '--cached', '--name-only'], {
    stdout: 'pipe',
    stderr: 'ignore',
    stdin: 'ignore',
  })
  const text = (await new Response(proc.stdout).text()).trim()
  if (!text) return 0
  return text.split('\n').filter(Boolean).length
}

/**
 * Resolves the gitleaks executable: `PATH`, then `.generated/bin/gitleaks`.
 */
export async function ensureGitleaksBinary(): Promise<string> {
  const fromPath = Bun.which('gitleaks')
  if (fromPath) return fromPath

  if (fs.existsSync(CACHED_BIN)) return CACHED_BIN

  const asset = platformAsset()
  if (!asset) {
    throw new Error(
      `gitleaks: no prebuilt binary for ${process.platform}/${process.arch}. Install gitleaks (https://github.com/gitleaks/gitleaks#installing) or run on linux-x64 / darwin-arm64 / darwin-x64.`
    )
  }

  fs.mkdirSync(BIN_DIR, { recursive: true })
  const url = `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${asset}`

  const proc = Bun.spawn(['tar', '-xzf', '-', '-C', BIN_DIR, 'gitleaks'], {
    stdin: 'pipe',
    stdout: 'inherit',
    stderr: 'inherit',
  })

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`gitleaks: failed to download ${url} (${response.status})`)
  }

  const bytes = await response.arrayBuffer()
  await proc.stdin.write(bytes)
  await proc.stdin.end()
  const exitCode = await proc.exited
  if (exitCode !== 0 || !fs.existsSync(CACHED_BIN)) {
    throw new Error('gitleaks: download or extract failed')
  }

  await Bun.$`chmod +x ${CACHED_BIN}`.cwd(ROOT_DIR).quiet()
  return CACHED_BIN
}

/**
 * Scans **staged** changes only — intended for pre-commit and `gate:quick` (fast path).
 * No-op when nothing is staged.
 */
export async function runGitleaksStaged(opts: RunOptions = {}): Promise<void> {
  if (Bun.env.SKIP_GITLEAKS === '1') return

  const stagedCount = await getStagedFileCount()
  if (stagedCount === 0) return

  const bin = await ensureGitleaksBinary()
  const config = path.join(ROOT_DIR, '.gitleaks.toml')

  await runProcess(
    bin,
    ['protect', '--staged', '--no-banner', '--redact', '--config', config, '--source', ROOT_DIR],
    opts
  )
}

/**
 * Scans full git history — parity with `.github/workflows/gitleaks.yml`.
 */
export async function runGitleaksGitHistory(opts: RunOptions = {}): Promise<void> {
  if (Bun.env.SKIP_GITLEAKS === '1') return

  const bin = await ensureGitleaksBinary()
  const config = path.join(ROOT_DIR, '.gitleaks.toml')

  await runProcess(
    bin,
    ['detect', '--no-banner', '--redact', '--config', config, '--source', ROOT_DIR],
    opts
  )
}

/**
 * Scans the working tree without git history — `gate:full` / pre-push (slower than staged).
 */
export async function runGitleaksWorkdir(opts: RunOptions = {}): Promise<void> {
  if (Bun.env.SKIP_GITLEAKS === '1') return

  const bin = await ensureGitleaksBinary()
  const config = path.join(ROOT_DIR, '.gitleaks.toml')

  await runProcess(
    bin,
    ['detect', '--no-git', '--no-banner', '--redact', '--config', config, '--source', ROOT_DIR],
    opts
  )
}
