/**
 * Test Executor - handles parallel and sequential test execution
 */

import type {
  TestCase,
  RpcTestCase,
  RestTestCase,
  TestResult,
  TestContext,
  ProtocolType,
} from '../types.js'
import { executeRestTest, type RestExecutionOptions } from '../protocols/rest.js'
import { executeMcpTest, type McpExecutionOptions } from '../protocols/mcp.js'
import { executeRpcTest, type RpcExecutionOptions } from '../protocols/rpc.js'

export interface ExecutorOptions {
  baseUrl: string
  parallel?: boolean
  concurrency?: number
  timeout?: number
  retries?: number
  headers?: Record<string, string>
  onTestStart?: (test: TestCase) => void
  onTestComplete?: (result: TestResult) => void
}

/**
 * Determine the protocol type of a test
 */
export function getTestProtocol(test: TestCase): ProtocolType {
  if ('type' in test && test.type) {
    return test.type as ProtocolType
  }

  // Infer from test structure
  if ('request' in test) {
    return 'rest'
  }

  if ('method' in test) {
    return 'mcp'
  }

  return 'rest'
}

/**
 * Execute a single test with retries
 */
export async function executeTest(
  test: TestCase,
  options: ExecutorOptions,
  context?: TestContext
): Promise<TestResult> {
  const { baseUrl, timeout = 30000, retries = 0, headers } = options
  const protocol = getTestProtocol(test)

  let lastError: Error | undefined
  let result: TestResult | undefined

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      switch (protocol) {
        case 'rest': {
          const restOptions: RestExecutionOptions = { baseUrl, timeout, headers }
          result = await executeRestTest(test as RestTestCase, restOptions, context)
          break
        }

        case 'mcp': {
          const mcpOptions: McpExecutionOptions = { baseUrl, timeout, headers }
          result = await executeMcpTest(test as RpcTestCase, mcpOptions, context)
          break
        }

        case 'rpc': {
          const rpcOptions: RpcExecutionOptions = { baseUrl, timeout, headers }
          result = await executeRpcTest(test as RpcTestCase, rpcOptions, context)
          break
        }

        default:
          throw new Error(`Unknown protocol: ${protocol}`)
      }

      // If test passed or this was the last attempt, return
      if (result.status === 'passed' || attempt === retries) {
        return result
      }

      // Test failed but we have retries left
      lastError = new Error(`Test failed: ${result.assertions.filter((a) => !a.passed).map((a) => a.message).join(', ')}`)
    } catch (error) {
      lastError = error as Error

      if (attempt === retries) {
        return {
          id: test.id || test.name,
          name: test.name,
          status: 'failed',
          duration: 0,
          assertions: [],
          error: {
            message: lastError.message,
            stack: lastError.stack,
          },
          tags: test.tags,
        }
      }
    }
  }

  // This should not be reached, but TypeScript needs it
  return result!
}

/**
 * Execute tests sequentially
 */
export async function executeSequential(
  tests: TestCase[],
  options: ExecutorOptions,
  context?: TestContext
): Promise<TestResult[]> {
  const results: TestResult[] = []

  for (const test of tests) {
    if (test.skip) {
      results.push({
        id: test.id || test.name,
        name: test.name,
        status: 'skipped',
        duration: 0,
        assertions: [],
        tags: test.tags,
      })
      continue
    }

    options.onTestStart?.(test)
    const result = await executeTest(test, options, context)
    options.onTestComplete?.(result)
    results.push(result)
  }

  return results
}

/**
 * Execute tests in parallel with concurrency limit
 */
export async function executeParallel(
  tests: TestCase[],
  options: ExecutorOptions,
  context?: TestContext
): Promise<TestResult[]> {
  const { concurrency = 5 } = options
  const results: TestResult[] = new Array(tests.length)
  let currentIndex = 0

  async function worker(): Promise<void> {
    while (currentIndex < tests.length) {
      const index = currentIndex++
      const test = tests[index]!

      if (test.skip) {
        results[index] = {
          id: test.id || test.name,
          name: test.name,
          status: 'skipped',
          duration: 0,
          assertions: [],
          tags: test.tags,
        }
        continue
      }

      options.onTestStart?.(test)
      const result = await executeTest(test, options, context)
      options.onTestComplete?.(result)
      results[index] = result
    }
  }

  // Create worker pool
  const workers = Array(Math.min(concurrency, tests.length))
    .fill(null)
    .map(() => worker())

  await Promise.all(workers)

  return results
}

/**
 * Execute tests based on options
 */
export async function execute(
  tests: TestCase[],
  options: ExecutorOptions,
  context?: TestContext
): Promise<TestResult[]> {
  // Handle "only" tests
  const onlyTests = tests.filter((t) => t.only)
  const testsToRun = onlyTests.length > 0 ? onlyTests : tests

  if (options.parallel) {
    return executeParallel(testsToRun, options, context)
  }

  return executeSequential(testsToRun, options, context)
}
