/**
 * Assertions module - main entry point
 */

export {
  match,
  matchType,
  matchPattern,
  matchFormat,
  matchRange,
  matchLength,
  matchEnum,
  deepEqual,
  isMatcher,
  isTypeMatcher,
  isPatternMatcher,
  isFormatMatcher,
  isRangeMatcher,
  isLengthMatcher,
  isEnumMatcher,
  isOptionalMatcher,
  isLiteralMatcher,
  type MatchResult,
} from './matchers.js'

export {
  matchPartial,
  matchExact,
  matchWithPaths,
  assertMatch,
  type PartialMatchResult,
} from './partial.js'

export {
  getValueByPath,
  setValueByPath,
  hasPath,
  parsePath,
} from './jsonpath.js'

export {
  validateSchema,
  matchSchema,
  inferSchema,
  type SchemaValidationResult,
} from './schema.js'

import type { AssertionResult, MatchMode, ExpectBody, JSONSchema } from '../types.js'
import { matchPartial, matchExact, matchWithPaths } from './partial.js'
import { matchSchema } from './schema.js'

export interface AssertOptions {
  mode?: MatchMode
  useJsonPath?: boolean
}

/**
 * Main assertion function that handles all matching modes
 */
export function assert(
  actual: unknown,
  expected: unknown,
  options: AssertOptions = {}
): { passed: boolean; assertions: AssertionResult[] } {
  const { mode = 'partial', useJsonPath = false } = options

  // If mode is schema, validate against JSON Schema
  if (mode === 'schema') {
    return matchSchema(actual, expected as JSONSchema)
  }

  // If useJsonPath is true, use path-based matching
  if (useJsonPath && typeof expected === 'object' && expected !== null) {
    return matchWithPaths(actual, expected as ExpectBody)
  }

  // Use standard matching based on mode
  if (mode === 'exact') {
    return matchExact(actual, expected)
  }

  return matchPartial(actual, expected)
}
