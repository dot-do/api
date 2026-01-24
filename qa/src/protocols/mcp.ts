/**
 * MCP (Model Context Protocol) JSON-RPC test execution
 */

import type {
  RpcTestCase,
  RpcExpectation,
  TestResult,
  TestContext,
  AssertionResult,
  McpTool,
} from '../types.js'
import { assert, matchWithPaths, match } from '../assertions/index.js'

export interface McpExecutionOptions {
  baseUrl: string
  endpoint?: string
  timeout?: number
  headers?: Record<string, string>
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: unknown
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

/**
 * Execute an MCP test case
 */
export async function executeMcpTest(
  test: RpcTestCase,
  options: McpExecutionOptions,
  context?: TestContext
): Promise<TestResult> {
  const startTime = Date.now()
  const assertions: AssertionResult[] = []

  const {
    baseUrl,
    endpoint = '/mcp',
    timeout = 30000,
    headers: defaultHeaders = {},
  } = options

  const url = new URL(endpoint, baseUrl)
  const method = test.method || test.name

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...defaultHeaders,
    ...(context?.headers || {}),
  }

  // Add auth header if context has token
  if (context?.accessToken) {
    headers['Authorization'] = `Bearer ${context.accessToken}`
  }

  const rpcRequest: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: `tools/call`,
    params: {
      name: method,
      arguments: test.input,
    },
  }

  let response: Response
  let rpcResponse: JsonRpcResponse

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(rpcRequest),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    rpcResponse = await response.json() as JsonRpcResponse
  } catch (error) {
    const err = error as Error
    return {
      id: test.id || method,
      name: test.name,
      status: 'failed',
      duration: Date.now() - startTime,
      request: rpcRequest,
      assertions: [],
      error: {
        message: err.message,
        stack: err.stack,
      },
      tags: test.tags,
    }
  }

  const expectation = test.expect as RpcExpectation

  // Assert status (success or error)
  if (expectation.status === 'success') {
    if (rpcResponse.error) {
      assertions.push({
        path: 'status',
        expected: 'success',
        actual: 'error',
        passed: false,
        message: `Expected success but got error: ${rpcResponse.error.message}`,
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
        const result = rpcResponse.result

        if (typeof expectation.output === 'object' && expectation.output !== null) {
          const keys = Object.keys(expectation.output)
          const hasPathKeys = keys.some((k) => k.includes('.') || k.includes('['))

          if (hasPathKeys) {
            const outputResult = matchWithPaths(result, expectation.output as Record<string, unknown>)
            assertions.push(...outputResult.assertions)
          } else {
            const outputResult = assert(result, expectation.output, {
              mode: expectation.match || 'partial',
            })
            assertions.push(...outputResult.assertions)
          }
        } else {
          const matchResult = match(result, expectation.output)
          assertions.push({
            path: 'output',
            expected: expectation.output,
            actual: result,
            passed: matchResult.passed,
            message: matchResult.message,
          })
        }
      }
    }
  } else if (expectation.status === 'error') {
    if (!rpcResponse.error) {
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
        if (expectation.error.code !== undefined) {
          let codeMatches = rpcResponse.error.code === expectation.error.code
          if (!codeMatches && typeof expectation.error.code === 'string' && rpcResponse.error.data) {
            const dataCode = (rpcResponse.error.data as { code?: string }).code
            codeMatches = dataCode === expectation.error.code
          }

          assertions.push({
            path: 'error.code',
            expected: expectation.error.code,
            actual: rpcResponse.error.code,
            passed: codeMatches,
            message: codeMatches ? undefined : `Expected error code ${expectation.error.code}`,
          })
        }

        if (expectation.error.message !== undefined) {
          const result = match(rpcResponse.error.message, expectation.error.message)
          assertions.push({
            path: 'error.message',
            expected: expectation.error.message,
            actual: rpcResponse.error.message,
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
    request: rpcRequest,
    response: rpcResponse,
    assertions,
    tags: test.tags,
  }
}

/**
 * Execute a direct MCP JSON-RPC method call (not tools/call)
 */
export async function executeMcpMethod(
  method: string,
  params: unknown,
  options: McpExecutionOptions,
  context?: TestContext
): Promise<JsonRpcResponse> {
  const {
    baseUrl,
    endpoint = '/mcp',
    timeout = 30000,
    headers: defaultHeaders = {},
  } = options

  const url = new URL(endpoint, baseUrl)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...defaultHeaders,
    ...(context?.headers || {}),
  }

  if (context?.accessToken) {
    headers['Authorization'] = `Bearer ${context.accessToken}`
  }

  const rpcRequest: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(rpcRequest),
    signal: controller.signal,
  })

  clearTimeout(timeoutId)

  return response.json() as Promise<JsonRpcResponse>
}

/**
 * List tools from an MCP server
 */
export async function listMcpTools(
  options: McpExecutionOptions,
  context?: TestContext
): Promise<McpTool[]> {
  const response = await executeMcpMethod('tools/list', {}, options, context)

  if (response.error) {
    throw new Error(`Failed to list tools: ${response.error.message}`)
  }

  const result = response.result as { tools?: McpTool[] }
  return result.tools || []
}

/**
 * Extract tests from MCP tools
 */
export function extractMcpTests(tools: McpTool[]): RpcTestCase[] {
  const tests: RpcTestCase[] = []

  for (const tool of tools) {
    if (tool.tests) {
      for (const test of tool.tests) {
        tests.push({
          ...test,
          id: test.id || `${tool.name}.${test.name}`,
          method: tool.name,
          type: 'mcp',
        })
      }
    }
  }

  return tests
}
