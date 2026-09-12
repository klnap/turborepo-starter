#!/usr/bin/env bun

/**
 * Developer Command Line Interface
 * Unified interactive task runner with section dividers and zero-flicker in-place rendering.
 *
 * @packageDocumentation
 */

import readline from 'node:readline'
import { ANSI } from '../../shared/ansi'
import { ROOT_DIR } from '../../shared/paths'
import type { CliItem } from '../core/types'
import { buildCliItems } from './registry'

function findNextSelectable(items: CliItem[], current: number, direction: 1 | -1): number {
  let next = current
  const total = items.length

  for (let i = 0; i < total; i++) {
    next = (next + direction + total) % total
    const item = items[next]
    if (item && !item.isHeader) {
      return next
    }
  }

  return current
}

function renderMenu(items: CliItem[], selectedIndex: number): string[] {
  const lines: string[] = []

  lines.push(`${ANSI.CYAN}┌${ANSI.RESET}  ${ANSI.BOLD}Control Center${ANSI.RESET}`)
  lines.push(`${ANSI.CYAN}│${ANSI.RESET}`)

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    if (item.isHeader) {
      lines.push(`${ANSI.CYAN}│${ANSI.RESET}`)
      lines.push(
        `${ANSI.CYAN}│${ANSI.RESET}  ${ANSI.BOLD}${ANSI.UNDERLINE}${item.label}${ANSI.RESET}`
      )
      continue
    }

    const isSelected = i === selectedIndex
    const dot = isSelected ? `${ANSI.CYAN}●${ANSI.RESET}` : `${ANSI.DIM}○${ANSI.RESET}`
    const label = isSelected ? `${ANSI.BOLD}${ANSI.CYAN}${item.label}${ANSI.RESET}` : item.label
    const hint = item.hint ? ` ${ANSI.DIM}(${item.hint})${ANSI.RESET}` : ''

    lines.push(`${ANSI.CYAN}│${ANSI.RESET}  ${dot} ${label}${hint}`)
  }

  lines.push(`${ANSI.CYAN}│${ANSI.RESET}`)
  lines.push(
    `${ANSI.CYAN}└${ANSI.RESET}  ${ANSI.DIM}↑/↓: navigate • Enter: run • Esc / Ctrl+C: exit${ANSI.RESET}`
  )

  return lines
}

function selectItem(items: CliItem[], initialIndex = 1): Promise<CliItem | null> {
  return new Promise((resolve) => {
    let index = initialIndex
    if (items[index]?.isHeader) {
      index = findNextSelectable(items, index, 1)
    }

    // Hide cursor during interactive selection
    process.stdout.write('\x1b[?25l')

    let lines = renderMenu(items, index)
    process.stdout.write(`${lines.join('\n')}\n`)
    let lastRenderCount = lines.length

    function redraw() {
      readline.moveCursor(process.stdout, 0, -lastRenderCount)
      process.stdout.write('\x1b[0J') // Clear from cursor down
      lines = renderMenu(items, index)
      process.stdout.write(`${lines.join('\n')}\n`)
      lastRenderCount = lines.length
    }

    function cleanup() {
      process.stdin.removeListener('keypress', onKeypress)
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
        process.stdin.pause()
      }
      process.stdout.write('\x1b[?25h') // Restore cursor
    }

    const onKeypress = (_str: string, key: readline.Key) => {
      if (!key) return

      if ((key.ctrl && key.name === 'c') || key.name === 'escape' || key.name === 'q') {
        cleanup()
        readline.moveCursor(process.stdout, 0, -lastRenderCount)
        process.stdout.write('\x1b[0J')
        resolve(null)
        return
      }

      if (key.name === 'up' || key.name === 'k') {
        index = findNextSelectable(items, index, -1)
        redraw()
      } else if (key.name === 'down' || key.name === 'j') {
        index = findNextSelectable(items, index, 1)
        redraw()
      } else if (key.name === 'return') {
        const item = items[index]
        if (item && !item.isHeader) {
          cleanup()
          readline.moveCursor(process.stdout, 0, -lastRenderCount)
          process.stdout.write('\x1b[0J')
          resolve(item)
        }
      }
    }

    if (!process.stdin.isTTY) {
      process.stdout.write('\x1b[?25h')
      resolve(null)
      return
    }

    readline.emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('keypress', onKeypress)
  })
}

function waitForAnyKey(): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(
      `\n${ANSI.DIM}Press Enter or Space to return to menu, or Esc to exit...${ANSI.RESET} `
    )

    if (!process.stdin.isTTY) {
      resolve(true)
      return
    }

    readline.emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()

    const onKeypress = (_str: string, key: readline.Key) => {
      process.stdin.removeListener('keypress', onKeypress)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdout.write('\n')

      if (key?.name === 'escape' || (key?.ctrl && key?.name === 'c') || key?.name === 'q') {
        resolve(false)
      } else {
        resolve(true)
      }
    }

    process.stdin.once('keypress', onKeypress)
  })
}

function parseRegistryCommand(command: string): { cmd: string; args: string[] } {
  const parts = command.trim().split(/\s+/).filter(Boolean)
  const cmd = parts[0]
  if (!cmd) {
    throw new Error('Empty command')
  }
  return { cmd, args: parts.slice(1) }
}

async function runTask(command: string): Promise<void> {
  console.log(
    `\n${ANSI.CYAN}┌${ANSI.RESET}  ${ANSI.BOLD}Running: ${ANSI.GREEN}${command}${ANSI.RESET}\n`
  )

  const { cmd, args } = parseRegistryCommand(command)
  const proc = Bun.spawn([cmd, ...args], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: process.env,
    cwd: ROOT_DIR,
  })

  const exitCode = await proc.exited
  console.log('')

  if (exitCode === 0) {
    console.log(
      `${ANSI.CYAN}└${ANSI.RESET}  ${ANSI.GREEN}${ANSI.BOLD}Task completed successfully.${ANSI.RESET}`
    )
  } else {
    console.log(
      `${ANSI.CYAN}└${ANSI.RESET}  ${ANSI.RED}${ANSI.BOLD}Task terminated with exit code ${exitCode}.${ANSI.RESET}`
    )
  }
}

async function main(): Promise<void> {
  let selectedIndex = 1

  while (true) {
    console.clear()
    const items = buildCliItems(ROOT_DIR)
    const selected = await selectItem(items, selectedIndex)

    if (!selected?.value) {
      console.log(`\n${ANSI.CYAN}└${ANSI.RESET}  ${ANSI.DIM}Goodbye!${ANSI.RESET}\n`)
      process.exit(0)
    }

    selectedIndex = items.indexOf(selected)
    await runTask(selected.value)

    const shouldContinue = await waitForAnyKey()
    if (!shouldContinue) {
      console.log(`\n${ANSI.CYAN}└${ANSI.RESET}  ${ANSI.DIM}Goodbye!${ANSI.RESET}\n`)
      process.exit(0)
    }
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
