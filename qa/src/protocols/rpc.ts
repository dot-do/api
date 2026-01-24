/**
 * RPC (capnweb/rpc.do) protocol test execution
 * Supports HTTP, WebSocket, and Cloudflare binding transports
 */

import type {
  RpcTestCase,
  RpcExpectation,
  RpcBatchTest,
  RpcPipelineTest,
  TestResult,
  TestContext,
  AssertionResult,
  RpcMethod,
  RpcTransport,
} from '../types.js'
import { assert, matchWithPaths, match } from '../assertions/index.js'

export interface RpcExecutionOptions {
  baseUrl: string
  transport?: RpcTransport
  schema?: string
  timeout?: number
  headers?: Record<string, string>
}

interface RpcCall {
  path: string
  args: unknown[]
  id?: string | number
}

interface RpcBatchRequest {
  calls: RpcCall[]
}

interface RpcBatchResponse {
  results: Array<{
    id: string | number
    result?: unknown
    error?: { code: string; message: string }
  }>
}

/**
 * Execute an RPC test case
 */
export async function executeRpcTest(
  test: RpcTestCase,
  options: RpcExecutionOptions,
  context?: TestContext
): Promise<TestResult> {
  const startTime = Date.now()
  const assertions: AssertionResult[] = []

  const {
    baseUrl,
    timeout = 30000,
    headers: defaultHeaders = {},
  } = options

  const method = test.method || test.name

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...defaultHeaders,
    ...(context?.headers || {}),
  }

  if (context?.accessToken) {
    headers['Authorization'] = `Bearer ${context.accessToken}`
  }

  // RPC uses path-based method calling
  const url = new URL(baseUrl)
  url.pathname = `/${method.replace(/\./g, '/')}`

  const requestBody = Array.isArray(test.input) ? test.input : [test.input]

  let response: Response
  let responseBody: unknown

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    responseBody = await response.json()
  } catch (error) {
    const err = error as Error
    return {
      id: test.id || method,
      name: test.name,
      status: 'failed',
      duration: Date.now() - startTime,
      request: { method, url: url.toString(), body: requestBody },
      assertions: [],
      error: {
        message: err.message,
        stack: err.stack,
      },
      tags: test.tags,
    }
  }

  const expectation = test.expect as RpcExpectation

  // Check if response is an error
  const isError = response.status >= 400 || (
    typeof responseBody === 'object' &&
    responseBody !== null &&
    'error' in responseBody
  )

  if (expectation.status === 'success') {
    if (isError) {
      assertions.push({
        path: 'status',
        expected: 'success',
        actual: 'error',
        passed: false,
        message: `Expected success but got error: ${JSON.stringify(responseBody)}`,
      })
    } else {
      assertions.push({
        path: 'status',
        expected: 'success',
        actual: 'success',
        passed: true,
      })

      // Assert output
      if (expectation.output !== undefined) {
        if (typeof expectation.output === 'object' && expectation.output !== null) {
          const keys = Object.keys(expectation.output)
          const hasPathKeys = keys.some((k) => k.includes('.') || k.includes('['))

          if (hasPathKeys) {
            const outputResult = matchWithPaths(responseBody, expectation.output as Record<string, unknown>)
            assertions.push(...outputResult.assertions)
          } else {
            const outputResult = assert(responseBody, expectation.output, {
              mode: expectation.match || 'partial',
            })
            assertions.push(...outputResult.assertions)
          }
        } else {
          const matchResult = match(responseBody, expectation.output)
          assertions.push({
            path: 'output',
            expected: expectation.output,
            actual: responseBody,
            passed: matchResult.passed,
            message: matchResult.message,
          })
        }
      }
    }
  } else if (expectation.status === 'error') {
    if (!isError) {
      assertions.push({
        path: 'status',
        expected: 'error',
        actual: 'success',
        passed: false,
        message: 'Expected error but got success',
      })
    } else {
      assertions.push({
        path: 'status',
        expected: 'error',
        actual: 'error',
        passed: true,
      })

      // Assert error details
      if (expectation.error) {
        const errorBody = responseBody as { error?: { code?: string; message?: string } }
        const errorCode = errorBody.error?.code

        if (expectation.error.code !== undefined) {
          const codeMatches = errorCode === expectation.error.code
          assertions.push({
            path: 'error.code',
            expected: expectation.error.code,
            actual: errorCode,
            passed: codeMatches,
            message: codeMatches ? undefined : `Expected error code ${expectation.error.code} but got ${errorCode}`,
          })
        }

        if (expectation.error.message !== undefined) {
          const result = match(errorBody.error?.message, expectation.error.message)
          assertions.push({
            path: 'error.message',
            expected: expectation.error.message,
            actual: errorBody.error?.message,
            passed: result.passed,
            message: result.message,
          })
        }
      }
    }
  }

  const allPassed = assertions.every((a) => a.passed)

  return {
    id: test.id || method,
    name: test.name,
    status: allPassed ? 'passed' : 'failed',
    duration: Date.now() - startTime,
    request: { method, url: url.toString(), body: requestBody },
    response: { status: response.status, body: responseBody },
    assertions,
    tags: test.tags,
  }
}

/**
 * Execute a batch test
 */
export async function executeRpcBatchTest(
  test: RpcBatchTest,
  options: RpcExecutionOptions,
  context?: TestContext
): Promise<TestResult> {
  const startTime = Date.now()
  const assertions: AssertionResult[] = []

  const {
    baseUrl,
    timeout = 30000,
    headers: defaultHeaders = {},
  } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...defaultHeaders,
    ...(context?.headers || {}),
  }

  if (context?.accessToken) {
    headers['Authorization'] = `Bearer ${context.accessToken}`
  }

  const url = new URL('/__batch', baseUrl)

  const batchRequest: RpcBatchRequest = {
    calls: test.calls.map((call, i) => ({
      ...call,
      id: i,
    })),
  }

  let response: Response
  let batchResponse: RpcBatchResponse

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(batchRequest),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    batchResponse = await response.json() as RpcBatchResponse
  } catch (error) {
    const err = error as Error
    return {
      id: test.id || test.name,
      name: test.name,
      status: 'failed',
      duration: Date.now() - startTime,
      request: batchRequest,
      assertions: [],
      error: {
        message: err.message,
        stack: err.stack,
      },
      tags: test.tags,
    }
  }

  // Assert batch size
  if (test.expect.batchSize !== undefined) {
    const actualSize = batchResponse.results.length
    assertions.push({
      path: 'batchSize',
      expected: test.expect.batchSize,
      actual: actualSize,
      passed: actualSize === test.expect.batchSize,
      message: actualSize === test.expect.batchSize
        ? undefined
        : `Expected batch size ${test.expect.batchSize} but got ${actualSize}`,
    })
  }

  // Assert all success
  if (test.expect.allSuccess) {
    const allSuccess = batchResponse.results.every((r) => !r.error)
    assertions.push({
      path: 'allSuccess',
      expected: true,
      actual: allSuccess,
      passed: allSuccess,
      message: allSuccess ? undefined : 'Not all batch calls succeeded',
    })
  }

  // Assert individual results
  if (test.expect.results) {
    for (let i = 0; i < test.expect.results.length; i++) {
      const expected = test.expect.results[i]
      const actual = batchResponse.results[i]

      if (expected && actual) {
        const result = matchWithPaths(actual.result, expected)
        for (const assertion of result.assertions) {
          assertions.push({
            ...assertion,
            path: `results[${i}].${assertion.path}`,
          })
        }
      }
    }
  }

  const allPassed = assertions.every((a) => a.passed)

  return {
    id: test.id || test.name,
    name: test.name,
    status: allPassed ? 'passed' : 'failed',
    duration: Date.now() - startTime,
    request: batchRequest,
    response: batchResponse,
    assertions,
    tags: test.tags,
  }
}

/**
 * Execute a pipeline test
 */
export async function executeRpcPipelineTest(
  test: RpcPipelineTest,
  options: RpcExecutionOptions,
  context?: TestContext
): Promise<TestResult> {
  const startTime = Date.now()
  const assertions: AssertionResult[] = []

  const {
    baseUrl,
    timeout = 30000,
    headers: defaultHeaders = {},
  } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...defaultHeaders,
    ...(context?.headers || {}),
  }

  if (context?.accessToken) {
    headers['Authorization'] = `Bearer ${context.accessToken}`
  }

  const url = new URL('/__pipeline', baseUrl)

  const pipelineRequest = {
    pipeline: test.pipeline,
  }

  let response: Response
  let responseBody: unknown

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(pipelineRequest),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    responseBody = await response.json()
  } catch (error) {
    const err = error as Error
    return {
      id: test.id || test.name,
      name: test.name,
      status: 'failed',
      duration: Date.now() - startTime,
      request: pipelineRequest,
      assertions: [],
      error: {
        message: err.message,
        stack: err.stack,
      },
      tags: test.tags,
    }
  }

  // Assert output
  if (test.expect.output !== undefined) {
    if (typeof test.expect.output === 'object' && test.expect.output !== null) {
      const keys = Object.keys(test.expect.output)
      const hasPathKeys = keys.some((k) => k.includes('.') || k.includes('['))

      if (hasPathKeys) {
        const outputResult = matchWithPaths(responseBody, test.expect.output as Record<string, unknown>)
        assertions.push(...outputResult.assertions)
      } else {
        const outputResult = assert(responseBody, test.expect.output, {
          mode: test.expect.match || 'partial',
        })
        assertions.push(...outputResult.assertions)
      }
    } else {
      const matchResult = match(responseBody, test.expect.output)
      assertions.push({
        path: 'output',
        expected: test.expect.output,
        actual: responseBody,
        passed: matchResult.passed,
        message: matchResult.message,
      })
    }
  }

  const allPassed = assertions.every((a) => a.passed)

  return {
    id: test.id || test.name,
    name: test.name,
    status: allPassed ? 'passed' : 'failed',
    duration: Date.now() - startTime,
    request: pipelineRequest,
    response: responseBody,
    assertions,
    tags: test.tags,
  }
}

/**
 * Fetch RPC schema from discovery endpoint
 */
export async function fetchRpcSchema(
  options: RpcExecutionOptions,
  context?: TestContext
): Promise<{ methods: RpcMethod[] }> {
  const { baseUrl, schema = '/__schema', headers: defaultHeaders = {} } = options

  const url = new URL(schema, baseUrl)

  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(context?.headers || {}),
  }

  if (context?.accessToken) {
    headers['Authorization'] = `Bearer ${context.accessToken}`
  }

  const response = await fetch(url.toString(), { headers })
  return response.json() as Promise<{ methods: RpcMethod[] }>
}

/**
 * Extract tests from RPC methods
 */
export function extractRpcTests(methods: RpcMethod[]): RpcTestCase[] {
  const tests: RpcTestCase[] = []

  for (const method of methods) {
    if (method.tests) {
      for (const test of method.tests) {
        tests.push({
          ...test,
          id: test.id || `${method.path}.${test.name}`,
          method: method.path,
          type: 'rpc',
        })
      }
    }
  }

  return tests
}
