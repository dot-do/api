/**
 * DB Adapter
 *
 * Direct adapter from DB Durable Object → DatabaseRpcClient.
 * No ParqueDB intermediary — the DB DO handles all CRUD via SQLite,
 * ClickHouse handles analytics only.
 *
 * The DB DO is tenant-scoped via idFromName(), so this adapter resolves
 * model names to bare type names (e.g. Contact → 'contacts') without
 * tenant prefixes.
 */

import type { ParsedSchema, Document, QueryOptions, DatabaseEvent, RequestContext } from './types'

// =========================================================================
// DB DO Stub Interface
// =========================================================================

/**
 * DB DO stub interface matching the production DB class RPC methods.
 * All methods return canonical DBEntity shapes ($id, $type, $version, ...).
 */
export interface DBDOStub {
  find(type: string, filter?: Record<string, unknown>, options?: {
    limit?: number; offset?: number; sort?: Record<string, 1 | -1>
  }): Promise<{ items: Record<string, unknown>[]; total: number; hasMore: boolean }>
  get(type: string, id: string): Promise<Record<string, unknown> | null>
  findOne(type: string, filter?: Record<string, unknown>): Promise<Record<string, unknown> | null>
  create(type: string, data: Record<string, unknown>): Promise<Record<string, unknown>>
  update(type: string, id: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null>
  delete(type: string, id: string): Promise<{ deletedCount: number }>
  count(type: string, filter?: Record<string, unknown>): Promise<number>
}

// =========================================================================
// Helpers
// =========================================================================

/**
 * Strip tenant prefix from a namespace string.
 * '~acme/contacts' → 'contacts', 'contacts' → 'contacts'
 */
export function stripTenantPrefix(ns: string): string {
  if (ns.startsWith('~')) {
    const i = ns.indexOf('/')
    return i >= 0 ? ns.slice(i + 1) : ns
  }
  return ns
}

/**
 * Resolve the bare type name for a model.
 * Contact → contacts, Deal → deals (uses schema's plural form).
 */
function resolveType(schema: ParsedSchema, model: string): string {
  const parsed = schema.models[model]
  return parsed ? parsed.plural : model.toLowerCase()
}

// Meta field names to strip during entity transformation
const META_KEYS = new Set([
  '$id', '$type', '$version', '$createdAt', '$updatedAt', '$createdBy', '$updatedBy', '$deletedAt', '$deletedBy',
  '_version', '_createdAt', '_updatedAt', '_createdBy', '_updatedBy', '_deletedAt', '_deletedBy', '_context',
  'version', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'deletedAt', 'deletedBy',
])

/**
 * Convert a DB DO entity to a Document (internal format with _-prefixed meta).
 */
function entityToDocument(entity: Record<string, unknown>, context?: string): Document {
  const rawId = (entity.$id as string) || (entity.id as string) || ''
  const bareId = rawId.includes('/') ? rawId.slice(rawId.lastIndexOf('/') + 1) : rawId

  const doc: Document = {
    id: bareId,
    _version: (entity.$version as number) ?? (entity._version as number) ?? (entity.version as number) ?? 1,
    _createdAt: (entity.$createdAt as string) || (entity._createdAt as string) || (entity.createdAt as string) || '',
    _updatedAt: (entity.$updatedAt as string) || (entity._updatedAt as string) || (entity.updatedAt as string) || '',
    _createdBy: (entity.$createdBy as string) || (entity._createdBy as string) || (entity.createdBy as string) || undefined,
    _updatedBy: (entity.$updatedBy as string) || (entity._updatedBy as string) || (entity.updatedBy as string) || undefined,
    _deletedAt: (entity.$deletedAt as string) || (entity._deletedAt as string) || (entity.deletedAt as string) || null,
    _deletedBy: (entity.$deletedBy as string) || (entity._deletedBy as string) || (entity.deletedBy as string) || null,
    _context: context || (entity._context as string) || undefined,
  }
  for (const key in entity) {
    if (!META_KEYS.has(key) && key !== 'id') doc[key] = entity[key]
  }
  return doc
}

/**
 * Convert a DB DO entity directly to $-prefixed response format.
 * Single-pass transformation (no intermediate Document).
 */
function formatEntity(
  entity: Record<string, unknown>,
  modelName: string,
  prefix: string,
  context?: string,
): Record<string, unknown> {
  const rawId = (entity.$id as string) || (entity.id as string) || ''
  const bareId = rawId.includes('/') ? rawId.slice(rawId.lastIndexOf('/') + 1) : rawId

  const result: Record<string, unknown> = {
    [`${prefix}type`]: modelName,
    [`${prefix}id`]: bareId,
    [`${prefix}version`]: (entity.$version as number) ?? (entity._version as number) ?? (entity.version as number) ?? 1,
    [`${prefix}createdAt`]: (entity.$createdAt as string) || (entity._createdAt as string) || (entity.createdAt as string) || '',
    [`${prefix}updatedAt`]: (entity.$updatedAt as string) || (entity._updatedAt as string) || (entity.updatedAt as string) || '',
  }

  const createdBy = (entity.$createdBy as string) || (entity._createdBy as string) || (entity.createdBy as string)
  if (createdBy) result[`${prefix}createdBy`] = createdBy
  const updatedBy = (entity.$updatedBy as string) || (entity._updatedBy as string) || (entity.updatedBy as string)
  if (updatedBy) result[`${prefix}updatedBy`] = updatedBy
  const deletedAt = (entity.$deletedAt as string) || (entity._deletedAt as string) || (entity.deletedAt as string)
  if (deletedAt) result[`${prefix}deletedAt`] = deletedAt
  const deletedBy = (entity.$deletedBy as string) || (entity._deletedBy as string) || (entity.deletedBy as string)
  if (deletedBy) result[`${prefix}deletedBy`] = deletedBy
  if (context) result[`${prefix}context`] = context

  for (const key in entity) {
    if (!META_KEYS.has(key) && key !== 'id') result[key] = entity[key]
  }

  return result
}

function buildFilter(where?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!where || Object.keys(where).length === 0) return undefined
  return where
}

function buildSort(orderBy?: string | { field: string; direction: 'asc' | 'desc' }[]): Record<string, 1 | -1> | undefined {
  if (!orderBy) return undefined
  if (typeof orderBy === 'string') {
    const desc = orderBy.startsWith('-')
    const field = desc ? orderBy.slice(1) : orderBy
    return { [field]: desc ? -1 : 1 }
  }
  const sort: Record<string, 1 | -1> = {}
  for (const item of orderBy) {
    sort[item.field] = item.direction === 'desc' ? -1 : 1
  }
  return sort
}

/**
 * Build a search filter from a query string.
 * Searches all string-type fields in the model with $regex (case-insensitive).
 */
function buildSearchFilter(schema: ParsedSchema, model: string, query: string): Record<string, unknown> {
  const parsed = schema.models[model]
  if (!parsed) return { name: { $regex: query, $options: 'i' } }

  const stringFields = Object.entries(parsed.fields)
    .filter(([, f]) => f.type === 'string' || f.type === 'text')
    .map(([name]) => name)

  if (stringFields.length === 0) {
    return { name: { $regex: query, $options: 'i' } }
  }

  if (stringFields.length === 1) {
    return { [stringFields[0] as string]: { $regex: query, $options: 'i' } }
  }

  return {
    $or: stringFields.map((field) => ({ [field]: { $regex: query, $options: 'i' } })),
  }
}

// =========================================================================
// Create DB Adapter
// =========================================================================


/**
 * Create a DatabaseRpcClient backed by a DB Durable Object (direct RPC).
 * No ParqueDB intermediary — calls the DO's CRUD methods directly.
 *
 * @param stub - DB DO stub (via DurableObjectNamespace.get())
 * @param schema - Parsed schema for model-to-type resolution
 * @param tenantPrefix - Tenant isolation prefix (e.g. '~acme')
 */
export function createDBAdapter(stub: DBDOStub, schema: ParsedSchema, tenantPrefix: string) {
  const contextUrl = tenantPrefix ? `https://headless.ly/${tenantPrefix}` : 'https://headless.ly/~default'

  return {
    async create(model: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document> {
      const type = resolveType(schema, model)
      const input = { ...data } as Record<string, unknown>

      if (!input.$type) input.$type = model
      if (!input.name) {
        input.name = (input.subject as string) || (input.title as string) || (input.description as string) || model
      }
      if (ctx?.userId) {
        input.createdBy = ctx.userId
        input.updatedBy = ctx.userId
      }
      if (ctx?.requestId) input.requestId = ctx.requestId

      const entity = await stub.create(type, input)
      return entityToDocument(entity as Record<string, unknown>, contextUrl)
    },

    async get(model: string, id: string, _options?: { include?: string[] }): Promise<Document | null> {
      const type = resolveType(schema, model)

      const entity = await stub.get(type, id)
      if (entity) return entityToDocument(entity, contextUrl)

      // Fallback: find by user-set `id` field
      const result = await stub.find(type, { id }, { limit: 1 })
      if (result.items.length > 0) {
        return entityToDocument(result.items[0] as Record<string, unknown>, contextUrl)
      }

      return null
    },

    async update(model: string, id: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document> {
      const type = resolveType(schema, model)
      const updateData: Record<string, unknown> = { $set: { ...data } }
      if (ctx?.userId) (updateData.$set as Record<string, unknown>).updatedBy = ctx.userId

      let entity = await stub.update(type, id, updateData)

      // Fallback: find by user-set `id` field
      if (!entity) {
        const result = await stub.find(type, { id }, { limit: 1 })
        if (result.items.length > 0) {
          const internalId = (result.items[0] as Record<string, unknown>).$id as string
          entity = await stub.update(type, internalId, updateData)
        }
      }

      if (!entity) throw new Error(`Entity ${id} not found after update`)
      return entityToDocument(entity, contextUrl)
    },

    async delete(model: string, id: string, _ctx?: RequestContext): Promise<void> {
      const type = resolveType(schema, model)
      const result = await stub.delete(type, id)
      if (result.deletedCount > 0) return

      // Fallback: find by user-set `id` field
      const found = await stub.find(type, { id }, { limit: 1 })
      if (found.items.length > 0) {
        const internalId = (found.items[0] as Record<string, unknown>).$id as string
        await stub.delete(type, internalId)
      }
    },

    async list(model: string, options?: QueryOptions) {
      const type = resolveType(schema, model)
      const limit = options?.limit ?? 20
      const offset = options?.offset ?? 0

      const result = await stub.find(type, buildFilter(options?.where), {
        limit,
        offset,
        sort: buildSort(options?.orderBy),
      })

      return {
        data: (result.items || []).map((item) => entityToDocument(item as Record<string, unknown>, contextUrl)),
        total: result.total ?? 0,
        limit,
        offset,
        hasMore: result.hasMore,
      }
    },

    async search(model: string, query: string, options?: QueryOptions) {
      const type = resolveType(schema, model)
      const limit = options?.limit ?? 20
      const offset = options?.offset ?? 0
      const searchFilter = buildSearchFilter(schema, model, query)
      const existingFilter = buildFilter(options?.where)
      const combinedFilter = existingFilter ? { $and: [searchFilter, existingFilter] } : searchFilter

      const result = await stub.find(type, combinedFilter, {
        limit,
        offset,
        sort: buildSort(options?.orderBy),
      })

      return {
        data: (result.items || []).map((item) => entityToDocument(item as Record<string, unknown>, contextUrl)),
        total: result.total ?? 0,
        limit,
        offset,
        hasMore: result.hasMore,
      }
    },

    async count(model: string, where?: Record<string, unknown>): Promise<number> {
      const type = resolveType(schema, model)
      return stub.count(type, buildFilter(where))
    },

    async getEvents(): Promise<DatabaseEvent[]> {
      return []
    },

    async listFormatted(model: string, prefix: string, options?: QueryOptions) {
      const type = resolveType(schema, model)
      const limit = options?.limit ?? 20
      const offset = options?.offset ?? 0

      const result = await stub.find(type, buildFilter(options?.where), {
        limit,
        offset,
        sort: buildSort(options?.orderBy),
      })

      return {
        data: (result.items || []).map((item) => formatEntity(item as Record<string, unknown>, model, prefix, contextUrl)),
        total: result.total ?? 0,
        limit,
        offset,
        hasMore: result.hasMore,
      }
    },

    formatOne(model: string, prefix: string, doc: Document): Record<string, unknown> {
      return formatEntity(doc as unknown as Record<string, unknown>, model, prefix, contextUrl)
    },
  }
}
