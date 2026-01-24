import { Hono } from 'hono'
import type { ApiEnv, McpConfig } from '../types'

export function mcpConvention(config: McpConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()

  // MCP server info endpoint
  app.get('/mcp', (c) => {
    return c.var.respond({
      data: {
        name: config.name,
        version: config.version || '1.0.0',
        capabilities: {
          tools: config.tools?.map((t) => ({ name: t.name, description: t.description })),
          resources: config.resources?.map((r) => ({ uri: r.uri, name: r.name, description: r.description })),
        },
      },
    })
  })

  // JSON-RPC endpoint for MCP protocol
  app.post('/mcp', async (c) => {
    const body = await c.req.json<JsonRpcRequest>()

    if (!body.method || body.jsonrpc !== '2.0') {
      return c.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: body.id }, 400)
    }

    try {
      const result = await handleMcpMethod(body, config, c)
      return c.json({ jsonrpc: '2.0', result, id: body.id })
    } catch (err) {
      const error = err as Error & { code?: string | number }
      return c.json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error.message || 'Internal error',
          data: error.code ? { code: error.code } : undefined,
        },
        id: body.id,
      }, 500)
    }
  })

  return app
}

interface JsonRpcRequest {
  jsonrpc: string
  method: string
  params?: unknown
  id?: string | number
}

async function handleMcpMethod(req: JsonRpcRequest, config: McpConfig, c: unknown): Promise<unknown> {
  switch (req.method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: config.tools?.length ? {} : undefined,
          resources: config.resources?.length ? {} : undefined,
        },
        serverInfo: { name: config.name, version: config.version || '1.0.0' },
      }

    case 'tools/list':
      return {
        tools: (config.tools || []).map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      }

    case 'tools/call': {
      const params = req.params as { name: string; arguments?: unknown }
      const tool = config.tools?.find((t) => t.name === params.name)
      if (!tool) {
        throw new Error(`Unknown tool: ${params.name}`)
      }
      const result = await tool.handler(params.arguments, c as never)
      return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] }
    }

    case 'resources/list':
      return {
        resources: (config.resources || []).map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType || 'application/json',
        })),
      }

    case 'resources/read': {
      const params = req.params as { uri: string }
      const resource = config.resources?.find((r) => r.uri === params.uri)
      if (!resource) {
        throw new Error(`Unknown resource: ${params.uri}`)
      }
      const content = await resource.handler(c as never)
      return {
        contents: [{
          uri: resource.uri,
          mimeType: resource.mimeType || 'application/json',
          text: typeof content === 'string' ? content : JSON.stringify(content),
        }],
      }
    }

    default:
      throw new Error(`Unknown method: ${req.method}`)
  }
}
