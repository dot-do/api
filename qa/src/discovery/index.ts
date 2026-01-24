/**
 * Unified Discovery Client
 * Discovers tests from MCP, RPC, REST/OpenAPI, and custom /qa endpoints
 */

import type {
  TestCase,
  RpcTestCase,
  RestTestCase,
  McpOAuthTest,
  RpcBatchTest,
  RpcPipelineTest,
  ProtocolType,
  TestListResponse,
} from '../types.js'
import { discoverMcpTests, listTools } from './mcp.js'
import { discoverRpcTests, fetchSchema } from './rpc.js'
import { discoverOpenApiTests } from './openapi.js'

export * from './mcp.js'
export * from './rpc.js'
export * from './openapi.js'

export interface DiscoveryOptions {
  baseUrl: string
  timeout?: number
  headers?: Record<string, string>
  accessToken?: string
  protocols?: ProtocolType[]
}

export interface DiscoveryResult {
  mcp?: {
    tools: Awaited<ReturnType<typeof listTools>>
    tests: RpcTestCase[]
  }
  rpc?: {
    schema: Awaited<ReturnType<typeof fetchSchema>>
    tests: RpcTestCase[]
    batchTests: RpcBatchTest[]
    pipelineTests: RpcPipelineTest[]
  }
  rest?: {
    spec: unknown
    endpoints: unknown[]
    tests: RestTestCase[]
  }
  qa?: {
    tests: TestCase[]
    oauthTests?: McpOAuthTest[]
  }
  allTests: TestCase[]
  summary: {
    total: number
    byType: Record<ProtocolType, number>
  }
}

/**
 * Discover tests from /qa endpoint
 */
async function discoverQaTests(options: DiscoveryOptions): Promise<{
  tests: TestCase[]
  oauthTests?: McpOAuthTest[]
}> {
  const { baseUrl, timeout = 30000, headers: extraHeaders = {}, accessToken } = options

  const url = new URL('/qa', baseUrl)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tests/list',
        params: {},
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`QA endpoint returned ${response.status}`)
    }

    const json = await response.json() as { result?: TestListResponse; error?: unknown }

    if (json.error) {
      throw new Error(`QA endpoint error: ${JSON.stringify(json.error)}`)
    }

    const result = json.result

    return {
      tests: result?.tests as TestCase[] || [],
    }
  } catch {
    // QA endpoint might not exist - that's okay
    return { tests: [] }
  }
}

/**
 * Discover all tests from a server
 * Tries multiple discovery methods based on configured protocols
 */
export async function discover(options: DiscoveryOptions): Promise<DiscoveryResult> {
  const { protocols = ['mcp', 'rpc', 'rest'] } = options
  const result: DiscoveryResult = {
    allTests: [],
    summary: {
      total: 0,
      byType: { mcp: 0, rpc: 0, rest: 0, oauth: 0 },
    },
  }

  const errors: Error[] = []

  // Always try /qa endpoint first
  try {
    const qaResult = await discoverQaTests(options)
    if (qaResult.tests.length > 0 || qaResult.oauthTests) {
      result.qa = qaResult
    }
  } catch (e) {
    errors.push(e as Error)
  }

  // Try MCP discovery
  if (protocols.includes('mcp')) {
    try {
      const mcpResult = await discoverMcpTests({
        ...options,
        endpoint: '/mcp',
      })
      if (mcpResult.tests.length > 0) {
        result.mcp = mcpResult
      }
    } catch (e) {
      errors.push(e as Error)
    }
  }

  // Try RPC discovery
  if (protocols.includes('rpc')) {
    try {
      const rpcResult = await discoverRpcTests({
        ...options,
        schema: '/__schema',
      })
      if (rpcResult.tests.length > 0) {
        result.rpc = rpcResult
      }
    } catch (e) {
      errors.push(e as Error)
    }
  }

  // Try OpenAPI discovery
  if (protocols.includes('rest')) {
    try {
      const restResult = await discoverOpenApiTests({
        ...options,
      })
      if (restResult.tests.length > 0) {
        result.rest = restResult
      }
    } catch (e) {
      errors.push(e as Error)
    }
  }

  // Collect all tests
  if (result.qa?.tests) {
    result.allTests.push(...result.qa.tests)
  }
  if (result.mcp?.tests) {
    result.allTests.push(...result.mcp.tests)
  }
  if (result.rpc?.tests) {
    result.allTests.push(...result.rpc.tests)
  }
  if (result.rest?.tests) {
    result.allTests.push(...result.rest.tests)
  }

  // Calculate summary
  result.summary.total = result.allTests.length
  for (const test of result.allTests) {
    const type = (test as RpcTestCase).type || 'rest'
    if (type in result.summary.byType) {
      result.summary.byType[type as ProtocolType]++
    }
  }

  return result
}

/**
 * Quick check if a server has discoverable tests
 */
export async function hasTests(baseUrl: string, timeout: number = 5000): Promise<boolean> {
  try {
    const result = await discover({ baseUrl, timeout })
    return result.summary.total > 0
  } catch {
    return false
  }
}
