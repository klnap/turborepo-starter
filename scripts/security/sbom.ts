/**
 * SPDX SBOM generation + Grype scan — parity with `.github/workflows/sbom.yml`.
 *
 * @packageDocumentation
 */

import fs from 'node:fs'
import path from 'node:path'
import { ensureGithubReleaseBinary } from '../shared/github-release-binary'
import { ROOT_DIR } from '../shared/paths'
import type { RunOptions } from '../shared/spawn'
import { runProcess } from '../shared/spawn'

const SYFT_VERSION = '1.51.1'
const GRYPE_VERSION = '0.118.0'

const SBOM_PATH = path.join(ROOT_DIR, '.generated', 'sbom.spdx.json')

function syftAsset(platform: NodeJS.Platform, arch: string, version: string): string | null {
  if (platform === 'linux' && arch === 'x64') return `syft_${version}_linux_amd64.tar.gz`
  if (platform === 'darwin' && arch === 'arm64') return `syft_${version}_darwin_arm64.tar.gz`
  if (platform === 'darwin' && arch === 'x64') return `syft_${version}_darwin_amd64.tar.gz`
  return null
}

function grypeAsset(platform: NodeJS.Platform, arch: string, version: string): string | null {
  if (platform === 'linux' && arch === 'x64') return `grype_${version}_linux_amd64.tar.gz`
  if (platform === 'darwin' && arch === 'arm64') return `grype_${version}_darwin_arm64.tar.gz`
  if (platform === 'darwin' && arch === 'x64') return `grype_${version}_darwin_amd64.tar.gz`
  return null
}

async function ensureSyftBinary(): Promise<string> {
  return ensureGithubReleaseBinary({
    repo: 'anchore/syft',
    binaryName: 'syft',
    version: SYFT_VERSION,
    resolveAsset: syftAsset,
  })
}

async function ensureGrypeBinary(): Promise<string> {
  return ensureGithubReleaseBinary({
    repo: 'anchore/grype',
    binaryName: 'grype',
    version: GRYPE_VERSION,
    resolveAsset: grypeAsset,
  })
}

export async function runSbomAndGrypeScan(opts: RunOptions = {}): Promise<void> {
  if (Bun.env.SKIP_SBOM === '1') return

  fs.mkdirSync(path.dirname(SBOM_PATH), { recursive: true })

  const syft = await ensureSyftBinary()
  await runProcess(
    syft,
    ['scan', ROOT_DIR, '-o', `spdx-json=${SBOM_PATH}`, '--quiet', '--exclude', '**/.generated/**'],
    opts
  )

  const grype = await ensureGrypeBinary()
  await runProcess(grype, [`sbom:${SBOM_PATH}`, '--fail-on', 'high', '--quiet'], opts)
}
