/**
 * Playwright browser provisioning checks for doctor and E2E workflows.
 *
 * @packageDocumentation
 */

import { spawnSync } from 'node:child_process'
import type { E2eBrowser } from './workspace-capabilities'
import { e2eBrowsers } from './workspace-capabilities'

export function playwrightInstallCommand(workspaceDirName: string, browser?: string): string {
  const base = `bun ws ${workspaceDirName} test:e2e:install`
  return browser ? `${base} -- --with-deps ${browser}` : base
}

function detectMissingBrowsersScript(browsers: readonly E2eBrowser[]): string {
  return `
import { chromium, firefox, webkit } from "@playwright/test";
import fs from "node:fs";
const byName = { chromium, firefox, webkit };
const missing = [];
for (const name of ${JSON.stringify(browsers)}) {
  const launcher = byName[name];
  try {
    const executable = launcher.executablePath();
    if (!fs.existsSync(executable) || fs.statSync(executable).size === 0) {
      missing.push(name);
    }
  } catch {
    missing.push(name);
  }
}
console.log(JSON.stringify(missing));
`.trim()
}

export function missingPlaywrightBrowsers(
  workspacePath: string,
  browsers: readonly E2eBrowser[] = e2eBrowsers()
): string[] {
  const result = spawnSync('bun', ['-e', detectMissingBrowsersScript(browsers)], {
    cwd: workspacePath,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.status !== 0) {
    return [...browsers]
  }

  try {
    const parsed = JSON.parse(result.stdout.trim() || '[]') as string[]
    return parsed.filter((browser): browser is E2eBrowser =>
      (browsers as readonly string[]).includes(browser)
    )
  } catch {
    return [...browsers]
  }
}
