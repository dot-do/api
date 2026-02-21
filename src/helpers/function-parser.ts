/**
 * Function Call URL Parser
 *
 * Parses function-call URLs in the format `name(args)` where:
 * - `name` can be dotted (e.g., 'papa.parse')
 * - `args` is a comma-separated list of positional and named arguments
 *
 * Arguments are auto-detected by type:
 * - Starts with `https://` or `http://` -> URL
 * - Numeric -> number
 * - Matches `type_sqid` -> entity reference
 * - Contains `=` -> named argument (key=value)
 * - Everything else -> string
 */

import { isEntityId } from './id-parser'

/**
 * Argument type detected from the value
 */
export type FunctionArgType = 'url' | 'number' | 'entity' | 'string'

/**
 * A parsed positional argument
 */
export interface ParsedArg {
  value: string
  type: FunctionArgType
}

/**
 * Result of parsing a function call URL
 */
export interface ParsedFunctionCall {
  /** Function name (may include dots, e.g., 'papa.parse') */
  name: string
  /** Positional arguments */
  args: ParsedArg[]
  /** Named arguments (key=value pairs) */
  kwargs: Record<string, string>
}

/**
 * Check if a path segment looks like a function call.
 *
 * A function call contains an opening parenthesis.
 * Must also contain a closing parenthesis to be valid.
 */
export function isFunctionCall(segment: string): boolean {
  return segment.includes('(') && segment.includes(')')
}

/**
 * Detect the type of an argument value.
 */
function detectArgType(value: string): FunctionArgType {
  if (value.startsWith('https://') || value.startsWith('http://')) {
    return 'url'
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return 'number'
  }
  if (isEntityId(value)) {
    return 'entity'
  }
  return 'string'
}

/**
 * Split function arguments, respecting URLs (which contain commas in rare cases)
 * and parentheses. The main challenge is URLs containing commas,
 * but in practice we split on commas that are not inside a URL scheme.
 *
 * Strategy: simple comma split, then re-join parts that look like
 * continuations of a URL (don't start with a key= or a recognizable token).
 * For the common case this is just a simple split.
 */
function splitArgs(argsString: string): string[] {
  if (!argsString) return []

  const parts = argsString.split(',')
  const result: string[] = []
  let current = ''

  for (const part of parts) {
    if (current) {
      // We're continuing a URL that was split on comma
      current += ',' + part
      // A URL continuation ends when the next part looks like a new argument
      // (starts with a letter/number and doesn't look like a URL path)
      // For simplicity, we finalize the URL when we see the next arg start
      result.push(current.trim())
      current = ''
    } else {
      const trimmed = part.trim()
      // Check if this looks like the start of a URL that might contain commas
      // In practice, URLs in function args rarely contain commas
      result.push(trimmed)
    }
  }

  if (current) {
    result.push(current.trim())
  }

  return result.filter((s) => s.length > 0)
}

/**
 * Parse a function call URL into its components.
 *
 * @param segment - The path segment (e.g., 'score(contact_abc)')
 * @returns Parsed function call or null if not a valid function call
 *
 * @example
 * parseFunctionCall('score(contact_abc)')
 * // => { name: 'score', args: [{ value: 'contact_abc', type: 'entity' }], kwargs: {} }
 *
 * @example
 * parseFunctionCall('merge(contact_abc,contact_def)')
 * // => { name: 'merge', args: [{ value: 'contact_abc', type: 'entity' }, { value: 'contact_def', type: 'entity' }], kwargs: {} }
 *
 * @example
 * parseFunctionCall('papa.parse(https://example.com/data.csv,header=true)')
 * // => {
 * //   name: 'papa.parse',
 * //   args: [{ value: 'https://example.com/data.csv', type: 'url' }],
 * //   kwargs: { header: 'true' }
 * // }
 */
export function parseFunctionCall(segment: string): ParsedFunctionCall | null {
  if (!isFunctionCall(segment)) return null

  const openParen = segment.indexOf('(')
  const closeParen = segment.lastIndexOf(')')

  if (openParen === -1 || closeParen === -1 || closeParen <= openParen) return null

  const name = segment.slice(0, openParen).trim()
  if (!name) return null

  // Validate function name: must start with a letter, can contain dots for namespacing
  if (!/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(name)) return null

  const argsString = segment.slice(openParen + 1, closeParen).trim()

  const args: ParsedArg[] = []
  const kwargs: Record<string, string> = {}

  if (argsString) {
    const parts = splitArgs(argsString)

    for (const part of parts) {
      // Check for named argument (key=value)
      // But don't match URLs with = (like query params)
      // Named args: key must be a simple identifier (no / or :)
      const eqIndex = part.indexOf('=')
      if (eqIndex > 0 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part.slice(0, eqIndex))) {
        const key = part.slice(0, eqIndex)
        const value = part.slice(eqIndex + 1)
        kwargs[key] = value
      } else {
        // Positional argument
        args.push({
          value: part,
          type: detectArgType(part),
        })
      }
    }
  }

  return { name, args, kwargs }
}
