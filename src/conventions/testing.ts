import { Hono } from 'hono'
import type { ApiEnv, McpTool } from '../types'

export interface TestCase {
  id?: string
  name: string
  description?: string
  tags?: string[]
  input: unknown
  expect: {
    status: 'success' | 'error'
    output?: unknown
    error?: { code?: string | number; message?: string }
    match?: 'exact' | 'partial' | 'schema'
  }
}

export interface RestTestCase {
  id?: string
  name: string
  description?: string
  tags?: string[]
  request?: {
    method?: string
    path?: string
    body?: unknown
    headers?: Record<string, string>
    query?: Record<string, string>
  }
  expect: {
    status: number
    headers?: Record<string, string>
    body?: unknown
    match?: 'exact' | 'partial' | 'schema'
  }
}

export interface Example {
  name: string
  input?: unknown
  output?: unknown
}

export interface RestEndpointTest {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  tests?: RestTestCase[]
}

export interface TestingConfig {
  enabled?: boolean
  endpoint?: string
  tags?: string[]
  endpoints?: RestEndpointTest[]
}

interface JsonRpcRequest {
  jsonrpc: string
  method: string
  params?: unknown
  id?: string | number
}

interface ExtendedMcpTool extends McpTool {
  outputSchema?: Record<string, unknown>
  examples?: Example[]
  tests?: TestCase[]
}

/**
 * Collect all tests from MCP tools and REST endpoints
 */
function collectTests(config: TestingConfig, tools?: ExtendedMcpTool[]): Array<{
  id: string
  name: string
  method?: string
  type: 'rpc' | 'mcp' | 'rest'
  input?: unknown
  request?: { method: string; path: string; body?: unknown; headers?: Record<string, string>; query?: Record<string, string> }
  expect: unknown
  tags?: string[]
}> {
  const tests: Array<{
    id: string
    name: string
    method?: string
    type: 'rpc' | 'mcp' | 'rest'
    input?: unknown
    request?: { method: string; path: string; body?: unknown; headers?: Record<string, string>; query?: Record<string, string> }
    expect: unknown
    tags?: string[]
  }> = []

  // Collect tests from MCP tools
  if (tools) {
    for (const tool of tools) {
      if (tool.tests) {
        for (const test of tool.tests) {
          tests.push({
            id: test.id || `mcp.${tool.name}.${test.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: test.name,
            method: tool.name,
            type: 'mcp',
            input: test.input,
            expect: test.expect,
            tags: [...(config.tags || []), ...(test.tags || [])],
          })
        }
      }
    }
  }

  // Collect tests from REST endpoints
  if (config.endpoints) {
    for (const endpoint of config.endpoints) {
      if (endpoint.tests) {
        for (const test of endpoint.tests) {
          tests.push({
            id: test.id || `rest.${endpoint.method}.${endpoint.path}.${test.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: test.name,
            type: 'rest',
            request: {
              method: endpoint.method,
              path: endpoint.path,
              ...(test.request || {}),
            },
            expect: test.expect,
            tags: [...(config.tags || []), ...(test.tags || [])],
          })
        }
      }
    }
  }

  return tests
}

/**
 * Collect examples from MCP tools
 */
function collectExamples(tools?: ExtendedMcpTool[]): Array<{
  tool: string
  name: string
  input?: unknown
  output?: unknown
}> {
  const examples: Array<{
    tool: string
    name: string
    input?: unknown
    output?: unknown
  }> = []

  if (tools) {
    for (const tool of tools) {
      if (tool.examples) {
        for (const example of tool.examples) {
          examples.push({
            tool: tool.name,
            name: example.name,
            input: example.input,
            output: example.output,
          })
        }
      }
    }
  }

  return examples
}

/**
 * Collect schemas from MCP tools
 */
function collectSchemas(tools?: ExtendedMcpTool[]): Array<{
  tool: string
  inputSchema: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}> {
  const schemas: Array<{
    tool: string
    inputSchema: Record<string, unknown>
    outputSchema?: Record<string, unknown>
  }> = []

  if (tools) {
    for (const tool of tools) {
      schemas.push({
        tool: tool.name,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
      })
    }
  }

  return schemas
}

/**
 * Testing convention - exposes /qa endpoint for test discovery and execution
 */
export function testingConvention(config: TestingConfig, tools?: ExtendedMcpTool[]): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()

  if (!config.enabled) {
    return app
  }

  const endpoint = config.endpoint || '/qa'

  // JSON-RPC endpoint for testing protocol
  app.post(endpoint, async (c) => {
    const body = await c.req.json<JsonRpcRequest>()

    if (!body.method || body.jsonrpc !== '2.0') {
      return c.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: body.id }, 400)
    }

    try {
      const result = await handleTestingMethod(body, config, tools)
      return c.json({ jsonrpc: '2.0', result, id: body.id })
    } catch (err) {
      return c.json({
        jsonrpc: '2.0',
        error: { code: -32603, message: err instanceof Error ? err.message : 'Internal error' },
        id: body.id,
      }, 500)
    }
  })

  // GET endpoint for simple discovery
  app.get(endpoint, (c) => {
    const tests = collectTests(config, tools)
    const summary = {
      total: tests.length,
      byType: {
        mcp: tests.filter(t => t.type === 'mcp').length,
        rpc: tests.filter(t => t.type === 'rpc').length,
        rest: tests.filter(t => t.type === 'rest').length,
      },
      byTag: {} as Record<string, number>,
    }

    for (const test of tests) {
      if (test.tags) {
        for (const tag of test.tags) {
          summary.byTag[tag] = (summary.byTag[tag] || 0) + 1
        }
      }
    }

    return c.var.respond({
      data: {
        tests,
        summary,
      },
    })
  })

  return app
}

async function handleTestingMethod(
  req: JsonRpcRequest,
  config: TestingConfig,
  tools?: ExtendedMcpTool[]
): Promise<unknown> {
  switch (req.method) {
    case 'tests/list': {
      const tests = collectTests(config, tools)
      const summary = {
        total: tests.length,
        byType: {
          mcp: tests.filter(t => t.type === 'mcp').length,
          rpc: tests.filter(t => t.type === 'rpc').length,
          rest: tests.filter(t => t.type === 'rest').length,
        },
        byTag: {} as Record<string, number>,
      }

      for (const test of tests) {
        if (test.tags) {
          for (const tag of test.tags) {
            summary.byTag[tag] = (summary.byTag[tag] || 0) + 1
          }
        }
      }

      return { tests, summary }
    }

    case 'examples/list':
      return { examples: collectExamples(tools) }

    case 'schemas/list':
      return { schemas: collectSchemas(tools) }

    case 'tests/run': {
      // Test execution would be done by the client (api.qa)
      // This endpoint could be used for server-side test execution if needed
      const params = req.params as { ids?: string[]; tags?: string[] }
      const tests = collectTests(config, tools)

      let testsToRun = tests
      if (params.ids) {
        testsToRun = tests.filter(t => params.ids!.includes(t.id))
      }
      if (params.tags) {
        testsToRun = testsToRun.filter(t =>
          t.tags?.some(tag => params.tags!.includes(tag))
        )
      }

      return {
        runId: `run-${Date.now()}`,
        status: 'pending',
        testsCount: testsToRun.length,
        message: 'Use api.qa CLI or library to execute tests against this server',
      }
    }

    default:
      throw new Error(`Unknown method: ${req.method}`)
  }
}
