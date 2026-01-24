/**
 * Database Convention
 *
 * Schema-driven database that auto-generates:
 * - CRUD REST endpoints
 * - MCP tools
 * - RPC methods
 * - Event streaming
 */

import { Hono } from 'hono'
import type { ApiEnv } from '../../types'
import type { DatabaseConfig, ParsedSchema, Document, QueryOptions, DatabaseEvent } from './types'
import { parseSchema, generateJsonSchema } from './schema'

export type { DatabaseConfig, SchemaDef, ParsedSchema, ParsedModel, ParsedField, Document, DatabaseEvent } from './types'
export { parseSchema, parseField, parseModel, generateJsonSchema } from './schema'

/**
 * Create database convention routes
 */
export function databaseConvention(config: DatabaseConfig): {
  routes: Hono<ApiEnv>
  schema: ParsedSchema
  mcpTools: McpToolDef[]
} {
  const app = new Hono<ApiEnv>()
  const schema = parseSchema(config.schema)
  const basePath = config.rest?.basePath || ''
  const pageSize = config.rest?.pageSize || 20
  const maxPageSize = config.rest?.maxPageSize || 100

  // Generate MCP tools
  const mcpTools = generateMcpTools(schema, config)

  // ==========================================================================
  // REST Endpoints - Auto-generated per model
  // ==========================================================================

  for (const model of Object.values(schema.models)) {
    const modelPath = `${basePath}/${model.plural}`

    // LIST - GET /users
    app.get(modelPath, async (c) => {
      const db = await getDatabase(c, config)
      const options = parseQueryOptions(c, pageSize, maxPageSize)

      const result = await db.list(model.name, options)

      return c.var.respond({
        data: result.data,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
        links: {
          self: c.req.url,
          next: result.hasMore
            ? `${modelPath}?offset=${result.offset + result.limit}&limit=${result.limit}`
            : undefined,
        },
      })
    })

    // SEARCH - GET /users/search?q=...
    app.get(`${modelPath}/search`, async (c) => {
      const db = await getDatabase(c, config)
      const query = c.req.query('q') || ''
      const options = parseQueryOptions(c, pageSize, maxPageSize)

      const result = await db.search(model.name, query, options)

      return c.var.respond({
        data: result.data,
        meta: {
          query,
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      })
    })

    // CREATE - POST /users
    app.post(modelPath, async (c) => {
      const db = await getDatabase(c, config)
      const body = await c.req.json()
      const ctx = getRequestContext(c)

      const doc = await db.create(model.name, body, ctx)

      return c.var.respond({
        data: doc,
        status: 201,
      })
    })

    // GET - GET /users/:id
    app.get(`${modelPath}/:id`, async (c) => {
      const db = await getDatabase(c, config)
      const id = c.req.param('id')
      const include = c.req.query('include')?.split(',')

      const doc = await db.get(model.name, id, { include })

      if (!doc) {
        return c.var.respond({
          error: { code: 'NOT_FOUND', message: `${model.name} not found` },
          status: 404,
        })
      }

      return c.var.respond({ data: doc })
    })

    // UPDATE - PUT /users/:id
    app.put(`${modelPath}/:id`, async (c) => {
      const db = await getDatabase(c, config)
      const id = c.req.param('id')
      const body = await c.req.json()
      const ctx = getRequestContext(c)

      try {
        const doc = await db.update(model.name, id, body, ctx)
        return c.var.respond({ data: doc })
      } catch (e) {
        const err = e as Error
        if (err.message.includes('not found')) {
          return c.var.respond({
            error: { code: 'NOT_FOUND', message: err.message },
            status: 404,
          })
        }
        throw e
      }
    })

    // PATCH - PATCH /users/:id
    app.patch(`${modelPath}/:id`, async (c) => {
      const db = await getDatabase(c, config)
      const id = c.req.param('id')
      const body = await c.req.json()
      const ctx = getRequestContext(c)

      try {
        const doc = await db.update(model.name, id, body, ctx)
        return c.var.respond({ data: doc })
      } catch (e) {
        const err = e as Error
        if (err.message.includes('not found')) {
          return c.var.respond({
            error: { code: 'NOT_FOUND', message: err.message },
            status: 404,
          })
        }
        throw e
      }
    })

    // DELETE - DELETE /users/:id
    app.delete(`${modelPath}/:id`, async (c) => {
      const db = await getDatabase(c, config)
      const id = c.req.param('id')
      const ctx = getRequestContext(c)

      await db.delete(model.name, id, ctx)

      return c.var.respond({
        data: { deleted: true, id },
      })
    })

    // RELATIONS - GET /users/:id/posts
    for (const field of Object.values(model.fields)) {
      if (field.relation?.type === 'inverse' || (field.relation?.type === 'forward' && field.relation.many)) {
        app.get(`${modelPath}/:id/${field.name}`, async (c) => {
          const db = await getDatabase(c, config)
          const id = c.req.param('id')
          const options = parseQueryOptions(c, pageSize, maxPageSize)

          // Get the parent document with the relation
          const doc = await db.get(model.name, id, { include: [field.name] })

          if (!doc) {
            return c.var.respond({
              error: { code: 'NOT_FOUND', message: `${model.name} not found` },
              status: 404,
            })
          }

          const relatedData = doc[field.name] as Document[] || []

          return c.var.respond({
            data: relatedData.slice(options.offset || 0, (options.offset || 0) + (options.limit || pageSize)),
            meta: {
              total: relatedData.length,
              limit: options.limit || pageSize,
              offset: options.offset || 0,
            },
          })
        })
      }
    }
  }

  // ==========================================================================
  // MCP Endpoint
  // ==========================================================================

  if (config.mcp !== false) {
    const mcpPath = typeof config.mcp === 'object' ? '/mcp' : '/mcp'

    app.post(mcpPath, async (c) => {
      const body = await c.req.json<{ jsonrpc: string; method: string; params?: unknown; id?: unknown }>()

      if (body.method === 'tools/list') {
        return c.json({
          jsonrpc: '2.0',
          result: { tools: mcpTools },
          id: body.id,
        })
      }

      if (body.method === 'tools/call') {
        const params = body.params as { name: string; arguments?: Record<string, unknown> }
        const tool = mcpTools.find((t) => t.name === params.name)

        if (!tool) {
          return c.json({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Tool not found: ${params.name}` },
            id: body.id,
          })
        }

        try {
          const db = await getDatabase(c, config)
          const result = await executeToolCall(db, schema, params.name, params.arguments || {}, getRequestContext(c))

          return c.json({
            jsonrpc: '2.0',
            result: {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            },
            id: body.id,
          })
        } catch (e) {
          const err = e as Error
          return c.json({
            jsonrpc: '2.0',
            error: { code: -32603, message: err.message },
            id: body.id,
          })
        }
      }

      return c.json({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${body.method}` },
        id: body.id,
      })
    })
  }

  // ==========================================================================
  // Events Endpoint
  // ==========================================================================

  app.get('/events', async (c) => {
    const db = await getDatabase(c, config)
    const model = c.req.query('model')
    const since = c.req.query('since')

    // For HTTP, return recent events
    const events = await db.getEvents?.({
      model,
      since: since ? parseInt(since, 10) : undefined,
      limit: 100,
    }) || []

    return c.var.respond({ data: events })
  })

  // WebSocket for real-time subscriptions
  app.get('/events/ws', async (c) => {
    // This would be handled by the DO's WebSocket support
    return c.var.respond({
      error: { code: 'USE_WEBSOCKET', message: 'Connect via WebSocket for real-time events' },
      status: 400,
    })
  })

  return { routes: app, schema, mcpTools }
}

// =============================================================================
// Helpers
// =============================================================================

interface McpToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

/**
 * Generate MCP tools from schema
 */
function generateMcpTools(schema: ParsedSchema, config: DatabaseConfig): McpToolDef[] {
  const tools: McpToolDef[] = []
  const prefix = typeof config.mcp === 'object' ? config.mcp.prefix || '' : ''

  for (const model of Object.values(schema.models)) {
    const inputSchema = generateJsonSchema(model)
    const name = model.singular

    // Create
    tools.push({
      name: `${prefix}${name}.create`,
      description: `Create a new ${model.name}`,
      inputSchema,
    })

    // Get
    tools.push({
      name: `${prefix}${name}.get`,
      description: `Get a ${model.name} by ID`,
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: `The ${model.name} ID` },
          include: {
            type: 'array',
            items: { type: 'string' },
            description: 'Relations to include',
          },
        },
        required: ['id'],
      },
    })

    // List
    tools.push({
      name: `${prefix}${name}.list`,
      description: `List ${model.plural}`,
      inputSchema: {
        type: 'object',
        properties: {
          where: { type: 'object', description: 'Filter conditions' },
          orderBy: { type: 'string', description: 'Sort field' },
          limit: { type: 'number', description: 'Max results' },
          offset: { type: 'number', description: 'Skip results' },
        },
      },
    })

    // Search
    tools.push({
      name: `${prefix}${name}.search`,
      description: `Search ${model.plural}`,
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Max results' },
        },
        required: ['query'],
      },
    })

    // Update
    tools.push({
      name: `${prefix}${name}.update`,
      description: `Update a ${model.name}`,
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: `The ${model.name} ID` },
          data: inputSchema,
        },
        required: ['id', 'data'],
      },
    })

    // Delete
    tools.push({
      name: `${prefix}${name}.delete`,
      description: `Delete a ${model.name}`,
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: `The ${model.name} ID` },
        },
        required: ['id'],
      },
    })
  }

  return tools
}

/**
 * Execute an MCP tool call
 */
async function executeToolCall(
  db: DatabaseRpcClient,
  schema: ParsedSchema,
  toolName: string,
  args: Record<string, unknown>,
  ctx: { userId?: string; requestId?: string }
): Promise<unknown> {
  const [modelName, method] = toolName.split('.')

  // Find model by singular name
  const model = Object.values(schema.models).find((m) => m.singular === modelName)
  if (!model) {
    throw new Error(`Model not found: ${modelName}`)
  }

  switch (method) {
    case 'create':
      return db.create(model.name, args, ctx)

    case 'get':
      return db.get(model.name, args.id as string, {
        include: args.include as string[] | undefined,
      })

    case 'list':
      return db.list(model.name, args as QueryOptions)

    case 'search':
      return db.search(model.name, args.query as string, args as QueryOptions)

    case 'update':
      return db.update(model.name, args.id as string, args.data as Record<string, unknown>, ctx)

    case 'delete':
      await db.delete(model.name, args.id as string, ctx)
      return { deleted: true, id: args.id }

    default:
      throw new Error(`Unknown method: ${method}`)
  }
}

/**
 * Parse query options from request
 */
function parseQueryOptions(c: { req: { query: (k: string) => string | undefined } }, defaultLimit: number, maxLimit: number): QueryOptions {
  const limit = Math.min(parseInt(c.req.query('limit') || String(defaultLimit), 10), maxLimit)
  const offset = parseInt(c.req.query('offset') || '0', 10)
  const orderBy = c.req.query('orderBy') || c.req.query('sort')
  const include = c.req.query('include')?.split(',')
  const select = c.req.query('select')?.split(',')

  // Parse where from query params (simple key=value)
  const where: Record<string, unknown> = {}
  // Could be extended to support more complex filtering

  return {
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy,
    limit,
    offset,
    include,
    select,
  }
}

/**
 * Get request context for audit trail
 */
function getRequestContext(c: { var: { requestId: string; user?: { id?: string } } }): { userId?: string; requestId?: string } {
  return {
    userId: c.var.user?.id,
    requestId: c.var.requestId,
  }
}

// =============================================================================
// Database Client Interface
// =============================================================================

interface DatabaseRpcClient {
  create(model: string, data: Record<string, unknown>, ctx?: { userId?: string; requestId?: string }): Promise<Document>
  get(model: string, id: string, options?: { include?: string[] }): Promise<Document | null>
  update(model: string, id: string, data: Record<string, unknown>, ctx?: { userId?: string; requestId?: string }): Promise<Document>
  delete(model: string, id: string, ctx?: { userId?: string; requestId?: string }): Promise<void>
  list(model: string, options?: QueryOptions): Promise<{ data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }>
  search(model: string, query: string, options?: QueryOptions): Promise<{ data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }>
  getEvents?(options: { model?: string; since?: number; limit?: number }): Promise<DatabaseEvent[]>
}

/**
 * Get database client from context
 * This connects to the DO that stores the actual data
 */
async function getDatabase(c: { env: Record<string, unknown>; var: { requestId: string } }, config: DatabaseConfig): Promise<DatabaseRpcClient> {
  const binding = config.binding || 'DB'
  const namespace = typeof config.namespace === 'function'
    ? config.namespace(c)
    : config.namespace || 'default'

  const doNamespace = c.env[binding] as DurableObjectNamespace | undefined

  if (!doNamespace) {
    // Fallback to in-memory for development
    return createInMemoryDatabase()
  }

  // Get or create the DO for this namespace
  const doId = doNamespace.idFromName(namespace)
  const stub = doNamespace.get(doId)

  // Return RPC wrapper
  return {
    async create(model, data, ctx) {
      const response = await stub.fetch('http://do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'create', params: { model, data, ctx } }),
      })
      const result = await response.json() as { result?: Document; error?: { message: string } }
      if (result.error) throw new Error(result.error.message)
      return result.result!
    },

    async get(model, id, options) {
      const response = await stub.fetch('http://do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'get', params: { model, id, options } }),
      })
      const result = await response.json() as { result?: Document | null; error?: { message: string } }
      if (result.error) throw new Error(result.error.message)
      return result.result ?? null
    },

    async update(model, id, data, ctx) {
      const response = await stub.fetch('http://do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'update', params: { model, id, data, ctx } }),
      })
      const result = await response.json() as { result?: Document; error?: { message: string } }
      if (result.error) throw new Error(result.error.message)
      return result.result!
    },

    async delete(model, id, ctx) {
      const response = await stub.fetch('http://do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'delete', params: { model, id, ctx } }),
      })
      const result = await response.json() as { error?: { message: string } }
      if (result.error) throw new Error(result.error.message)
    },

    async list(model, options) {
      const response = await stub.fetch('http://do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'list', params: { model, options } }),
      })
      const result = await response.json() as { result?: { data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }; error?: { message: string } }
      if (result.error) throw new Error(result.error.message)
      return result.result!
    },

    async search(model, query, options) {
      const response = await stub.fetch('http://do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'search', params: { model, query, options } }),
      })
      const result = await response.json() as { result?: { data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }; error?: { message: string } }
      if (result.error) throw new Error(result.error.message)
      return result.result!
    },
  }
}

// =============================================================================
// In-Memory Database (for development/testing)
// =============================================================================

function createInMemoryDatabase(): DatabaseRpcClient {
  const store: Record<string, Map<string, Document>> = {}

  function getCollection(model: string): Map<string, Document> {
    if (!store[model]) {
      store[model] = new Map()
    }
    return store[model]
  }

  function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  return {
    async create(model, data, ctx) {
      const collection = getCollection(model)
      const id = (data.id as string) || generateId()
      const now = new Date().toISOString()

      const doc: Document = {
        id,
        ...data,
        _version: 1,
        _createdAt: now,
        _createdBy: ctx?.userId,
        _updatedAt: now,
        _updatedBy: ctx?.userId,
      }

      collection.set(id, doc)
      return doc
    },

    async get(model, id) {
      const collection = getCollection(model)
      return collection.get(id) || null
    },

    async update(model, id, data, ctx) {
      const collection = getCollection(model)
      const existing = collection.get(id)

      if (!existing) {
        throw new Error(`${model} ${id} not found`)
      }

      const doc: Document = {
        ...existing,
        ...data,
        id: existing.id,
        _version: existing._version + 1,
        _createdAt: existing._createdAt,
        _createdBy: existing._createdBy,
        _updatedAt: new Date().toISOString(),
        _updatedBy: ctx?.userId,
      }

      collection.set(id, doc)
      return doc
    },

    async delete(model, id, ctx) {
      const collection = getCollection(model)
      const existing = collection.get(id)

      if (existing) {
        // Soft delete
        existing._deletedAt = new Date().toISOString()
        existing._deletedBy = ctx?.userId
        collection.set(id, existing)
      }
    },

    async list(model, options) {
      const collection = getCollection(model)
      let docs = Array.from(collection.values()).filter((d) => !d._deletedAt)

      // Apply where filter
      if (options?.where) {
        docs = docs.filter((doc) => {
          for (const [key, value] of Object.entries(options.where!)) {
            if (doc[key] !== value) return false
          }
          return true
        })
      }

      // Apply orderBy
      if (options?.orderBy) {
        const field = typeof options.orderBy === 'string' ? options.orderBy : options.orderBy[0]?.field
        const dir = typeof options.orderBy === 'string' ? 'asc' : options.orderBy[0]?.direction || 'asc'
        docs.sort((a, b) => {
          const aVal = String(a[field] || '')
          const bVal = String(b[field] || '')
          return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
        })
      }

      const total = docs.length
      const limit = options?.limit || 20
      const offset = options?.offset || 0
      docs = docs.slice(offset, offset + limit)

      return {
        data: docs,
        total,
        limit,
        offset,
        hasMore: offset + docs.length < total,
      }
    },

    async search(model, query, options) {
      const collection = getCollection(model)
      const q = query.toLowerCase()
      let docs = Array.from(collection.values()).filter((d) => !d._deletedAt)

      // Simple text search across all string fields
      docs = docs.filter((doc) => {
        for (const value of Object.values(doc)) {
          if (typeof value === 'string' && value.toLowerCase().includes(q)) {
            return true
          }
        }
        return false
      })

      const total = docs.length
      const limit = options?.limit || 20
      const offset = options?.offset || 0
      docs = docs.slice(offset, offset + limit)

      return {
        data: docs,
        total,
        limit,
        offset,
        hasMore: offset + docs.length < total,
      }
    },
  }
}
