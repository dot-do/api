/**
 * Transport Unification Convention
 *
 * Provides the same operation across four transports:
 * - URL: crm.do/sendContract(deal_kRziM)          (handled by function-calls convention)
 * - SDK: $.sendContract('deal_kRziM')              (client-side, same underlying call)
 * - RPC: POST /rpc  { path: ['sendContract'], args: ['deal_kRziM'] }
 * - MCP: POST /mcp  { method: 'tools/call', params: { name: 'sendContract', arguments: {...} } }
 *
 * Auto-generates MCP tools from the function registry + CRUD collections.
 * Auto-generates RPC handlers from the function registry.
 * Root discovery includes `discover` (nouns/collections) and `functions` (verbs).
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv } from '../types'
import type { FunctionRegistry, FunctionCallInput, FunctionCallContext } from './function-calls'

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for the transport unification convention.
 */
export interface TransportConfig {
  /** Function registry containing all registered functions (verbs) */
  registry: FunctionRegistry

  /** Known collection names (nouns) for discovery and CRUD tool generation */
  collections?: string[]

  /** Entity verbs: maps entity types to their available verbs */
  entityVerbs?: Record<string, string[]>

  /** MCP server configuration (when provided, enables MCP transport) */
  mcp?: {
    name: string
    version?: string
  }
}

/**
 * An RPC request in the path + args format.
 */
interface RpcRequest {
  /** Path segments identifying the function (e.g., ['sendContract'] or ['papa.parse']) */
  path: string[]
  /** Positional arguments */
  args?: unknown[]
}

/**
 * Auto-generated MCP tool definition.
 */
interface GeneratedTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler?: (input: unknown, c: Context) => Promise<unknown>
}

// =============================================================================
// CRUD operations for auto-generated tools
// =============================================================================

const CRUD_OPERATIONS = ['list', 'get', 'create', 'update', 'delete'] as const

/**
 * Generate CRUD tool definitions for a collection.
 */
function generateCrudTools(collection: string): GeneratedTool[] {
  return CRUD_OPERATIONS.map((op) => ({
    name: `${collection}.${op}`,
    description: `${op.charAt(0).toUpperCase() + op.slice(1)} ${collection}`,
    inputSchema: getCrudInputSchema(op),
    // CRUD tools are route-only (no direct handler — served via REST)
  }))
}

/**
 * Get the JSON Schema for a CRUD operation's input.
 */
function getCrudInputSchema(op: string): Record<string, unknown> {
  switch (op) {
    case 'list':
      return {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of items to return' },
          offset: { type: 'number', description: 'Number of items to skip' },
          filter: { type: 'object', description: 'Filter criteria' },
        },
      }
    case 'get':
      return {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Entity ID' },
        },
        required: ['id'],
      }
    case 'create':
      return {
        type: 'object',
        properties: {
          data: { type: 'object', description: 'Entity data' },
        },
        required: ['data'],
      }
    case 'update':
      return {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Entity ID' },
          data: { type: 'object', description: 'Fields to update' },
        },
        required: ['id', 'data'],
      }
    case 'delete':
      return {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Entity ID' },
        },
        required: ['id'],
      }
    default:
      return { type: 'object' }
  }
}

// =============================================================================
// Tool generation from function registry
// =============================================================================

/**
 * Generate MCP tools from the function registry.
 */
function generateFunctionTools(registry: FunctionRegistry): GeneratedTool[] {
  return registry.list().map((entry) => ({
    name: entry.name,
    description: entry.description || entry.name,
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'Entity ID or primary argument' },
      },
    },
    handler: async (input: unknown, c: Context) => {
      const registered = registry.get(entry.name)
      if (!registered) {
        throw new Error(`Function '${entry.name}' not found`)
      }

      const fnInput: FunctionCallInput = {
        name: entry.name,
        args: [],
        kwargs: {},
        body: input,
      }

      const ctx: FunctionCallContext = {
        c: c as Context<ApiEnv>,
        req: c.req.raw,
      }

      return registered.fn(fnInput, ctx)
    },
  }))
}

// =============================================================================
// RPC arg classification
// =============================================================================

/**
 * Classify an RPC argument string into a typed arg.
 */
function classifyArg(value: unknown): { value: unknown; type: string } {
  if (typeof value !== 'string') {
    return { value, type: typeof value }
  }
  return { value, type: 'string' }
}

// =============================================================================
// Convention
// =============================================================================

/**
 * Creates a Hono sub-app that provides unified transport for all registered functions.
 *
 * Endpoints:
 * - GET  /        Root discovery with `discover` (nouns) and `functions` (verbs)
 * - GET  /rpc     List available RPC methods
 * - POST /rpc     Execute function via { path, args } format
 * - GET  /mcp     MCP server info
 * - POST /mcp     MCP JSON-RPC (initialize, tools/list, tools/call)
 */
export function transportConvention(config: TransportConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()
  const { registry, collections = [], entityVerbs = {}, mcp } = config

  // Collect all method names for RPC listing
  const getAllMethodNames = (): string[] => {
    const methods: string[] = []

    // Function registry methods
    for (const entry of registry.list()) {
      methods.push(entry.name)
    }

    // CRUD methods for collections
    for (const collection of collections) {
      for (const op of CRUD_OPERATIONS) {
        methods.push(`${collection}.${op}`)
      }
    }

    return methods
  }

  // Collect all MCP tools
  const getAllTools = (): GeneratedTool[] => {
    const tools: GeneratedTool[] = []

    // Function tools (with handlers)
    tools.push(...generateFunctionTools(registry))

    // CRUD tools (route-only)
    for (const collection of collections) {
      tools.push(...generateCrudTools(collection))
    }

    return tools
  }

  // =========================================================================
  // Root discovery endpoint
  // =========================================================================

  app.get('/', (c) => {
    const url = new URL(c.req.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const apiConfig = c.var.apiConfig

    // Build the envelope directly so discover/functions/transports are top-level keys
    const envelope: Record<string, unknown> = {
      api: {
        name: apiConfig.name,
        ...(apiConfig.description && { description: apiConfig.description }),
        url: baseUrl,
        ...(apiConfig.version && { version: apiConfig.version }),
      },
      links: {
        self: c.req.url,
        home: baseUrl,
      },
    }

    // discover block: nouns/collections
    if (collections.length > 0) {
      const discover: Record<string, string> = {}
      for (const collection of collections) {
        discover[collection] = `${baseUrl}/${collection}`
      }
      envelope.discover = discover
    }

    // functions block: verbs
    const functionEntries = registry.list()
    if (functionEntries.length > 0) {
      envelope.functions = registry.toDiscovery(baseUrl)
    }

    // transports block
    if (mcp || functionEntries.length > 0) {
      const transports: Record<string, string> = {
        url: baseUrl,
        rpc: `${baseUrl}/rpc`,
      }
      if (mcp) {
        transports.mcp = `${baseUrl}/mcp`
      }
      envelope.transports = transports
    }

    return c.json(envelope)
  })

  // =========================================================================
  // RPC transport
  // =========================================================================

  // GET /rpc — list available methods
  app.get('/rpc', (c) => {
    const methods = getAllMethodNames()
    return c.var.respond({
      data: { methods },
    })
  })

  // POST /rpc — execute function via { path, args } format
  app.post('/rpc', async (c) => {
    const body = await c.req.json<RpcRequest>().catch(() => null)

    if (!body || !body.path || !Array.isArray(body.path) || body.path.length === 0) {
      return c.var.respond({
        error: {
          message: 'Invalid RPC request: "path" must be a non-empty array of strings',
          code: 'INVALID_RPC_REQUEST',
        },
        status: 400,
      })
    }

    const fnName = body.path.join('.')
    const args = body.args || []

    const entry = registry.get(fnName)
    if (!entry) {
      return c.var.respond({
        error: {
          message: `Function '${fnName}' not found`,
          code: 'FUNCTION_NOT_FOUND',
        },
        status: 404,
      })
    }

    const fnInput: FunctionCallInput = {
      name: fnName,
      args: args.map((a) => classifyArg(a)),
      kwargs: {},
    }

    const ctx: FunctionCallContext = {
      c,
      req: c.req.raw,
    }

    try {
      const result = await entry.fn(fnInput, ctx)
      return c.var.respond({ data: result })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'FUNCTION_ERROR' },
        status: 500,
      })
    }
  })

  // =========================================================================
  // MCP transport
  // =========================================================================

  if (mcp) {
    // GET /mcp — server info
    app.get('/mcp', (c) => {
      const tools = getAllTools()
      return c.var.respond({
        data: {
          name: mcp.name,
          version: mcp.version || '1.0.0',
          capabilities: {
            tools: tools.map((t) => ({ name: t.name, description: t.description })),
          },
        },
      })
    })

    // POST /mcp — JSON-RPC
    app.post('/mcp', async (c) => {
      const body = await c.req.json<{
        jsonrpc: string
        method: string
        params?: unknown
        id?: string | number
      }>()

      if (!body.method || body.jsonrpc !== '2.0') {
        return c.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: body.id }, 400)
      }

      try {
        const result = await handleMcpMethod(body.method, body.params, c, config)
        return c.json({ jsonrpc: '2.0', result, id: body.id })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        return c.json(
          {
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: error.message || 'Internal error',
            },
            id: body.id,
          },
          500,
        )
      }
    })
  }

  return app
}

// =============================================================================
// MCP method handler
// =============================================================================

async function handleMcpMethod(
  method: string,
  params: unknown,
  c: Context<ApiEnv>,
  config: TransportConfig,
): Promise<unknown> {
  const { registry, collections = [], mcp } = config

  // Collect all tools
  const getAllTools = (): GeneratedTool[] => {
    const tools: GeneratedTool[] = []
    tools.push(...generateFunctionTools(registry))
    for (const collection of collections) {
      tools.push(...generateCrudTools(collection))
    }
    return tools
  }

  switch (method) {
    case 'initialize': {
      const tools = getAllTools()
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: tools.length ? {} : undefined,
        },
        serverInfo: {
          name: mcp?.name || 'unknown',
          version: mcp?.version || '1.0.0',
        },
      }
    }

    case 'tools/list': {
      const tools = getAllTools()
      return {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      }
    }

    case 'tools/call': {
      const callParams = params as { name: string; arguments?: unknown }
      const tools = getAllTools()
      const tool = tools.find((t) => t.name === callParams.name)

      if (!tool) {
        throw new Error(`Unknown tool: ${callParams.name}`)
      }

      if (!tool.handler) {
        throw new Error(
          `Tool "${callParams.name}" is route-only and cannot be called directly via MCP. ` +
            `Use the corresponding REST endpoint instead.`,
        )
      }

      const result = await tool.handler(callParams.arguments, c as Context)
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      }
    }

    default:
      throw new Error(`Unknown method: ${method}`)
  }
}
