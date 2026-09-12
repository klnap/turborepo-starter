/**
 * Staged confidential environment file guard.
 *
 * Secret patterns are covered by gitleaks (`scripts/git/gitleaks.ts`).
 *
 * @packageDocumentation
 */

import type { SecurityCheckResult, SecurityViolation } from './types'

const FORBIDDEN_ENV_REGEX = /^\.env(\.[^/]+)?$/
const ALLOWED_ENV_SUFFIXES = ['.example', '.sample', '.template']

async function getGitOutput(args: string[]): Promise<string> {
  try {
    const proc = Bun.spawn(['git', ...args], {
      stdout: 'pipe',
      stderr: 'ignore',
      stdin: 'ignore',
    })
    return (await new Response(proc.stdout).text()).trim()
  } catch {
    return ''
  }
}

export async function checkConfidentialFiles(): Promise<SecurityViolation[]> {
  const violations: SecurityViolation[] = []
  const stagedFilesRaw = await getGitOutput(['diff', '--cached', '--name-only'])
  const files = stagedFilesRaw
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)

  for (const file of files) {
    const filename = file.split('/').pop() ?? ''
    if (FORBIDDEN_ENV_REGEX.test(filename)) {
      const isAllowed = ALLOWED_ENV_SUFFIXES.some((suffix) => filename.endsWith(suffix))
      if (!isAllowed) {
        violations.push({
          file,
          rule: 'Confidential Environment File',
          detail: `Committed file '${file}' contains confidential environment parameters.`,
        })
      }
    }
  }

  return violations
}

export async function runSecurityAudit(): Promise<SecurityCheckResult> {
  const violations = await checkConfidentialFiles()

  return {
    passed: violations.length === 0,
    violations,
  }
}
