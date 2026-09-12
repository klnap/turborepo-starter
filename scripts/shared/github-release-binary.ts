/**
 * Download pinned CLI tools into `.generated/bin` when missing from PATH.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { ROOT_DIR } from './paths'

const BIN_DIR = path.join(ROOT_DIR, '.generated/bin')

export type PlatformAssetResolver = (
  platform: NodeJS.Platform,
  arch: string,
  version: string
) => string | null

export async function ensureGithubReleaseBinary(options: {
  repo: string
  binaryName: string
  version: string
  resolveAsset: PlatformAssetResolver
  archiveMember?: string
}): Promise<string> {
  const { repo, binaryName, version, resolveAsset, archiveMember = binaryName } = options
  const cached = path.join(BIN_DIR, binaryName)

  const fromPath = Bun.which(binaryName)
  if (fromPath) return fromPath
  if (fs.existsSync(cached)) return cached

  const asset = resolveAsset(process.platform, process.arch, version)
  if (!asset) {
    throw new Error(
      `${binaryName}: no prebuilt binary for ${process.platform}/${process.arch}. Install ${binaryName} manually or run on linux-x64 / darwin-arm64 / darwin-x64.`
    )
  }

  fs.mkdirSync(BIN_DIR, { recursive: true })
  const url = `https://github.com/${repo}/releases/download/v${version}/${asset}`

  const proc = Bun.spawn(['tar', '-xzf', '-', '-C', BIN_DIR, archiveMember], {
    stdin: 'pipe',
    stdout: 'inherit',
    stderr: 'inherit',
  })

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${binaryName}: failed to download ${url} (${response.status})`)
  }

  const bytes = await response.arrayBuffer()
  await proc.stdin.write(bytes)
  await proc.stdin.end()
  const exitCode = await proc.exited
  if (exitCode !== 0 || !fs.existsSync(cached)) {
    throw new Error(`${binaryName}: download or extract failed`)
  }

  await Bun.$`chmod +x ${cached}`.cwd(ROOT_DIR).quiet()
  return cached
}
