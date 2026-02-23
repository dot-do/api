/**
 * Reference Data Lookups Sub-module
 *
 * Handles read-only reference data APIs (GeoNames, country codes, ZIP codes, etc.)
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv } from '../../types'
import type {
  FunctionsConfig,
  LookupDef,
} from './types'
import {
  type McpTool,
  getCacheValue,
  setCacheValue,
} from './utils'

// =============================================================================
// Lookup Data Source Helpers
// =============================================================================

async function queryLookupSource(
  c: Context<ApiEnv>,
  lookup: LookupDef,
  options: { limit: number; offset: number }
): Promise<unknown[]> {
  switch (lookup.source.type) {
    case 'static':
      return (lookup.source.data || []).slice(options.offset, options.offset + options.limit)

    case 'database': {
      const db = (c.env as Record<string, D1Database>)[lookup.source.binding || 'DB']
      if (!db) return []
      const table = lookup.source.name || lookup.name
      const result = await db.prepare(`SELECT * FROM ${table} LIMIT ? OFFSET ?`).bind(options.limit, options.offset).all()
      return result.results || []
    }

    case 'kv': {
      const kv = (c.env as Record<string, KVNamespace>)[lookup.source.binding || 'KV']
      if (!kv) return []
      const prefix = lookup.source.name || lookup.name
      const list = await kv.list({ prefix: `${prefix}:`, limit: options.limit })
      const items = await Promise.all(list.keys.map((k) => kv.get(k.name, 'json')))
      return items.filter(Boolean)
    }

    default:
      return []
  }
}

async function searchLookupSource(
  c: Context<ApiEnv>,
  lookup: LookupDef,
  query: string,
  limit: number
): Promise<unknown[]> {
  const q = query.toLowerCase()

  switch (lookup.source.type) {
    case 'static': {
      const fields = lookup.search?.fields || lookup.fields.filter((f) => f.indexed).map((f) => f.name)
      return (lookup.source.data || []).filter((item) => {
        const record = item as Record<string, unknown>
        return fields.some((field) => String(record[field] || '').toLowerCase().includes(q))
      }).slice(0, limit)
    }

    case 'database': {
      const db = (c.env as Record<string, D1Database>)[lookup.source.binding || 'DB']
      if (!db) return []
      const table = lookup.source.name || lookup.name
      const fields = lookup.search?.fields || lookup.fields.filter((f) => f.indexed).map((f) => f.name)
      const where = fields.map((f) => `${f} LIKE ?`).join(' OR ')
      const params = fields.map(() => `%${query}%`)
      const result = await db.prepare(`SELECT * FROM ${table} WHERE ${where} LIMIT ?`).bind(...params, limit).all()
      return result.results || []
    }

    default:
      return []
  }
}

async function autocompleteLookupSource(
  c: Context<ApiEnv>,
  lookup: LookupDef,
  query: string,
  limit: number
): Promise<unknown[]> {
  const field = lookup.autocomplete?.field || lookup.primaryKey
  const q = query.toLowerCase()

  switch (lookup.source.type) {
    case 'static': {
      return (lookup.source.data || []).filter((item) => {
        const value = String((item as Record<string, unknown>)[field] || '').toLowerCase()
        return value.startsWith(q)
      }).slice(0, limit)
    }

    case 'database': {
      const db = (c.env as Record<string, D1Database>)[lookup.source.binding || 'DB']
      if (!db) return []
      const table = lookup.source.name || lookup.name
      const result = await db.prepare(`SELECT * FROM ${table} WHERE ${field} LIKE ? LIMIT ?`).bind(`${query}%`, limit).all()
      return result.results || []
    }

    default:
      return []
  }
}

async function getLookupById(
  c: Context<ApiEnv>,
  lookup: LookupDef,
  id: string
): Promise<unknown | null> {
  switch (lookup.source.type) {
    case 'static':
      return (lookup.source.data || []).find((item) => (item as Record<string, unknown>)[lookup.primaryKey] === id) || null

    case 'database': {
      const db = (c.env as Record<string, D1Database>)[lookup.source.binding || 'DB']
      if (!db) return null
      const table = lookup.source.name || lookup.name
      return db.prepare(`SELECT * FROM ${table} WHERE ${lookup.primaryKey} = ?`).bind(id).first()
    }

    case 'kv': {
      const kv = (c.env as Record<string, KVNamespace>)[lookup.source.binding || 'KV']
      if (!kv) return null
      const prefix = lookup.source.name || lookup.name
      return kv.get(`${prefix}:${id}`, 'json')
    }

    default:
      return null
  }
}

// =============================================================================
// Request Handlers
// =============================================================================

export function createLookupListHandler(lookup: LookupDef, _config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const limit = parseInt(c.req.query('limit') || '20', 10)
    const offset = parseInt(c.req.query('offset') || '0', 10)

    try {
      const data = await queryLookupSource(c, lookup, { limit, offset })
      return c.var.respond({ data, meta: { limit, offset } })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'LOOKUP_ERROR' },
        status: 500,
      })
    }
  }
}

export function createLookupSearchHandler(lookup: LookupDef, _config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const query = c.req.query('q') || ''
    const limit = parseInt(c.req.query('limit') || String(lookup.search?.limit || 20), 10)

    if (lookup.search?.minLength && query.length < lookup.search.minLength) {
      return c.var.respond({
        error: { message: `Query must be at least ${lookup.search.minLength} characters`, code: 'QUERY_TOO_SHORT' },
        status: 400,
      })
    }

    try {
      const data = await searchLookupSource(c, lookup, query, limit)
      return c.var.respond({ data, meta: { query, limit } })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'LOOKUP_ERROR' },
        status: 500,
      })
    }
  }
}

export function createLookupAutocompleteHandler(lookup: LookupDef, _config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const query = c.req.query('q') || ''
    const limit = parseInt(c.req.query('limit') || String(lookup.autocomplete?.limit || 10), 10)

    if (lookup.autocomplete?.minLength && query.length < lookup.autocomplete.minLength) {
      return c.var.respond({ data: [] })
    }

    try {
      const data = await autocompleteLookupSource(c, lookup, query, limit)
      return c.var.respond({ data })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'LOOKUP_ERROR' },
        status: 500,
      })
    }
  }
}

export function createLookupGetHandler(lookup: LookupDef, config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const id = c.req.param('id')

    // Check cache
    if (lookup.cache) {
      const cacheKey = `lookup:${lookup.name}:${id}`
      const cached = await getCacheValue(c, config, cacheKey)
      if (cached !== null) {
        return c.var.respond({ data: cached, meta: { cached: true } })
      }
    }

    try {
      const data = await getLookupById(c, lookup, id)

      if (!data) {
        return c.var.respond({
          error: { message: `${lookup.name} not found`, code: 'NOT_FOUND' },
          status: 404,
        })
      }

      // Transform
      const result = lookup.transform ? lookup.transform(data) : data

      // Cache
      if (lookup.cache) {
        const cacheKey = `lookup:${lookup.name}:${id}`
        setCacheValue(c, config, cacheKey, result, lookup.cache.ttl).catch(() => {})
      }

      return c.var.respond({ data: result })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'LOOKUP_ERROR' },
        status: 500,
      })
    }
  }
}

// =============================================================================
// Route Registration
// =============================================================================

export function registerLookupRoutes(
  app: Hono<ApiEnv>,
  config: FunctionsConfig,
  mcpTools: McpTool[]
): void {
  const basePath = config.basePath || ''

  if (config.lookups) {
    for (const lookup of config.lookups) {
      const lookupPath = `${basePath}/${lookup.name}`

      // GET /{name} - list/search
      app.get(lookupPath, createLookupListHandler(lookup, config))

      // GET /{name}/search?q=... - search
      app.get(`${lookupPath}/search`, createLookupSearchHandler(lookup, config))

      // GET /{name}/autocomplete?q=... - autocomplete
      if (lookup.autocomplete) {
        app.get(`${lookupPath}/autocomplete`, createLookupAutocompleteHandler(lookup, config))
      }

      // GET /{name}/:id - get by ID
      app.get(`${lookupPath}/:id`, createLookupGetHandler(lookup, config))

      mcpTools.push({
        name: `${lookup.name}.get`,
        description: `Get ${lookup.name} by ${lookup.primaryKey}`,
        inputSchema: {
          type: 'object',
          properties: { [lookup.primaryKey]: { type: 'string' } },
          required: [lookup.primaryKey],
        },
      })

      mcpTools.push({
        name: `${lookup.name}.search`,
        description: `Search ${lookup.name}`,
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['query'],
        },
      })
    }
  }
}
