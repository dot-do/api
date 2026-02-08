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
import Sqids from 'sqids'
import type { ApiEnv } from '../../types'
import type { DatabaseConfig, ParsedSchema, ParsedModel, Document, QueryOptions, DatabaseEvent, TypeRegistry, ReverseTypeRegistry, DecodedSqid, RequestContext } from './types'
import { parseSchema, generateJsonSchema } from './schema'
import { matchesWhere, coerceValue } from './match'

export type { DatabaseConfig, SchemaDef, ModelDef, FieldDef, ParsedSchema, ParsedModel, ParsedField, Document, DatabaseEvent, DatabaseDriverType, DatabaseDriver, DatabaseDriverFactory, QueryOptions, QueryResult, EventSinkConfig, TypeRegistry, ReverseTypeRegistry, DecodedSqid, DatabaseRpc, BatchOperation, BatchResult, RequestContext } from './types'
export { parseSchema, parseField, parseModel, generateJsonSchema } from './schema'
export { generateWebhookSignature, generateWebhookSignatureAsync, sendToWebhookSink } from './do'
export type { WebhookRetryConfig } from './do'
export { matchesWhere, coerceValue, isSafeRegex } from './match'

// =============================================================================
// Input Validation
// =============================================================================

/**
 * Validation error details for a single field
 */
export interface ValidationError {
  field: string
  message: string
  expected?: string
  received?: string
}

/**
 * Result of validating input data against a model schema
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validate input data against a model's JSON schema
 *
 * @param model - The parsed model containing field definitions
 * @param data - The input data to validate
 * @param partial - If true, required fields are not enforced (for PATCH)
 */
export function validateInput(
  model: ParsedModel,
  data: Record<string, unknown>,
  partial = false
): ValidationResult {
  const errors: ValidationError[] = []
  const jsonSchema = generateJsonSchema(model)
  const properties = jsonSchema.properties as Record<string, { type?: string; items?: { type: string } }>
  const required = (jsonSchema.required as string[]) || []

  // Check required fields (only for non-partial validation)
  if (!partial) {
    for (const fieldName of required) {
      if (data[fieldName] === undefined || data[fieldName] === null) {
        errors.push({
          field: fieldName,
          message: `Required field '${fieldName}' is missing`,
        })
      }
    }
  }

  // Type check all provided fields
  for (const [fieldName, value] of Object.entries(data)) {
    // Skip id and internal fields
    if (fieldName === 'id' || fieldName.startsWith('_')) continue

    const fieldSchema = properties[fieldName]
    if (!fieldSchema) {
      // Unknown field - we could either ignore or error
      // For now, we allow extra fields (schema evolution)
      continue
    }

    if (value === null || value === undefined) {
      // Null/undefined values are okay for optional fields
      continue
    }

    const expectedType = fieldSchema.type
    const actualType = getJsonType(value)

    if (expectedType && actualType !== expectedType) {
      // Special case: arrays
      if (expectedType === 'array' && Array.isArray(value)) {
        // Check array item types if specified
        const itemType = fieldSchema.items?.type
        if (itemType) {
          for (let i = 0; i < value.length; i++) {
            const itemActualType = getJsonType(value[i])
            if (itemActualType !== itemType) {
              errors.push({
                field: `${fieldName}[${i}]`,
                message: `Array item at index ${i} has wrong type`,
                expected: itemType,
                received: itemActualType,
              })
            }
          }
        }
      } else {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' has wrong type`,
          expected: expectedType,
          received: actualType,
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get the JSON Schema type of a value
 */
function getJsonType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/**
 * Create database convention routes
 */
export function databaseConvention(config: DatabaseConfig): {
  routes: Hono<ApiEnv>
  schema: ParsedSchema
  mcpTools: McpToolDef[]
  typeRegistry: { forward: TypeRegistry; reverse: ReverseTypeRegistry; version: string }
  sqids?: Sqids
} {
  const app = new Hono<ApiEnv>()
  const schema = parseSchema(config.schema)
  const basePath = config.rest?.basePath || ''
  const pageSize = config.rest?.pageSize || 20
  const maxPageSize = config.rest?.maxPageSize || 100
  const metaPrefix = config.metaPrefix || '_'
  const idFormat = config.idFormat || 'auto'
  const useMetaFormat = metaPrefix !== '_'

  // In-memory DB cache (scoped to this convention instance for test isolation)
  const inMemoryCache = new Map<string, DatabaseRpcClient>()

  // Build type registry (model name ↔ numeric ID)
  const registry = buildTypeRegistry(schema, config.typeRegistry)

  // Create sqids instance
  const staticSeed = typeof config.sqidSeed === 'number' ? config.sqidSeed : undefined
  const staticNamespace = typeof config.sqidNamespace === 'number' ? config.sqidNamespace : undefined
  const sqidsInstance = idFormat === 'sqid' ? createSqids(staticSeed, config.sqidMinLength) : undefined

  // Generate MCP tools
  const mcpTools = generateMcpTools(schema, config)

  // ==========================================================================
  // REST Endpoints - Auto-generated per model
  // ==========================================================================

  for (const model of Object.values(schema.models)) {
    const modelPath = `${basePath}/${model.plural}`

    // COUNT - GET /users/$count
    app.get(`${modelPath}/$count`, async (c) => {
      const db = await getDatabase(c, config, inMemoryCache)
      const options = parseQueryOptions(c, pageSize, maxPageSize)
      const count = await db.count(model.name, options.where)

      return c.var.respond({ data: count })
    })

    // LIST - GET /users
    app.get(modelPath, async (c) => {
      const db = await getDatabase(c, config, inMemoryCache)
      const options = parseQueryOptions(c, pageSize, maxPageSize)

      const result = await db.list(model.name, options)

      return c.var.respond({
        data: useMetaFormat ? result.data.map((d) => formatDocument(d, model.name, metaPrefix)) : result.data,
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
      const db = await getDatabase(c, config, inMemoryCache)
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
      let body: Record<string, unknown>
      try {
        body = await c.req.json()
      } catch {
        return c.var.respond({
          error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON', status: 400 },
          status: 400,
        })
      }

      // Strip meta fields from user input (allow id for create so users can set custom IDs)
      for (const key of Object.keys(body)) {
        if (key.startsWith('_')) delete body[key]
      }

      // Validate input before database operations
      const validation = validateInput(model, body, false)
      if (!validation.valid) {
        return c.var.respond({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: validation.errors,
          },
          status: 400,
        })
      }

      // Generate ID if not provided and format is configured
      if (!body.id && idFormat !== 'auto') {
        const typeNum = registry.forward[model.name]
        const namespace = typeof config.sqidNamespace === 'function' ? config.sqidNamespace(c) : staticNamespace
        const seed = typeof config.sqidSeed === 'function' ? config.sqidSeed(c) : staticSeed
        const reqSqids = seed !== staticSeed ? createSqids(seed, config.sqidMinLength) : sqidsInstance
        body.id = generateId(model.singular, idFormat, typeNum, reqSqids, namespace)
      }

      const db = await getDatabase(c, config, inMemoryCache)
      const ctx = getRequestContext(c)

      const doc = await db.create(model.name, body, ctx)

      return c.var.respond({
        data: useMetaFormat ? formatDocument(doc, model.name, metaPrefix) : doc,
        status: 201,
      })
    })

    // GET - GET /users/:id
    app.get(`${modelPath}/:id`, async (c) => {
      const db = await getDatabase(c, config, inMemoryCache)
      const id = c.req.param('id')
      const include = c.req.query('include')?.split(',')

      const doc = await db.get(model.name, id, { include })

      if (!doc) {
        return c.var.respond({
          error: { code: 'NOT_FOUND', message: `${model.name} not found` },
          status: 404,
        })
      }

      return c.var.respond({ data: useMetaFormat ? formatDocument(doc, model.name, metaPrefix) : doc })
    })

    // UPDATE - PUT /users/:id
    app.put(`${modelPath}/:id`, async (c) => {
      const id = c.req.param('id')
      let body: Record<string, unknown>
      try {
        body = await c.req.json()
      } catch {
        return c.var.respond({
          error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON', status: 400 },
          status: 400,
        })
      }

      // Strip meta fields from user input
      for (const key of Object.keys(body)) {
        if (key.startsWith('_') || key === 'id') delete body[key]
      }

      // Validate input before database operations (full validation for PUT)
      const validation = validateInput(model, body, false)
      if (!validation.valid) {
        return c.var.respond({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: validation.errors,
          },
          status: 400,
        })
      }

      const db = await getDatabase(c, config, inMemoryCache)
      const ctx = getRequestContext(c)

      try {
        const doc = await db.update(model.name, id, body, ctx)
        return c.var.respond({ data: useMetaFormat ? formatDocument(doc, model.name, metaPrefix) : doc })
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
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
      const id = c.req.param('id')
      let body: Record<string, unknown>
      try {
        body = await c.req.json()
      } catch {
        return c.var.respond({
          error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON', status: 400 },
          status: 400,
        })
      }

      // Strip meta fields from user input
      for (const key of Object.keys(body)) {
        if (key.startsWith('_') || key === 'id') delete body[key]
      }

      // Validate input before database operations (partial validation for PATCH)
      const validation = validateInput(model, body, true)
      if (!validation.valid) {
        return c.var.respond({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: validation.errors,
          },
          status: 400,
        })
      }

      const db = await getDatabase(c, config, inMemoryCache)
      const ctx = getRequestContext(c)

      try {
        const doc = await db.update(model.name, id, body, ctx)
        return c.var.respond({ data: useMetaFormat ? formatDocument(doc, model.name, metaPrefix) : doc })
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
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
      const db = await getDatabase(c, config, inMemoryCache)
      const id = c.req.param('id')
      const ctx = getRequestContext(c)

      const existing = await db.get(model.name, id)
      if (!existing) {
        return c.var.respond({
          error: { code: 'NOT_FOUND', message: `${model.name} not found` },
          status: 404,
        })
      }

      await db.delete(model.name, id, ctx)

      return c.var.respond({
        data: { deleted: true, id },
      })
    })

    // RELATIONS - GET /users/:id/posts (to-many), GET /posts/:id/author (to-one)
    for (const field of Object.values(model.fields)) {
      if (!field.relation) continue

      // To-many relations: inverse or forward arrays
      if (field.relation.type === 'inverse' || (field.relation.type === 'forward' && field.relation.many)) {
        app.get(`${modelPath}/:id/${field.name}`, async (c) => {
          const db = await getDatabase(c, config, inMemoryCache)
          const id = c.req.param('id')
          const options = parseQueryOptions(c, pageSize, maxPageSize)

          const doc = await db.get(model.name, id, { include: [field.name] })

          if (!doc) {
            return c.var.respond({
              error: { code: 'NOT_FOUND', message: `${model.name} not found` },
              status: 404,
            })
          }

          const relatedData = doc[field.name] as Document[] || []

          return c.var.respond({
            data: useMetaFormat
              ? relatedData.slice(options.offset || 0, (options.offset || 0) + (options.limit || pageSize)).map((d) => formatDocument(d, field.relation!.target, metaPrefix))
              : relatedData.slice(options.offset || 0, (options.offset || 0) + (options.limit || pageSize)),
            meta: {
              total: relatedData.length,
              limit: options.limit || pageSize,
              offset: options.offset || 0,
            },
          })
        })
      }

      // To-one relations: forward singular (returns entity, not array)
      if (field.relation.type === 'forward' && !field.relation.many) {
        app.get(`${modelPath}/:id/${field.name}`, async (c) => {
          const db = await getDatabase(c, config, inMemoryCache)
          const id = c.req.param('id')

          const doc = await db.get(model.name, id)

          if (!doc) {
            return c.var.respond({
              error: { code: 'NOT_FOUND', message: `${model.name} not found` },
              status: 404,
            })
          }

          const targetId = doc[field.name] as string
          if (!targetId) {
            return c.var.respond({
              error: { code: 'NOT_FOUND', message: `${field.name} not set on ${model.name}` },
              status: 404,
            })
          }

          const targetDoc = await db.get(field.relation!.target, targetId)
          if (!targetDoc) {
            return c.var.respond({
              error: { code: 'NOT_FOUND', message: `Related ${field.relation!.target} not found` },
              status: 404,
            })
          }

          return c.var.respond({
            data: useMetaFormat ? formatDocument(targetDoc, field.relation!.target, metaPrefix) : targetDoc,
          })
        })
      }
    }
  }

  // NOTE: MCP endpoint removed - tools are now served through unified /mcp endpoint
  // via McpToolRegistry in api.ts

  // ==========================================================================
  // Global /:id Routes — self-describing entity access
  // Infers type from ID prefix (e.g., contact_V1StG → Contact)
  // ==========================================================================

  // Build prefix → model lookup from schema
  const prefixToModel: Record<string, ParsedModel> = {}
  for (const model of Object.values(schema.models)) {
    prefixToModel[model.singular] = model
  }

  // GET /:id — resolve any entity by self-describing ID
  app.get(`${basePath}/:id{[a-zA-Z]+_[a-zA-Z0-9]+}`, async (c) => {
    const id = c.req.param('id')
    const prefix = id.split('_')[0] as string
    const model = prefixToModel[prefix]
    if (!model) {
      return c.var.respond({
        error: { code: 'NOT_FOUND', message: `Unknown entity type prefix: ${prefix}` },
        status: 404,
      })
    }

    const db = await getDatabase(c, config, inMemoryCache)
    const include = c.req.query('include')?.split(',')
    const doc = await db.get(model.name, id, { include })

    if (!doc) {
      return c.var.respond({
        error: { code: 'NOT_FOUND', message: `${model.name} not found` },
        status: 404,
      })
    }

    return c.var.respond({ data: useMetaFormat ? formatDocument(doc, model.name, metaPrefix) : doc })
  })

  // PUT /:id — update any entity by self-describing ID
  app.put(`${basePath}/:id{[a-zA-Z]+_[a-zA-Z0-9]+}`, async (c) => {
    const id = c.req.param('id')
    const prefix = id.split('_')[0] as string
    const model = prefixToModel[prefix]
    if (!model) {
      return c.var.respond({
        error: { code: 'NOT_FOUND', message: `Unknown entity type prefix: ${prefix}` },
        status: 404,
      })
    }

    let body: Record<string, unknown>
    try {
      body = await c.req.json()
    } catch {
      return c.var.respond({
        error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON', status: 400 },
        status: 400,
      })
    }

    // Strip meta fields from user input
    for (const key of Object.keys(body)) {
      if (key.startsWith('_') || key === 'id') delete body[key]
    }

    const validation = validateInput(model, body, false)
    if (!validation.valid) {
      return c.var.respond({
        error: { code: 'VALIDATION_ERROR', message: 'Input validation failed', details: validation.errors },
        status: 400,
      })
    }

    const db = await getDatabase(c, config, inMemoryCache)
    const ctx = getRequestContext(c)

    try {
      const doc = await db.update(model.name, id, body, ctx)
      return c.var.respond({ data: useMetaFormat ? formatDocument(doc, model.name, metaPrefix) : doc })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      if (err.message.includes('not found')) {
        return c.var.respond({ error: { code: 'NOT_FOUND', message: err.message }, status: 404 })
      }
      throw e
    }
  })

  // DELETE /:id — delete any entity by self-describing ID
  app.delete(`${basePath}/:id{[a-zA-Z]+_[a-zA-Z0-9]+}`, async (c) => {
    const id = c.req.param('id')
    const prefix = id.split('_')[0] as string
    const model = prefixToModel[prefix]
    if (!model) {
      return c.var.respond({
        error: { code: 'NOT_FOUND', message: `Unknown entity type prefix: ${prefix}` },
        status: 404,
      })
    }

    const db = await getDatabase(c, config, inMemoryCache)
    const ctx = getRequestContext(c)

    const existing = await db.get(model.name, id)
    if (!existing) {
      return c.var.respond({
        error: { code: 'NOT_FOUND', message: `${model.name} not found` },
        status: 404,
      })
    }

    await db.delete(model.name, id, ctx)

    return c.var.respond({ data: { deleted: true, id } })
  })

  // POST /:id/:verb — verb execution on any entity
  app.post(`${basePath}/:id{[a-zA-Z]+_[a-zA-Z0-9]+}/:verb`, async (c) => {
    const id = c.req.param('id')
    const verb = c.req.param('verb')
    const prefix = id.split('_')[0] as string
    const model = prefixToModel[prefix]
    if (!model) {
      return c.var.respond({
        error: { code: 'NOT_FOUND', message: `Unknown entity type prefix: ${prefix}` },
        status: 404,
      })
    }

    const db = await getDatabase(c, config, inMemoryCache)
    const doc = await db.get(model.name, id)
    if (!doc) {
      return c.var.respond({
        error: { code: 'NOT_FOUND', message: `${model.name} not found` },
        status: 404,
      })
    }

    // For now, verb execution updates the document with the verb payload
    // Future: integrate with digital-objects verb conjugation system
    const body = await c.req.json().catch(() => ({}))
    const ctx = getRequestContext(c)
    const updated = await db.update(model.name, id, { ...body, lastVerb: verb }, ctx)

    return c.var.respond({
      data: useMetaFormat ? formatDocument(updated, model.name, metaPrefix) : updated,
      meta: { verb },
    })
  })

  // ==========================================================================
  // Events Endpoint
  // ==========================================================================

  app.get('/events', async (c) => {
    const db = await getDatabase(c, config, inMemoryCache)
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

  return { routes: app, schema, mcpTools, typeRegistry: registry, sqids: sqidsInstance }
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
 * Parse query options from request
 *
 * Supports MongoDB-style filter operators via query params:
 *   ?stage=Lead              → { stage: 'Lead' }
 *   ?stage[$in]=Lead,Qual    → { stage: { $in: ['Lead', 'Qual'] } }
 *   ?value[$gt]=50000        → { value: { $gt: 50000 } }
 *   ?$sort=-value            → orderBy: [{ field: 'value', direction: 'desc' }]
 *   ?$limit=10&$offset=20    → { limit: 10, offset: 20 }
 */
function parseQueryOptions(c: { req: { query: (k: string) => string | undefined; url: string } }, defaultLimit: number, maxLimit: number): QueryOptions {
  const limitParam = c.req.query('$limit') || c.req.query('limit')
  const offsetParam = c.req.query('$offset') || c.req.query('offset')
  const limit = Math.min(parseInt(limitParam || String(defaultLimit), 10), maxLimit)
  const offset = parseInt(offsetParam || '0', 10)
  const sortParam = c.req.query('$sort') || c.req.query('orderBy') || c.req.query('sort')
  const include = c.req.query('include')?.split(',')
  const select = c.req.query('select')?.split(',')

  // Parse orderBy from $sort param: '-value' = desc, 'value' = asc
  let orderBy: string | { field: string; direction: 'asc' | 'desc' }[] | undefined
  if (sortParam) {
    const sortFields = sortParam.split(',').map((s) => {
      const trimmed = s.trim()
      if (trimmed.startsWith('-')) {
        return { field: trimmed.slice(1), direction: 'desc' as const }
      }
      return { field: trimmed, direction: 'asc' as const }
    })
    orderBy = sortFields
  }

  // Parse where from query params with operator support
  const where: Record<string, unknown> = {}
  const url = new URL(c.req.url, 'http://localhost')
  const reservedParams = new Set(['$limit', '$offset', '$sort', 'limit', 'offset', 'orderBy', 'sort', 'include', 'select', 'cursor', 'q'])

  for (const [rawKey, rawValue] of url.searchParams.entries()) {
    if (reservedParams.has(rawKey)) continue

    // Check for operator syntax: field[$op]=value
    const opMatch = rawKey.match(/^([^[]+)\[(\$\w+)\]$/)
    if (opMatch) {
      const field = opMatch[1]!
      const op = opMatch[2]!
      const parsed = parseFilterValue(rawValue, op)
      if (!where[field]) where[field] = {}
      ;(where[field] as Record<string, unknown>)[op] = parsed
    } else {
      // Simple key=value equality
      where[rawKey] = parseFilterValue(rawValue)
    }
  }

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
 * Parse a filter value, coercing types where appropriate
 */
function parseFilterValue(value: string, op?: string): unknown {
  // $in and $nin expect comma-separated lists
  if (op === '$in' || op === '$nin') {
    return value.split(',').map((v) => coerceValue(v.trim()))
  }
  return coerceValue(value)
}


/**
 * Get request context for audit trail
 */
function getRequestContext(c: { var: { requestId: string; user?: { id?: string } } }): RequestContext {
  return {
    userId: c.var.user?.id,
    requestId: c.var.requestId,
  }
}

/**
 * Format a document with the configured meta field prefix
 */
function formatDocument(doc: Document, modelName: string, prefix: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(doc)) {
    if (key === 'id') {
      result[`${prefix}id`] = value
    } else if (key === '_version') {
      result[`${prefix}version`] = value
    } else if (key === '_createdAt') {
      result[`${prefix}createdAt`] = value
    } else if (key === '_createdBy') {
      result[`${prefix}createdBy`] = value
    } else if (key === '_updatedAt') {
      result[`${prefix}updatedAt`] = value
    } else if (key === '_updatedBy') {
      result[`${prefix}updatedBy`] = value
    } else if (key === '_deletedAt') {
      result[`${prefix}deletedAt`] = value
    } else if (key === '_deletedBy') {
      result[`${prefix}deletedBy`] = value
    } else if (!key.startsWith('_')) {
      result[key] = value
    }
  }

  result[`${prefix}type`] = modelName

  return result
}

// =============================================================================
// Type Registry — bidirectional model name ↔ stable numeric ID
// =============================================================================

const DEFAULT_SQID_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Compute a deterministic version hash for a type registry.
 * This hash changes whenever the model-to-number mapping changes,
 * enabling decode-time validation that sqids were encoded with the same registry.
 *
 * Format: "v1:{sorted entries hash}" — allows future versioning of the hash scheme.
 */
export function computeTypeRegistryVersion(registry: TypeRegistry): string {
  // Sort entries for determinism regardless of insertion order
  const sorted = Object.entries(registry)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, num]) => `${name}:${num}`)
    .join(',')
  // Simple FNV-1a 32-bit hash for compactness
  let hash = 2166136261
  for (let i = 0; i < sorted.length; i++) {
    hash ^= sorted.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `v1:${(hash >>> 0).toString(36)}`
}

/**
 * Build a type registry from a parsed schema.
 * Each model gets a stable numeric ID based on insertion order (1-indexed).
 *
 * **Production**: Provide an explicit `typeRegistry` in config for stability across
 * schema changes. Auto-generated registries are insertion-order dependent — adding,
 * removing, or reordering models will change numeric IDs, breaking existing sqids.
 *
 * @returns forward/reverse maps plus a version hash for decode-time validation
 */
export function buildTypeRegistry(schema: ParsedSchema, explicit?: TypeRegistry): { forward: TypeRegistry; reverse: ReverseTypeRegistry; version: string } {
  const forward: TypeRegistry = {}
  const reverse: ReverseTypeRegistry = {}

  if (explicit) {
    for (const [name, num] of Object.entries(explicit)) {
      forward[name] = num
      reverse[num] = name
    }
    // Fill in any models not in the explicit registry
    let nextId = Math.max(0, ...Object.values(explicit)) + 1
    for (const name of Object.keys(schema.models)) {
      if (forward[name] === undefined) {
        forward[name] = nextId
        reverse[nextId] = name
        nextId++
      }
    }
  } else {
    // Auto-generate from schema insertion order (1-indexed)
    console.warn(
      '[sqid] WARNING: No explicit typeRegistry provided. Auto-generating from schema insertion order. ' +
      'This is UNSTABLE across schema changes — adding, removing, or reordering models will change numeric IDs ' +
      'and break existing sqids. For production, provide an explicit typeRegistry in your DatabaseConfig.'
    )
    let id = 1
    for (const name of Object.keys(schema.models)) {
      forward[name] = id
      reverse[id] = name
      id++
    }
  }

  const version = computeTypeRegistryVersion(forward)
  return { forward, reverse, version }
}

/**
 * Deterministic alphabet shuffle using a numeric seed (Fisher-Yates + LCG PRNG).
 * Use the GitHub org/user numeric ID as seed for per-org unique encoding.
 */
export function shuffleAlphabet(alphabet: string, seed: number): string {
  const arr = alphabet.split('')
  let s = seed >>> 0 // ensure unsigned 32-bit
  for (let i = arr.length - 1; i > 0; i--) {
    // Linear congruential generator (Numerical Recipes constants)
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const j = s % (i + 1)
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr.join('')
}

/**
 * Create a Sqids instance, optionally seeded per-org for unique encoding.
 */
export function createSqids(seed?: number, minLength = 8): Sqids {
  const alphabet = seed !== undefined ? shuffleAlphabet(DEFAULT_SQID_ALPHABET, seed) : DEFAULT_SQID_ALPHABET
  return new Sqids({ alphabet, minLength })
}

/**
 * Generate an ID using real sqids encoding.
 *
 * Without namespace: encodes [typeNum, timestamp, random]
 * With namespace:    encodes [typeNum, namespace, timestamp, random]
 *
 * Full ID: `{singular}_{sqidSegment}` (e.g., `contact_V1StGXR8`)
 */
function generateSqidId(modelSingular: string, typeNum: number, sqids: Sqids, namespace?: number): string {
  const timestamp = Date.now()
  const randomBytes = new Uint32Array(1)
  crypto.getRandomValues(randomBytes)
  const random = randomBytes[0]!
  const numbers = namespace !== undefined ? [typeNum, namespace, timestamp, random] : [typeNum, timestamp, random]
  const segment = sqids.encode(numbers)
  return `${modelSingular}_${segment}`
}

/**
 * Decode a sqid ID back to its components.
 *
 * Handles both formats:
 * - 3 numbers: [typeNum, timestamp, random] (no namespace)
 * - 4 numbers: [typeNum, namespace, timestamp, random]
 *
 * When `expectedRegistryVersion` is provided, the decoded type is validated against
 * the current registry. If the registry version at encode-time differs from the current
 * version, the type mapping may be wrong. Pass the version stored alongside the sqid
 * (e.g., from the `meta` table) to enable this check.
 */
export function decodeSqid(
  id: string,
  sqids: Sqids,
  reverse: ReverseTypeRegistry,
  options?: { expectedRegistryVersion?: string; currentRegistryVersion?: string },
): DecodedSqid | null {
  const underscoreIdx = id.indexOf('_')
  if (underscoreIdx === -1) return null

  // Validate registry version if both are provided
  if (options?.expectedRegistryVersion && options?.currentRegistryVersion) {
    if (options.expectedRegistryVersion !== options.currentRegistryVersion) {
      console.warn(
        `[sqid] Registry version mismatch during decode: id was encoded with registry version "${options.expectedRegistryVersion}" ` +
        `but current registry version is "${options.currentRegistryVersion}". Type mapping may be incorrect.`
      )
    }
  }

  const segment = id.slice(underscoreIdx + 1)
  const numbers = sqids.decode(segment)

  if (numbers.length === 4) {
    // [typeNum, namespace, timestamp, random]
    const typeNum = numbers[0]!
    const type = reverse[typeNum]
    if (!type) return null
    return { type, typeNum, namespace: numbers[1]!, timestamp: numbers[2]!, random: numbers[3]! }
  }

  if (numbers.length === 3) {
    // [typeNum, timestamp, random]
    const typeNum = numbers[0]!
    const type = reverse[typeNum]
    if (!type) return null
    return { type, typeNum, timestamp: numbers[1]!, random: numbers[2]! }
  }

  return null
}

/**
 * Generate an ID based on the configured format
 */
function generateId(modelSingular: string, format: string, typeNum?: number, sqids?: Sqids, namespace?: number): string {
  switch (format) {
    case 'sqid':
      if (sqids && typeNum !== undefined) {
        return generateSqidId(modelSingular, typeNum, sqids, namespace)
      }
      // Fallback if sqids not configured (shouldn't happen)
      return `${modelSingular}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
    case 'cuid':
      return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    case 'ulid':
      return generateUlid()
    case 'uuid':
      return crypto.randomUUID()
    default:
      return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}

function generateUlid(): string {
  const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  const time = Date.now()
  let timeStr = ''
  let t = time
  for (let i = 0; i < 10; i++) {
    timeStr = ENCODING[t % 32] + timeStr
    t = Math.floor(t / 32)
  }
  const arr = new Uint8Array(10)
  crypto.getRandomValues(arr)
  let randStr = ''
  for (let i = 0; i < 10; i++) {
    randStr += ENCODING[arr[i]! % 32]
  }
  return timeStr + randStr
}

// =============================================================================
// Database Client Interface
// =============================================================================

interface DatabaseRpcClient {
  create(model: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document>
  get(model: string, id: string, options?: { include?: string[] }): Promise<Document | null>
  update(model: string, id: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document>
  delete(model: string, id: string, ctx?: RequestContext): Promise<void>
  list(model: string, options?: QueryOptions): Promise<{ data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }>
  search(model: string, query: string, options?: QueryOptions): Promise<{ data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }>
  count(model: string, where?: Record<string, unknown>): Promise<number>
  getEvents?(options: { model?: string; since?: number; limit?: number }): Promise<DatabaseEvent[]>
}

/**
 * Get database client from context
 * This connects to the DO that stores the actual data
 */
async function getDatabase(c: { env: Record<string, unknown>; var: { requestId: string } }, config: DatabaseConfig, inMemoryCache: Map<string, DatabaseRpcClient>): Promise<DatabaseRpcClient> {
  const binding = config.binding || 'DB'
  const namespace = typeof config.namespace === 'function'
    ? config.namespace(c)
    : config.namespace || 'default'

  const doNamespace = c.env[binding] as DurableObjectNamespace | undefined

  if (!doNamespace) {
    // Fallback to in-memory for development/testing — cached per convention instance + namespace
    let db = inMemoryCache.get(namespace)
    if (!db) {
      db = createInMemoryDatabase()
      inMemoryCache.set(namespace, db)
    }
    return db
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
      if (!result.result) throw new Error('Unexpected empty response from DO for create')
      return result.result
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
      if (!result.result) throw new Error('Unexpected empty response from DO for update')
      return result.result
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
      if (!result.result) throw new Error('Unexpected empty response from DO for list')
      return result.result
    },

    async search(model, query, options) {
      const response = await stub.fetch('http://do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'search', params: { model, query, options } }),
      })
      const result = await response.json() as { result?: { data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }; error?: { message: string } }
      if (result.error) throw new Error(result.error.message)
      if (!result.result) throw new Error('Unexpected empty response from DO for search')
      return result.result
    },

    async count(model, where) {
      const response = await stub.fetch('http://do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'count', params: { model, where } }),
      })
      const result = await response.json() as { result?: number; error?: { message: string } }
      if (result.error) throw new Error(result.error.message)
      return result.result ?? 0
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

      // Apply where filter with operator support
      if (options?.where) {
        docs = docs.filter((doc) => matchesWhere(doc, options.where!))
      }

      // Apply orderBy
      if (options?.orderBy) {
        const sortFields = typeof options.orderBy === 'string'
          ? [{ field: options.orderBy, direction: 'asc' as const }]
          : Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy]
        const first = sortFields[0]
        if (first?.field) {
          docs.sort((a, b) => {
            const aVal = a[first.field]
            const bVal = b[first.field]
            const cmp = typeof aVal === 'number' && typeof bVal === 'number'
              ? aVal - bVal
              : String(aVal || '').localeCompare(String(bVal || ''))
            return first.direction === 'desc' ? -cmp : cmp
          })
        }
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

    async count(model, where) {
      const collection = getCollection(model)
      let docs = Array.from(collection.values()).filter((d) => !d._deletedAt)
      if (where) {
        docs = docs.filter((doc) => matchesWhere(doc, where))
      }
      return docs.length
    },
  }
}

