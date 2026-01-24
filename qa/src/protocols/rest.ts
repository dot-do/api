/**
 * REST/CRUD protocol test execution
 */

import type {
  RestTestCase,
  RestExpectation,
  TestResult,
  TestContext,
  AssertionResult,
} from '../types.js'
import { assert, matchWithPaths, match } from '../assertions/index.js'

export interface RestExecutionOptions {
  baseUrl: string
  timeout?: number
  headers?: Record<string, string>
}

/**
 * Execute a REST test case
 */
export async function executeRestTest(
  test: RestTestCase,
  options: RestExecutionOptions,
  context?: TestContext
): Promise<TestResult> {
  const startTime = Date.now()
  const assertions: AssertionResult[] = []

  const { baseUrl, timeout = 30000, headers: defaultHeaders = {} } = options

  const request = test.request
  const method = request.method || 'GET'
  const path = request.path || '/'
  const url = new URL(path, baseUrl)

  // Add query parameters
  if (request.query) {
    for (const [key, value] of Object.entries(request.query)) {
      url.searchParams.set(key, value)
    }
  }

  // Build headers
  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(context?.headers || {}),
    ...(request.headers || {}),
  }

  // Add auth header if context has token
  if (context?.accessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${context.accessToken}`
  }

  // Add content-type for requests with body
  if (request.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  let response: Response
  let responseBody: unknown

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    response = await fetch(url.toString(), {
      method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Parse response body
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      responseBody = await response.json()
    } else {
      responseBody = await response.text()
    }
  } catch (error) {
    const err = error as Error
    return {
      id: test.id || `${method}-${path}`,
      name: test.name,
      status: 'failed',
      duration: Date.now() - startTime,
      request: { method, url: url.toString(), headers, body: request.body },
      assertions: [],
      error: {
        message: err.message,
        stack: err.stack,
      },
      tags: test.tags,
    }
  }

  // Assert status code
  const expectation = test.expect as RestExpectation
  const statusAssertion = assertStatus(response.status, expectation.status)
  assertions.push(statusAssertion)

  // Assert headers
  if (expectation.headers) {
    for (const [key, expectedValue] of Object.entries(expectation.headers)) {
      const actualValue = response.headers.get(key)
      const result = match(actualValue, expectedValue)
      assertions.push({
        path: `headers.${key}`,
        expected: expectedValue,
        actual: actualValue,
        passed: result.passed,
        message: result.message,
      })
    }
  }

  // Assert body
  if (expectation.body !== undefined) {
    if (typeof expectation.body === 'object' && expectation.body !== null) {
      // Check if keys look like JSONPath expressions
      const keys = Object.keys(expectation.body)
      const hasPathKeys = keys.some((k) => k.includes('.') || k.includes('['))

      if (hasPathKeys) {
        const bodyResult = matchWithPaths(responseBody, expectation.body as Record<string, unknown>)
        assertions.push(...bodyResult.assertions)
      } else {
        const bodyResult = assert(responseBody, expectation.body, {
          mode: expectation.match || 'partial',
        })
        assertions.push(...bodyResult.assertions)
      }
    } else {
      const result = match(responseBody, expectation.body)
      assertions.push({
        path: 'body',
        expected: expectation.body,
        actual: responseBody,
        passed: result.passed,
        message: result.message,
      })
    }
  }

  const allPassed = assertions.every((a) => a.passed)

  return {
    id: test.id || `${method}-${path}`,
    name: test.name,
    status: allPassed ? 'passed' : 'failed',
    duration: Date.now() - startTime,
    request: { method, url: url.toString(), headers, body: request.body },
    response: { status: response.status, body: responseBody },
    assertions,
    tags: test.tags,
  }
}

function assertStatus(actual: number, expected: number | { gte?: number; lte?: number; gt?: number; lt?: number }): AssertionResult {
  if (typeof expected === 'number') {
    return {
      path: 'status',
      expected,
      actual,
      passed: actual === expected,
      message: actual === expected ? undefined : `Expected status ${expected} but got ${actual}`,
    }
  }

  // Range matcher
  let passed = true
  const checks: string[] = []

  if (expected.gte !== undefined && actual < expected.gte) {
    passed = false
    checks.push(`>= ${expected.gte}`)
  }
  if (expected.gt !== undefined && actual <= expected.gt) {
    passed = false
    checks.push(`> ${expected.gt}`)
  }
  if (expected.lte !== undefined && actual > expected.lte) {
    passed = false
    checks.push(`<= ${expected.lte}`)
  }
  if (expected.lt !== undefined && actual >= expected.lt) {
    passed = false
    checks.push(`< ${expected.lt}`)
  }

  return {
    path: 'status',
    expected,
    actual,
    passed,
    message: passed ? undefined : `Status ${actual} failed: ${checks.join(', ')}`,
  }
}

/**
 * Create a REST test suite from endpoint definitions
 */
export function createRestTestSuite(
  endpoints: Array<{
    path: string
    method: string
    tests?: RestTestCase[]
  }>
): RestTestCase[] {
  const tests: RestTestCase[] = []

  for (const endpoint of endpoints) {
    if (endpoint.tests) {
      for (const test of endpoint.tests) {
        tests.push({
          ...test,
          id: test.id || `${endpoint.method}-${endpoint.path}-${test.name}`,
          request: {
            ...test.request,
            method: test.request?.method || endpoint.method,
            path: test.request?.path || endpoint.path,
          },
        })
      }
    }
  }

  return tests
}
