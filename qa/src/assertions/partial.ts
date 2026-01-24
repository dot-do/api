/**
 * Partial object matching - check if actual object contains expected subset
 */

import type { AssertionResult, ExpectBody, MatchMode } from '../types.js'
import { match, deepEqual, isMatcher } from './matchers.js'
import { getValueByPath } from './jsonpath.js'

export interface PartialMatchResult {
  passed: boolean
  assertions: AssertionResult[]
}

/**
 * Check if actual object partially matches expected object
 * For partial matching, expected can have fewer keys than actual
 */
export function matchPartial(
  actual: unknown,
  expected: unknown,
  path: string = ''
): PartialMatchResult {
  const assertions: AssertionResult[] = []

  // If expected is a matcher, use the match function
  if (isMatcher(expected)) {
    const result = match(actual, expected)
    assertions.push({
      path: path || '.',
      expected,
      actual,
      passed: result.passed,
      message: result.message,
    })
    return { passed: result.passed, assertions }
  }

  // Handle null
  if (expected === null) {
    const passed = actual === null
    assertions.push({
      path: path || '.',
      expected: null,
      actual,
      passed,
      message: passed ? undefined : `Expected null but got ${JSON.stringify(actual)}`,
    })
    return { passed, assertions }
  }

  // Handle primitive values (non-object, non-null)
  if (typeof expected !== 'object') {
    const passed = deepEqual(actual, expected)
    assertions.push({
      path: path || '.',
      expected,
      actual,
      passed,
      message: passed ? undefined : `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
    })
    return { passed, assertions }
  }

  // At this point, expected is a non-null object (could be array or plain object)
  const expectedObj = expected as object

  // Handle arrays
  if (Array.isArray(expectedObj)) {
    if (!Array.isArray(actual)) {
      assertions.push({
        path: path || '.',
        expected: 'array',
        actual: typeof actual,
        passed: false,
        message: `Expected array but got ${typeof actual}`,
      })
      return { passed: false, assertions }
    }

    // For arrays, check that each expected item matches corresponding actual item
    let allPassed = true
    const expectedArr = expectedObj
    for (let i = 0; i < expectedArr.length; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`
      const result = matchPartial(actual[i], expectedArr[i], itemPath)
      assertions.push(...result.assertions)
      if (!result.passed) allPassed = false
    }

    return { passed: allPassed, assertions }
  }

  // Handle plain objects
  if (typeof actual !== 'object' || actual === null) {
    assertions.push({
      path: path || '.',
      expected: 'object',
      actual: actual === null ? 'null' : typeof actual,
      passed: false,
      message: `Expected object but got ${actual === null ? 'null' : typeof actual}`,
    })
    return { passed: false, assertions }
  }

  const expectedRecord = expectedObj as Record<string, unknown>
  const actualObj = actual as Record<string, unknown>
  let allPassed = true

  for (const key of Object.keys(expectedRecord)) {
    const keyPath = path ? `${path}.${key}` : key
    const result = matchPartial(actualObj[key], expectedRecord[key], keyPath)
    assertions.push(...result.assertions)
    if (!result.passed) allPassed = false
  }

  return { passed: allPassed, assertions }
}

/**
 * Check if actual object exactly matches expected object
 * For exact matching, both objects must have the same keys
 */
export function matchExact(
  actual: unknown,
  expected: unknown,
  path: string = ''
): PartialMatchResult {
  const assertions: AssertionResult[] = []

  // If expected is a matcher, use the match function
  if (isMatcher(expected)) {
    const result = match(actual, expected)
    assertions.push({
      path: path || '.',
      expected,
      actual,
      passed: result.passed,
      message: result.message,
    })
    return { passed: result.passed, assertions }
  }

  // Handle null
  if (expected === null) {
    const passed = actual === null
    assertions.push({
      path: path || '.',
      expected: null,
      actual,
      passed,
      message: passed ? undefined : `Expected null but got ${JSON.stringify(actual)}`,
    })
    return { passed, assertions }
  }

  // Handle primitive values
  if (typeof expected !== 'object') {
    const passed = deepEqual(actual, expected)
    assertions.push({
      path: path || '.',
      expected,
      actual,
      passed,
      message: passed ? undefined : `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
    })
    return { passed, assertions }
  }

  // At this point, expected is a non-null object
  const expectedObj = expected as object

  // Handle arrays
  if (Array.isArray(expectedObj)) {
    if (!Array.isArray(actual)) {
      assertions.push({
        path: path || '.',
        expected: 'array',
        actual: typeof actual,
        passed: false,
        message: `Expected array but got ${typeof actual}`,
      })
      return { passed: false, assertions }
    }

    const expectedArr = expectedObj
    if (expectedArr.length !== actual.length) {
      assertions.push({
        path: path || '.',
        expected: `array of length ${expectedArr.length}`,
        actual: `array of length ${actual.length}`,
        passed: false,
        message: `Expected array of length ${expectedArr.length} but got ${actual.length}`,
      })
      return { passed: false, assertions }
    }

    let allPassed = true
    for (let i = 0; i < expectedArr.length; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`
      const result = matchExact(actual[i], expectedArr[i], itemPath)
      assertions.push(...result.assertions)
      if (!result.passed) allPassed = false
    }

    return { passed: allPassed, assertions }
  }

  // Handle plain objects
  if (typeof actual !== 'object' || actual === null) {
    assertions.push({
      path: path || '.',
      expected: 'object',
      actual: actual === null ? 'null' : typeof actual,
      passed: false,
      message: `Expected object but got ${actual === null ? 'null' : typeof actual}`,
    })
    return { passed: false, assertions }
  }

  const expectedRecord = expectedObj as Record<string, unknown>
  const actualRecord = actual as Record<string, unknown>
  const expectedKeys = Object.keys(expectedRecord).sort()
  const actualKeys = Object.keys(actualRecord).sort()

  // Check for extra or missing keys
  const missingKeys = expectedKeys.filter((k) => !actualKeys.includes(k))
  const extraKeys = actualKeys.filter((k) => !expectedKeys.includes(k))

  if (missingKeys.length > 0 || extraKeys.length > 0) {
    assertions.push({
      path: path || '.',
      expected: `object with keys [${expectedKeys.join(', ')}]`,
      actual: `object with keys [${actualKeys.join(', ')}]`,
      passed: false,
      message: [
        missingKeys.length > 0 ? `Missing keys: ${missingKeys.join(', ')}` : null,
        extraKeys.length > 0 ? `Extra keys: ${extraKeys.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('. '),
    })
    return { passed: false, assertions }
  }

  let allPassed = true
  for (const key of expectedKeys) {
    const keyPath = path ? `${path}.${key}` : key
    const result = matchExact(actualRecord[key], expectedRecord[key], keyPath)
    assertions.push(...result.assertions)
    if (!result.passed) allPassed = false
  }

  return { passed: allPassed, assertions }
}

/**
 * Match an object using JSONPath expressions
 * Keys in expected are JSONPath expressions
 */
export function matchWithPaths(
  actual: unknown,
  expected: ExpectBody
): PartialMatchResult {
  const assertions: AssertionResult[] = []
  let allPassed = true

  for (const [path, expectedValue] of Object.entries(expected)) {
    const actualValue = getValueByPath(actual, path)
    const result = match(actualValue, expectedValue)

    assertions.push({
      path,
      expected: expectedValue,
      actual: actualValue,
      passed: result.passed,
      message: result.message,
    })

    if (!result.passed) allPassed = false
  }

  return { passed: allPassed, assertions }
}

/**
 * Main matching function that handles all match modes
 */
export function assertMatch(
  actual: unknown,
  expected: unknown,
  mode: MatchMode = 'partial'
): PartialMatchResult {
  switch (mode) {
    case 'exact':
      return matchExact(actual, expected)
    case 'partial':
      return matchPartial(actual, expected)
    case 'schema':
      // Schema matching is handled separately by the schema module
      // This is a fallback that does partial matching
      return matchPartial(actual, expected)
    default:
      return matchPartial(actual, expected)
  }
}
