/**
 * Command registry defining sections, options, labels, and hints for Developer CLI.
 *
 * @packageDocumentation
 */

import { discoverApplications } from '../core/discovery'
import type { CliItem } from '../core/types'

export function buildCliItems(rootDir: string): CliItem[] {
  const apps = discoverApplications(rootDir)
  const items: CliItem[] = []

  // Development
  items.push({ isHeader: true, label: 'Development' })
  items.push({
    isHeader: false,
    value: 'bun root dev',
    label: 'Start all development servers',
    hint: 'dev',
  })
  for (const app of apps) {
    items.push({
      isHeader: false,
      value: `bun ws ${app.dirName} dev`,
      label: `Start dev server (${app.packageName})`,
      hint: `dev:${app.packageName}`,
    })
  }
  items.push({
    isHeader: false,
    value: 'bun root start',
    label: 'Start compiled production server',
    hint: 'start',
  })

  // Quality & Verification
  items.push({ isHeader: true, label: 'Quality & Verification' })
  items.push(
    {
      isHeader: false,
      value: 'bun run gate:quick',
      label: 'Fast verification gate',
      hint: 'gate:quick',
    },
    {
      isHeader: false,
      value: 'bun run gate:full',
      label: 'Full verification pipeline',
      hint: 'gate:full',
    },
    {
      isHeader: false,
      value: 'bun root doctor',
      label: 'Repository diagnostics',
      hint: 'doctor',
    },
    {
      isHeader: false,
      value: 'bun run lint:code',
      label: 'Biome code linter',
      hint: 'lint:code',
    },
    {
      isHeader: false,
      value: 'bun run lint:code:fix',
      label: 'Biome auto-fix and format',
      hint: 'lint:fix',
    },
    {
      isHeader: false,
      value: 'bun run gitleaks:staged',
      label: 'Gitleaks secret scan (staged)',
      hint: 'gitleaks:staged',
    },
    {
      isHeader: false,
      value: 'bun run lint:oxlint',
      label: 'Oxlint anti-slop verification',
      hint: 'lint:oxlint',
    },
    {
      isHeader: false,
      value: 'bun root lint:i18n',
      label: 'Loccy i18n translation linter',
      hint: 'lint:i18n',
    },
    {
      isHeader: false,
      value: 'bun run lint:env',
      label: 'Environment schema validator',
      hint: 'lint:env',
    },
    {
      isHeader: false,
      value: 'bun root lint:architecture',
      label: 'Architectural boundaries check',
      hint: 'boundaries',
    },
    {
      isHeader: false,
      value: 'bun root knip',
      label: 'Knip dead-code & ghost-deps audit',
      hint: 'knip',
    },
    {
      value: 'bun run security:audit',
      isHeader: false,
      label: 'Security vulnerability audit',
      hint: 'audit',
    },
    {
      value: 'bun run lighthouse:report',
      isHeader: false,
      label: 'Lighthouse CI audit & summary',
      hint: 'lighthouse',
    }
  )

  // Testing & Mutation
  items.push({ isHeader: true, label: 'Testing & Mutation' })
  items.push(
    {
      isHeader: false,
      value: 'bun root test',
      label: 'Native Bun unit tests and coverage',
      hint: 'test',
    },
    {
      isHeader: false,
      value: 'bun root test:e2e',
      label: 'Playwright E2E browser tests',
      hint: 'test:e2e',
    },
    {
      isHeader: false,
      value: 'bun root test:a11y',
      label: 'Accessibility tests (Axe Core)',
      hint: 'test:a11y',
    },
    {
      isHeader: false,
      value: 'bun root test:mutation',
      label: 'Stryker mutation testing',
      hint: 'test:mutation',
    }
  )

  // Storybook & Documentation
  items.push({ isHeader: true, label: 'Storybook & Documentation' })
  items.push(
    {
      isHeader: false,
      value: 'bun root storybook',
      label: 'Storybook 10 development workbench',
      hint: 'storybook',
    },
    {
      isHeader: false,
      value: 'bun root build-storybook',
      label: 'Build Storybook static export',
      hint: 'build-storybook',
    },
    {
      isHeader: false,
      value: 'bun root visual',
      label: 'Storybook visual regression',
      hint: 'visual',
    },
    {
      isHeader: false,
      value: 'bun root docs:generate',
      label: 'Build TypeDoc documentation',
      hint: 'docs',
    }
  )

  // Build & Housekeeping
  items.push({ isHeader: true, label: 'Build & Housekeeping' })
  items.push(
    {
      isHeader: false,
      value: 'bun root build',
      label: 'Production build (all workspaces)',
      hint: 'build',
    },
    {
      isHeader: false,
      value: 'bun root clean',
      label: 'Clean build artifacts and cache',
      hint: 'clean',
    }
  )

  return items
}
