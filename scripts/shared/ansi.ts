/**
 * Shared ANSI terminal formatting constants and escape codes.
 *
 * @packageDocumentation
 */

export const ANSI = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERLINE: '\x1b[4m',
  CYAN: '\x1b[36m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  MAGENTA: '\x1b[35m',
  BLUE: '\x1b[34m',
} as const

export function colorize(text: string, color: keyof typeof ANSI): string {
  return `${ANSI[color]}${text}${ANSI.RESET}`
}
