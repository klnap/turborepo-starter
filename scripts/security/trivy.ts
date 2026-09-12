/**
 * Trivy filesystem scan — parity with `.github/workflows/security.yml`.
 *
 * @packageDocumentation
 */

import path from 'node:path'
import { ensureGithubReleaseBinary } from '../shared/github-release-binary'
import { ROOT_DIR } from '../shared/paths'
import type { RunOptions } from '../shared/spawn'
import { runProcess } from '../shared/spawn'

/** Keep in sync with `.github/workflows/security.yml` (trivy-action generation). */
const TRIVY_VERSION = '0.74.0'

function trivyAsset(platform: NodeJS.Platform, arch: string, version: string): string | null {
  if (platform === 'linux' && arch === 'x64') return `trivy_${version}_Linux-64bit.tar.gz`
  if (platform === 'darwin' && arch === 'arm64') return `trivy_${version}_macOS-ARM64.tar.gz`
  if (platform === 'darwin' && arch === 'x64') return `trivy_${version}_macOS-64bit.tar.gz`
  return null
}

async function ensureTrivyBinary(): Promise<string> {
  return ensureGithubReleaseBinary({
    repo: 'aquasecurity/trivy',
    binaryName: 'trivy',
    version: TRIVY_VERSION,
    resolveAsset: trivyAsset,
  })
}

export async function runTrivyFilesystemScan(opts: RunOptions = {}): Promise<void> {
  if (Bun.env.SKIP_TRIVY === '1') return

  const bin = await ensureTrivyBinary()
  const config = path.join(ROOT_DIR, 'trivy.yaml')

  await runProcess(
    bin,
    ['fs', '--config', config, '--exit-code', '1', '--severity', 'HIGH,CRITICAL', ROOT_DIR],
    opts
  )
}
