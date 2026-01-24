/**
 * MCP Discovery - fetch tools, resources, and tests from MCP servers
 */

import type {
  McpTool,
  McpResource,
  McpPrompt,
  RpcTestCase,
} from '../types.js'

export interface McpDiscoveryOptions {
  baseUrl: string
  endpoint?: string
  timeout?: number
  headers?: Record<string, string>
  accessToken?: string
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: unknown
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: string | number
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

async function mcpRequest<T>(
  method: string,
  params: unknown,
  options: McpDiscoveryOptions
): Promise<T> {
  const {
    baseUrl,
    endpoint = '/mcp',
    timeout = 30000,
    headers: extraHeaders = {},
    accessToken,
  } = options

  const url = new URL(endpoint, baseUrl)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const json = await response.json() as JsonRpcResponse<T>

    if (json.error) {
      throw new Error(`MCP error: ${json.error.message}`)
    }

    return json.result as T
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * List all tools from an MCP server
 */
export async function listTools(options: McpDiscoveryOptions): Promise<McpTool[]> {
  const result = await mcpRequest<{ tools: McpTool[] }>('tools/list', {}, options)
  return result.tools || []
}

/**
 * List all resources from an MCP server
 */
export async function listResources(options: McpDiscoveryOptions): Promise<McpResource[]> {
  const result = await mcpRequest<{ resources: McpResource[] }>('resources/list', {}, options)
  return result.resources || []
}

/**
 * List all prompts from an MCP server
 */
export async function listPrompts(options: McpDiscoveryOptions): Promise<McpPrompt[]> {
  const result = await mcpRequest<{ prompts: McpPrompt[] }>('prompts/list', {}, options)
  return result.prompts || []
}

/**
 * Get server info
 */
export async function getServerInfo(options: McpDiscoveryOptions): Promise<{
  name: string
  version: string
  protocolVersion: string
}> {
  return mcpRequest('server/info', {}, options)
}

/**
 * Extract tests from MCP tools
 */
export function extractTestsFromTools(tools: McpTool[]): RpcTestCase[] {
  const tests: RpcTestCase[] = []

  for (const tool of tools) {
    if (tool.tests) {
      for (const test of tool.tests) {
        tests.push({
          ...test,
          id: test.id || `mcp.${tool.name}.${test.name.replace(/\s+/g, '-').toLowerCase()}`,
          method: tool.name,
          type: 'mcp',
        })
      }
    }
  }

  return tests
}

/**
 * Discover all tests from an MCP server
 */
export async function discoverMcpTests(options: McpDiscoveryOptions): Promise<{
  tools: McpTool[]
  tests: RpcTestCase[]
}> {
  const tools = await listTools(options)
  const tests = extractTestsFromTools(tools)
  return { tools, tests }
}
