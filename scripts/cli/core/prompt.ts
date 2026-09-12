/**
 * Shared interactive and non-interactive suggestion prompts.
 *
 * @packageDocumentation
 */

import type { RunnerIO } from './types'

export async function promptSuggestion(
  header: string,
  suggestedCmd: string,
  io: RunnerIO,
  onAccept: () => Promise<number>,
  options: { nonInteractiveLabel?: 'did-you-mean' | 'suggested-command' } = {}
): Promise<number> {
  const { stderr, isTTY = false, prompt } = io
  const label = isTTY
    ? 'Did you mean'
    : options.nonInteractiveLabel === 'did-you-mean'
      ? 'Did you mean'
      : 'Suggested command'

  if (isTTY && prompt) {
    stderr(`${header}

${label}:
  ${suggestedCmd}
`)
    const answer = await prompt('? [y/N] ')
    if (answer.toLowerCase() === 'y') {
      return onAccept()
    }
    return 1
  }

  stderr(`${header}

${label}:
  ${suggestedCmd}`)
  return 1
}
