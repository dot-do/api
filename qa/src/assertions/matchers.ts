/**
 * Built-in assertion matchers for api.qa
 */

import type {
  TypeMatcher,
  PatternMatcher,
  FormatMatcher,
  RangeMatcher,
  LengthMatcher,
  EnumMatcher,
  OptionalMatcher,
  Matcher,
} from '../types.js'

// =============================================================================
// Type Guards for Matchers
// =============================================================================

export function isTypeMatcher(value: unknown): value is TypeMatcher {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as TypeMatcher).type === 'string' &&
    ['string', 'number', 'boolean', 'object', 'array', 'null', 'undefined'].includes(
      (value as TypeMatcher).type
    )
  )
}

export function isPatternMatcher(value: unknown): value is PatternMatcher {
  return (
    typeof value === 'object' &&
    value !== null &&
    'pattern' in value &&
    typeof (value as PatternMatcher).pattern === 'string'
  )
}

export function isFormatMatcher(value: unknown): value is FormatMatcher {
  return (
    typeof value === 'object' &&
    value !== null &&
    'format' in value &&
    typeof (value as FormatMatcher).format === 'string'
  )
}

export function isRangeMatcher(value: unknown): value is RangeMatcher {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return 'gte' in v || 'gt' in v || 'lte' in v || 'lt' in v
}

export function isLengthMatcher(value: unknown): value is LengthMatcher {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return 'length' in v || 'minLength' in v || 'maxLength' in v
}

export function isEnumMatcher(value: unknown): value is EnumMatcher {
  return (
    typeof value === 'object' &&
    value !== null &&
    'oneOf' in value &&
    Array.isArray((value as EnumMatcher).oneOf)
  )
}

export function isOptionalMatcher(value: unknown): value is OptionalMatcher {
  return (
    typeof value === 'object' &&
    value !== null &&
    'optional' in value &&
    (value as OptionalMatcher).optional === true
  )
}

export function isMatcher(value: unknown): value is Matcher {
  return (
    isTypeMatcher(value) ||
    isPatternMatcher(value) ||
    isFormatMatcher(value) ||
    isRangeMatcher(value) ||
    isLengthMatcher(value) ||
    isEnumMatcher(value) ||
    isOptionalMatcher(value)
  )
}

// =============================================================================
// Format Validators
// =============================================================================

const FORMAT_VALIDATORS: Record<string, (value: string) => boolean> = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  'date-time': (v) => !isNaN(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}T/.test(v),
  date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)),
  time: (v) => /^\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(v),
  uri: (v) => {
    try {
      new URL(v)
      return true
    } catch {
      return false
    }
  },
  uuid: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
  ipv4: (v) => /^(\d{1,3}\.){3}\d{1,3}$/.test(v) && v.split('.').every((n) => parseInt(n) <= 255),
  ipv6: (v) => /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i.test(v),
  hostname: (v) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(v),
}

// =============================================================================
// Matcher Result
// =============================================================================

export interface MatchResult {
  passed: boolean
  message?: string
  expected?: unknown
  actual?: unknown
}

// =============================================================================
// Individual Matcher Functions
// =============================================================================

export function matchType(value: unknown, expected: TypeMatcher['type']): MatchResult {
  let actualType: string

  if (value === null) {
    actualType = 'null'
  } else if (Array.isArray(value)) {
    actualType = 'array'
  } else if (value === undefined) {
    actualType = 'undefined'
  } else {
    actualType = typeof value
  }

  const passed = actualType === expected
  return {
    passed,
    expected: `type ${expected}`,
    actual: `type ${actualType}`,
    message: passed ? undefined : `Expected type "${expected}" but got "${actualType}"`,
  }
}

export function matchPattern(value: unknown, pattern: string): MatchResult {
  if (typeof value !== 'string') {
    return {
      passed: false,
      expected: `string matching /${pattern}/`,
      actual: typeof value,
      message: `Cannot match pattern against non-string value of type "${typeof value}"`,
    }
  }

  const regex = new RegExp(pattern)
  const passed = regex.test(value)
  return {
    passed,
    expected: `string matching /${pattern}/`,
    actual: value,
    message: passed ? undefined : `String "${value}" does not match pattern /${pattern}/`,
  }
}

export function matchFormat(value: unknown, format: FormatMatcher['format']): MatchResult {
  if (typeof value !== 'string') {
    return {
      passed: false,
      expected: `string with format "${format}"`,
      actual: typeof value,
      message: `Cannot validate format against non-string value of type "${typeof value}"`,
    }
  }

  const validator = FORMAT_VALIDATORS[format]
  if (!validator) {
    return {
      passed: false,
      expected: `string with format "${format}"`,
      actual: value,
      message: `Unknown format "${format}"`,
    }
  }

  const passed = validator(value)
  return {
    passed,
    expected: `string with format "${format}"`,
    actual: value,
    message: passed ? undefined : `String "${value}" does not match format "${format}"`,
  }
}

export function matchRange(value: unknown, matcher: RangeMatcher): MatchResult {
  if (typeof value !== 'number') {
    return {
      passed: false,
      expected: 'number',
      actual: typeof value,
      message: `Cannot compare range against non-number value of type "${typeof value}"`,
    }
  }

  const checks: string[] = []
  let passed = true

  if (matcher.gte !== undefined && value < matcher.gte) {
    passed = false
    checks.push(`>= ${matcher.gte}`)
  }
  if (matcher.gt !== undefined && value <= matcher.gt) {
    passed = false
    checks.push(`> ${matcher.gt}`)
  }
  if (matcher.lte !== undefined && value > matcher.lte) {
    passed = false
    checks.push(`<= ${matcher.lte}`)
  }
  if (matcher.lt !== undefined && value >= matcher.lt) {
    passed = false
    checks.push(`< ${matcher.lt}`)
  }

  const expected = Object.entries(matcher)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  return {
    passed,
    expected: `number ${expected}`,
    actual: value,
    message: passed ? undefined : `Number ${value} failed range check: ${checks.join(', ')}`,
  }
}

export function matchLength(value: unknown, matcher: LengthMatcher): MatchResult {
  let length: number

  if (typeof value === 'string' || Array.isArray(value)) {
    length = value.length
  } else {
    return {
      passed: false,
      expected: 'string or array',
      actual: typeof value,
      message: `Cannot check length of non-string/array value of type "${typeof value}"`,
    }
  }

  const checks: string[] = []
  let passed = true

  if (matcher.length !== undefined && length !== matcher.length) {
    passed = false
    checks.push(`length === ${matcher.length}`)
  }
  if (matcher.minLength !== undefined && length < matcher.minLength) {
    passed = false
    checks.push(`length >= ${matcher.minLength}`)
  }
  if (matcher.maxLength !== undefined && length > matcher.maxLength) {
    passed = false
    checks.push(`length <= ${matcher.maxLength}`)
  }

  const expected = Object.entries(matcher)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  return {
    passed,
    expected,
    actual: `length ${length}`,
    message: passed ? undefined : `Length ${length} failed check: ${checks.join(', ')}`,
  }
}

export function matchEnum(value: unknown, options: unknown[]): MatchResult {
  const passed = options.some((opt) => deepEqual(value, opt))
  return {
    passed,
    expected: `one of [${options.map((o) => JSON.stringify(o)).join(', ')}]`,
    actual: JSON.stringify(value),
    message: passed ? undefined : `Value ${JSON.stringify(value)} is not one of the allowed values`,
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false

  if (typeof a === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, i) => deepEqual(item, b[i]))
    }

    if (Array.isArray(a) || Array.isArray(b)) return false

    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj)
    const bKeys = Object.keys(bObj)

    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]))
  }

  return false
}

// =============================================================================
// Main Matcher Function
// =============================================================================

export function match(value: unknown, expected: unknown): MatchResult {
  // Handle literal value comparison
  if (!isMatcher(expected)) {
    const passed = deepEqual(value, expected)
    return {
      passed,
      expected: JSON.stringify(expected),
      actual: JSON.stringify(value),
      message: passed ? undefined : `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}`,
    }
  }

  // Handle optional values
  if (isOptionalMatcher(expected)) {
    if (value === undefined || value === null) {
      return { passed: true }
    }
    // If value exists, continue with other matchers in the object
    const otherMatchers = { ...expected } as Record<string, unknown>
    delete otherMatchers.optional
    if (Object.keys(otherMatchers).length === 0) {
      return { passed: true }
    }
    return match(value, otherMatchers)
  }

  // Handle type matcher (may be combined with others)
  if (isTypeMatcher(expected)) {
    const typeResult = matchType(value, expected.type)
    if (!typeResult.passed) return typeResult
  }

  // Handle pattern matcher
  if (isPatternMatcher(expected)) {
    const patternResult = matchPattern(value, expected.pattern)
    if (!patternResult.passed) return patternResult
  }

  // Handle format matcher
  if (isFormatMatcher(expected)) {
    const formatResult = matchFormat(value, expected.format)
    if (!formatResult.passed) return formatResult
  }

  // Handle range matcher
  if (isRangeMatcher(expected)) {
    const rangeResult = matchRange(value, expected)
    if (!rangeResult.passed) return rangeResult
  }

  // Handle length matcher
  if (isLengthMatcher(expected)) {
    const lengthResult = matchLength(value, expected)
    if (!lengthResult.passed) return lengthResult
  }

  // Handle enum matcher
  if (isEnumMatcher(expected)) {
    const enumResult = matchEnum(value, expected.oneOf)
    if (!enumResult.passed) return enumResult
  }

  return { passed: true }
}
