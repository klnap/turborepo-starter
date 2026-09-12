/**
 * Shorthand entry for `bun adopt ws <app>` / `bun adopt pkg <name>`.
 *
 * @packageDocumentation
 */

import { ROOT_DIR } from '../../shared/paths'
import { discoverWorkspaces } from '../core/discovery'

const APP_SCOPES = new Set(['ws', 'app', 'apps'])
const PKG_SCOPES = new Set(['pkg', 'package', 'pckg', 'packages'])

export interface AdoptInvocation {
  adoptArgs: string[]
}

export function formatAdoptUsage(rootDir: string = ROOT_DIR): string {
  const apps = discoverWorkspaces('app', rootDir).map((workspace) => workspace.dirName)
  const packages = discoverWorkspaces('package', rootDir).map((workspace) => workspace.dirName)

  return `Usage:
  bun adopt ws <app> [flags]
  bun adopt pkg <name> [flags]
  bun adopt <apps/...|packages/...> [flags]

Aliases: app/apps → ws scope; package/pckg/packages → pkg scope.

Flags: --dry-run  --yes / -y  --visual  --storybook  --e2e  --lighthouse

Examples:
  bun adopt ws cms
  bun adopt pkg ui --dry-run
  bun adopt apps/admin --yes

Also: bun root adopt <path> …

Apps: ${apps.length > 0 ? apps.join(', ') : '(none)'}
Packages: ${packages.length > 0 ? packages.join(', ') : '(none)'}`
}

function resolveShorthandName(name: string, rootDir: string): string | undefined {
  const appMatch = discoverWorkspaces('app', rootDir).filter(
    (workspace) => workspace.dirName === name
  )
  const pkgMatch = discoverWorkspaces('package', rootDir).filter(
    (workspace) => workspace.dirName === name
  )

  if (appMatch.length === 1 && pkgMatch.length === 0) {
    return `apps/${name}`
  }
  if (pkgMatch.length === 1 && appMatch.length === 0) {
    return `packages/${name}`
  }
  if (appMatch.length === 1 && pkgMatch.length === 1) {
    return undefined
  }
  if (appMatch.length === 0 && pkgMatch.length === 0) {
    return undefined
  }
  return undefined
}

/**
 * Map `bun adopt …` argv to `runAdopt` argv (`<path>` + flags).
 */
export function parseAdoptInvocation(
  rawArgs: string[],
  rootDir: string = ROOT_DIR
): AdoptInvocation | { error: string } {
  if (rawArgs.length === 0) {
    return { error: formatAdoptUsage(rootDir) }
  }

  const [first, second, ...rest] = rawArgs
  if (!first) {
    return { error: formatAdoptUsage(rootDir) }
  }

  if (first.startsWith('apps/') || first.startsWith('packages/')) {
    return { adoptArgs: [first, second, ...rest].filter((arg): arg is string => Boolean(arg)) }
  }

  if (APP_SCOPES.has(first)) {
    if (!second) {
      return {
        error: `Missing app name.\n\nUsage:\n  bun adopt ws <app>\n\nExample:\n  bun adopt ws web`,
      }
    }
    return { adoptArgs: [`apps/${second}`, ...rest] }
  }

  if (PKG_SCOPES.has(first)) {
    if (!second) {
      return {
        error: `Missing package name.\n\nUsage:\n  bun adopt pkg <name>\n\nExample:\n  bun adopt pkg ui`,
      }
    }
    return { adoptArgs: [`packages/${second}`, ...rest] }
  }

  const shorthand = resolveShorthandName(first, rootDir)
  if (!shorthand) {
    const apps = discoverWorkspaces('app', rootDir).map((workspace) => workspace.dirName)
    const packages = discoverWorkspaces('package', rootDir).map((workspace) => workspace.dirName)
    const ambiguous =
      apps.includes(first) && packages.includes(first)
        ? `\n\n"${first}" exists under both apps/ and packages/. Use:\n  bun adopt ws ${first}\n  bun adopt pkg ${first}`
        : ''

    return {
      error: `Unknown workspace "${first}".${ambiguous}\n\n${formatAdoptUsage(rootDir)}`,
    }
  }

  return { adoptArgs: [shorthand, second, ...rest].filter((arg): arg is string => Boolean(arg)) }
}
