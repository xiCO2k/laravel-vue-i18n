import { getPluralIndex } from './utils/get-plural-index'

/**
 * Select a proper translation string based on the given number.
 */
export function choose(message: string, number: number, lang: string): string {
  let segments = message.split('|')
  const extracted = extract(segments, number)

  if (extracted !== null) {
    return extracted.trim()
  }

  segments = stripConditions(segments)
  const pluralIndex = getPluralIndex(lang, number)

  if (segments.length === 1 || !segments[pluralIndex]) {
    return segments[0]
  }

  return segments[pluralIndex]
}

/**
 * Extract a translation string using inline conditions.
 */
function extract(segments: string[], number: number): string | null {
  for (const part of segments) {
    let line = extractFromString(part, number)

    if (line !== null) {
      return line
    }
  }

  return null
}

/**
 * Get the translation string if the condition matches.
 */
function extractFromString(part: string, number: number): string | null {
  const matches = part.match(/^[\{\[]([^\[\]\{\}]*)[\}\]](.*)/s) || []
  if (matches.length !== 3) {
    return null
  }

  const condition = matches[1]
  const value = matches[2]

  if (condition.includes(',')) {
    let [from, to] = condition.split(',')

    if (to === '*' && number >= parseFloat(from)) {
      return value
    } else if (from === '*' && number <= parseFloat(to)) {
      return value
    } else if (number >= parseFloat(from) && number <= parseFloat(to)) {
      return value
    }
  }

  return parseFloat(condition) === number ? value : null
}

/**
 * Strip the inline conditions from each segment, just leaving the text.
 */
function stripConditions(segments: string[]): string[] {
  return segments.map((part) => part.replace(/^[\{\[]([^\[\]\{\}]*)[\}\]]/, ''))
}
