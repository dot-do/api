import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv, McpConfig } from '../types'
import type { McpToolRegistry, RegistryTool } from '../mcp-registry'

export interface McpConventionOptions {
  config: McpConfig
  registry?: McpToolRegistry
}

export function mcpConvention(configOrOptions: McpConfig | McpConventionOptions): Hono<ApiEnv> {
  // Support both old signature (config) and new signature (options with registry)
  const options: McpConventionOptions = 'config' in configOrOptions
    ? configOrOptions as McpConventionOptions
    : { config: configOrOptions }

  const { config, registry } = options
  const app = new Hono<ApiEnv>()

  // Get tools from registry or config
  const getTools = (): RegistryTool[] => {
    if (registry) {
      return registry.getTools()
    }
    return config.tools || []
  }

  // MCP server info endpoint
  app.get('/mcp', (c) => {
    const tools = getTools()
    return c.var.respond({
      data: {
        name: config.name,
        version: config.version || '1.0.0',
        capabilities: {
          tools: tools.length > 0 ? tools.map((t) => ({ name: t.name, description: t.description })) : config.tools?.map((t) => ({ name: t.name, description: t.description })),
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
      const result = await handleMcpMethod(body, config, c, registry)
      return c.json({ jsonrpc: '2.0', result, id: body.id })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      const errorWithCode = error as Error & { code?: string | number }
      return c.json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: errorWithCode.message || 'Internal error',
          data: errorWithCode.code ? { code: errorWithCode.code } : undefined,
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

async function handleMcpMethod(req: JsonRpcRequest, config: McpConfig, c: Context<ApiEnv>, registry?: McpToolRegistry): Promise<unknown> {
  // Get tools from registry or config
  const getTools = (): RegistryTool[] => {
    if (registry) {
      return registry.getTools()
    }
    return config.tools || []
  }

  switch (req.method) {
    case 'initialize': {
      const tools = getTools()
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: tools.length ? {} : undefined,
          resources: config.resources?.length ? {} : undefined,
        },
        serverInfo: { name: config.name, version: config.version || '1.0.0' },
      }
    }

    case 'tools/list': {
      const tools = getTools()
      return {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          ...(t.outputSchema ? { outputSchema: t.outputSchema } : {}),
          ...(t.examples?.length ? { examples: t.examples } : {}),
          ...(t.tests?.length ? { tests: t.tests } : {}),
        })),
      }
    }

    case 'tools/call': {
      const params = req.params as { name: string; arguments?: unknown }
      const tools = getTools()
      const tool = tools.find((t) => t.name === params.name)
      if (!tool) {
        throw new Error(`Unknown tool: ${params.name}`)
      }
      if (!tool.handler) {
        throw new Error(`Tool ${params.name} has no handler`)
      }
      const result = await tool.handler(params.arguments, c as Context)
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
      const content = await resource.handler(c as Context)
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
