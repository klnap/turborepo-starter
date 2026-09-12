/**
 * Interactive tooling picker for `bun root adopt`.
 *
 * @packageDocumentation
 */

import readline from 'node:readline'
import { ANSI } from '../../shared/ansi'
import type { RunnerIO } from '../core/types'
import type { AdoptFlags } from './adopt'

export type AdoptToolingId = 'visual' | 'storybook' | 'e2e' | 'lighthouse'

export interface AdoptToolingOption {
  id: AdoptToolingId
  label: string
  hint: string
  /** False for workspace types that do not support this tooling (e.g. packages). */
  available: boolean
  /** Script or config already present — shown but not selectable. */
  alreadyConfigured: boolean
}

export interface AdoptToolingPickResult {
  flags: Pick<AdoptFlags, AdoptToolingId>
  cancelled: boolean
}

function isSelectable(option: AdoptToolingOption): boolean {
  return option.available && !option.alreadyConfigured
}

function flagsFromSelection(
  options: AdoptToolingOption[],
  checked: Set<AdoptToolingId>
): Pick<AdoptFlags, AdoptToolingId> {
  const flags: Pick<AdoptFlags, AdoptToolingId> = {}
  for (const option of options) {
    if (checked.has(option.id)) {
      flags[option.id] = true
    }
  }
  return flags
}

function renderMenu(
  workspacePath: string,
  options: AdoptToolingOption[],
  checked: Set<AdoptToolingId>,
  cursor: number
): string[] {
  const lines: string[] = []

  lines.push(`${ANSI.CYAN}┌${ANSI.RESET}  ${ANSI.BOLD}Adopt workspace tooling${ANSI.RESET}`)
  lines.push(`${ANSI.CYAN}│${ANSI.RESET}  ${ANSI.DIM}${workspacePath}${ANSI.RESET}`)
  lines.push(`${ANSI.CYAN}│${ANSI.RESET}`)
  lines.push(
    `${ANSI.CYAN}│${ANSI.RESET}  ${ANSI.DIM}Always applied: turbo.json, engines, AGENTS.md / specs${ANSI.RESET}`
  )
  lines.push(`${ANSI.CYAN}│${ANSI.RESET}`)

  for (let i = 0; i < options.length; i++) {
    const option = options[i]!
    const isCursor = i === cursor
    const selectable = isSelectable(option)
    const isChecked = checked.has(option.id)
    const box = !selectable
      ? `${ANSI.DIM}−${ANSI.RESET}`
      : isChecked
        ? `${ANSI.GREEN}✓${ANSI.RESET}`
        : `${ANSI.DIM}○${ANSI.RESET}`
    const pointer = isCursor ? `${ANSI.CYAN}›${ANSI.RESET}` : ' '
    const labelStyle =
      !option.available || option.alreadyConfigured
        ? `${ANSI.DIM}${option.label}${ANSI.RESET}`
        : isCursor
          ? `${ANSI.BOLD}${ANSI.CYAN}${option.label}${ANSI.RESET}`
          : option.label
    const status = option.alreadyConfigured
      ? ` ${ANSI.DIM}(already configured)${ANSI.RESET}`
      : !option.available
        ? ` ${ANSI.DIM}(apps only)${ANSI.RESET}`
        : ''
    const hint = option.hint ? ` ${ANSI.DIM}— ${option.hint}${ANSI.RESET}` : ''

    lines.push(`${ANSI.CYAN}│${ANSI.RESET} ${pointer} ${box} ${labelStyle}${hint}${status}`)
  }

  lines.push(`${ANSI.CYAN}│${ANSI.RESET}`)
  lines.push(
    `${ANSI.CYAN}└${ANSI.RESET}  ${ANSI.DIM}↑/↓: move • Space: toggle • Enter: apply • Esc: cancel${ANSI.RESET}`
  )

  return lines
}

function firstSelectableIndex(options: AdoptToolingOption[]): number {
  const index = options.findIndex(isSelectable)
  return index === -1 ? 0 : index
}

function nextSelectableIndex(
  options: AdoptToolingOption[],
  current: number,
  direction: 1 | -1
): number {
  const total = options.length
  let next = current
  for (let i = 0; i < total; i++) {
    next = (next + direction + total) % total
    if (isSelectable(options[next]!)) {
      return next
    }
  }
  return current
}

/**
 * Multi-select picker for optional adopt tooling. Returns cancelled when user presses Esc.
 */
export async function promptAdoptTooling(
  workspacePath: string,
  options: AdoptToolingOption[],
  io: RunnerIO = {
    stdout: (msg) => console.log(msg),
    stderr: (msg) => console.error(msg),
    isTTY: process.stdin.isTTY,
  }
): Promise<AdoptToolingPickResult> {
  const selectable = options.filter(isSelectable)
  if (!io.isTTY || selectable.length === 0) {
    return { flags: {}, cancelled: false }
  }

  return new Promise((resolve) => {
    let cursor = firstSelectableIndex(options)
    const checked = new Set<AdoptToolingId>()

    process.stdout.write('\x1b[?25l')
    let lines = renderMenu(workspacePath, options, checked, cursor)
    process.stdout.write(`${lines.join('\n')}\n`)
    let lastRenderCount = lines.length

    function redraw() {
      readline.moveCursor(process.stdout, 0, -lastRenderCount)
      process.stdout.write('\x1b[0J')
      lines = renderMenu(workspacePath, options, checked, cursor)
      process.stdout.write(`${lines.join('\n')}\n`)
      lastRenderCount = lines.length
    }

    function cleanup() {
      process.stdin.removeListener('keypress', onKeypress)
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
        process.stdin.pause()
      }
      process.stdout.write('\x1b[?25h')
    }

    const onKeypress = (_str: string, key: readline.Key) => {
      if (!key) return

      if ((key.ctrl && key.name === 'c') || key.name === 'escape') {
        cleanup()
        readline.moveCursor(process.stdout, 0, -lastRenderCount)
        process.stdout.write('\x1b[0J')
        resolve({ flags: {}, cancelled: true })
        return
      }

      if (key.name === 'up' || key.name === 'k') {
        cursor = nextSelectableIndex(options, cursor, -1)
        redraw()
        return
      }

      if (key.name === 'down' || key.name === 'j') {
        cursor = nextSelectableIndex(options, cursor, 1)
        redraw()
        return
      }

      if (key.name === 'space') {
        const option = options[cursor]
        if (option && isSelectable(option)) {
          if (checked.has(option.id)) {
            checked.delete(option.id)
          } else {
            checked.add(option.id)
          }
          redraw()
        }
        return
      }

      if (key.name === 'return') {
        cleanup()
        readline.moveCursor(process.stdout, 0, -lastRenderCount)
        process.stdout.write('\x1b[0J')
        resolve({ flags: flagsFromSelection(options, checked), cancelled: false })
      }
    }

    readline.emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('keypress', onKeypress)
  })
}
