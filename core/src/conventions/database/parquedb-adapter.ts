/**
 * ParqueDB Adapter
 *
 * Translates @dotdo/api's model-based DatabaseRpcClient operations
 * into namespace-based ParqueDB Worker RPC calls.
 *
 * ParqueDB stays schema-agnostic — this adapter handles:
 * - Model name -> namespace (e.g. Contact -> contacts)
 * - Tenant isolation via namespace prefix (e.g. ~acme/contacts)
 * - Entity field mapping ($id/$type/createdAt -> id/_version/_createdAt)
 * - Pagination format conversion
 * - Search query translation
 */

import type { ParsedSchema, Document, QueryOptions, DatabaseEvent, RequestContext } from './types'

/**
 * ParqueDB Worker RPC service interface.
 * Matches the public RPC methods on ParqueDBWorker (WorkerEntrypoint).
 * Defined here to avoid a hard dependency on @dotdo/db types.
 */
interface ParqueDBService {
  find<T = Record<string, unknown>>(
    ns: string,
    filter?: Record<string, unknown>,
    options?: { limit?: number; offset?: number; sort?: Record<string, 1 | -1>; cursor?: string }
  ): Promise<{ items: T[]; total?: number; hasMore: boolean; nextCursor?: string }>

  get<T = Record<string, unknown>>(ns: string, id: string): Promise<T | null>

  create<T = Record<string, unknown>>(ns: string, data: Partial<T>): Promise<T>

  update(
    ns: string,
    id: string,
    update: Record<string, unknown>
  ): Promise<{ matchedCount: number; modifiedCount: number }>

  delete(ns: string, id: string): Promise<{ deletedCount: number }>

  count(ns: string, filter?: Record<string, unknown>): Promise<number>

  link(fromNs: string, fromId: string, predicate: string, toNs: string, toId: string): Promise<void>
  unlink(fromNs: string, fromId: string, predicate: string, toNs: string, toId: string): Promise<void>
}

/**
 * ParqueDBDO stub interface for Durable Object RPC.
 * Matches the public methods on ParqueDBDO (via DurableObjectStub RPC).
 * Method names and signatures differ from ParqueDBService (WorkerEntrypoint).
 */
interface ParqueDBDOStub {
  find(ns: string, filter?: Record<string, unknown>, options?: {
    limit?: number; offset?: number; sort?: Record<string, 1 | -1>
  }): Promise<{ items: Record<string, unknown>[]; total: number; hasMore: boolean }>

  get(ns: string, id: string): Promise<Record<string, unknown> | null>

  create(ns: string, data: Record<string, unknown>, options?: Record<string, unknown>): Promise<Record<string, unknown>>

  update(ns: string, id: string, update: Record<string, unknown>, options?: Record<string, unknown>): Promise<Record<string, unknown>>

  delete(ns: string, id: string, options?: Record<string, unknown>): Promise<{ deletedCount: number }>

  countEntities(ns: string): Promise<number>

  link(fromId: string, predicate: string, toId: string): Promise<void>
  unlink(fromId: string, predicate: string, toId: string): Promise<void>
}

/**
 * Wrap a DatabaseDO stub (DurableObject RPC) as a ParqueDBService.
 * Adapts method names and return types to match the adapter's expected interface.
 */
export function createDOParqueDBService(stub: ParqueDBDOStub): ParqueDBService {
  return {
    find: (async (ns: string, filter?: Record<string, unknown>, options?: { limit?: number; offset?: number; sort?: Record<string, 1 | -1> }) => {
      return await stub.find(ns,
        (filter && Object.keys(filter).length > 0) ? filter : undefined,
        { limit: options?.limit, offset: options?.offset, sort: options?.sort },
      ) as never
    }),

    get: (async (ns: string, id: string) => {
      return await stub.get(ns, id) as never
    }),

    create: (async (ns: string, data: Record<string, unknown>) => {
      return await stub.create(ns, data) as never
    }),

    async update(ns, id, update) {
      const entity = await stub.update(ns, id, update)
      return { matchedCount: entity ? 1 : 0, modifiedCount: entity ? 1 : 0 }
    },

    async delete(ns, id) {
      return stub.delete(ns, id)
    },

    async count(ns, filter) {
      if (!filter || Object.keys(filter).length === 0) {
        return stub.countEntities(ns)
      }
      // Filtered count: use find() with filter and return total
      const result = await stub.find(ns, filter, { limit: 1 })
      return result.total
    },

    async link(fromNs, fromId, predicate, toNs, toId) {
      return stub.link(`${fromNs}/${fromId}`, predicate, `${toNs}/${toId}`)
    },

    async unlink(fromNs, fromId, predicate, toNs, toId) {
      return stub.unlink(`${fromNs}/${fromId}`, predicate, `${toNs}/${toId}`)
    },
  }
}

/**
 * DatabaseRpcClient interface (matches the private interface in index.ts)
 */
interface DatabaseRpcClient {
  create(model: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document>
  get(model: string, id: string, options?: { include?: string[] }): Promise<Document | null>
  update(model: string, id: string, data: Record<string, unknown>, ctx?: RequestContext): Promise<Document>
  delete(model: string, id: string, ctx?: RequestContext): Promise<void>
  list(model: string, options?: QueryOptions): Promise<{ data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }>
  search(model: string, query: string, options?: QueryOptions): Promise<{ data: Document[]; total: number; limit: number; offset: number; hasMore: boolean }>
  count(model: string, where?: Record<string, unknown>): Promise<number>
  getEvents?(options: { model?: string; since?: number; limit?: number }): Promise<DatabaseEvent[]>

  /**
   * List entities and format them directly to the final $-prefixed response shape.
   * Bypasses the intermediate Document representation — single-pass transformation.
   * Returns raw items for the convention to embed directly in the response envelope.
   */
  listFormatted?(
    model: string,
    prefix: string,
    options?: QueryOptions,
  ): Promise<{ data: Record<string, unknown>[]; total: number; limit: number; offset: number; hasMore: boolean }>

  /** Format a single entity directly to the final $-prefixed response shape. */
  formatOne?(model: string, prefix: string, doc: Document): Record<string, unknown>
}

// Meta field names to strip from ...rest during entity transformation.
// $-prefixed (ParqueDB), _-prefixed (Document), and unprefixed variants are all handled
// so entityToDocument is idempotent — calling it on a Document returns an equivalent Document.
const META_KEYS = new Set([
  '$id', '$type', '$version', '$createdAt', '$updatedAt', '$createdBy', '$updatedBy', '$deletedAt', '$deletedBy',
  '_version', '_createdAt', '_updatedAt', '_createdBy', '_updatedBy', '_deletedAt', '_deletedBy', '_context',
  'version', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'deletedAt', 'deletedBy',
])

/**
 * Convert a ParqueDB entity (with $id, $type, createdAt, etc.) to a
 * @dotdo/api Document (with id, _version, _createdAt, etc.)
 *
 * Also handles _-prefixed Document fields, making this function idempotent —
 * calling it on an already-converted Document returns an equivalent Document.
 * This is needed because the DO binding may return Documents directly (test DO)
 * or ParqueDB entities (production DO), and the adapter must handle both.
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
 * Convert a ParqueDB entity directly to the final $-prefixed response format.
 * Merges entityToDocument + formatDocument into a single pass — avoids
 * creating an intermediate Document object and iterating fields twice.
 *
 * @param entity - Raw ParqueDB entity (with $id, $type, createdAt, etc.)
 * @param modelName - Entity type name (e.g. 'Contact')
 * @param prefix - Meta field prefix (e.g. '$')
 * @param context - Tenant context URL (e.g. 'https://headless.ly/~acme')
 */
export function formatEntity(
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

/**
 * Resolve the ParqueDB namespace for a given model name.
 * Uses ParsedSchema.models[model].plural (e.g. Contact -> contacts).
 * Falls back to lowercase model name if not found in schema.
 */
function resolveNamespace(schema: ParsedSchema, model: string, tenantPrefix: string): string {
  const parsed = schema.models[model]
  const collection = parsed ? parsed.plural : model.toLowerCase()
  return tenantPrefix ? `${tenantPrefix}/${collection}` : collection
}

/**
 * Convert QueryOptions.where to a ParqueDB filter.
 * @dotdo/api uses MongoDB-style operators ($eq, $gt, $in, etc.)
 * which ParqueDB also supports, so mostly pass-through.
 */
function buildFilter(where?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!where || Object.keys(where).length === 0) return undefined
  return where
}

/**
 * Convert QueryOptions.orderBy to ParqueDB sort format.
 */
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

/** Returns true if the error indicates a missing/empty collection (no parquet file yet). */
function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /file not found|not found|does not exist|no such/i.test(msg)
}

const EMPTY_LIST = { data: [] as Document[], total: 0, limit: 20, offset: 0, hasMore: false }

/**
 * Create a DatabaseRpcClient backed by a ParqueDB Worker service binding.
 *
 * @param service - The ParqueDB Worker service binding (env.PARQUEDB)
 * @param schema - Parsed schema for model-to-namespace resolution
 * @param tenantPrefix - Tenant isolation prefix (e.g. '~acme')
 */
export function createParqueDBAdapter(service: ParqueDBService, schema: ParsedSchema, tenantPrefix: string): DatabaseRpcClient {
  // Build context URL from tenant prefix (e.g. '~acme' → 'https://headless.ly/~acme')
  const contextUrl = tenantPrefix ? `https://headless.ly/${tenantPrefix}` : 'https://headless.ly/~default'

  // CDC event logging is handled internally by DatabaseDO (EventLogger writes to SQLite WAL).
  // The adapter does NOT log events — doing so would add a redundant RPC round-trip per mutation.

  return {
    async create(model, data, ctx) {
      const ns = resolveNamespace(schema, model, tenantPrefix)
      const input = { ...data } as Record<string, unknown>

      // ParqueDB DO requires $type on every entity
      if (!input.$type) input.$type = model

      // ParqueDB requires a `name` field on every entity — derive from common display fields
      if (!input.name) {
        input.name = (input.subject as string) || (input.title as string) || (input.description as string) || model
      }

      if (ctx?.userId) {
        input.createdBy = ctx.userId
        input.updatedBy = ctx.userId
      }
      if (ctx?.requestId) input.requestId = ctx.requestId

      const entity = await service.create(ns, input)
      return entityToDocument(entity as Record<string, unknown>, contextUrl)
    },

    async get(model, id) {
      const ns = resolveNamespace(schema, model, tenantPrefix)

      // Try 1: direct get by bare id
      try {
        const entity = await service.get(ns, id)
        if (entity) return entityToDocument(entity as Record<string, unknown>, contextUrl)
      } catch (err) {
        if (!isNotFoundError(err)) throw err
      }

      // Try 2: get by namespace-qualified id (ParqueDB stores ids as ns/id)
      try {
        const qualifiedId = `${ns}/${id}`
        const entity = await service.get(ns, qualifiedId)
        if (entity) return entityToDocument(entity as Record<string, unknown>, contextUrl)
      } catch (err) {
        if (!isNotFoundError(err)) throw err
      }

      return null
    },

    async update(model, id, data, ctx) {
      const ns = resolveNamespace(schema, model, tenantPrefix)
      const updateData: Record<string, unknown> = { $set: { ...data } }

      if (ctx?.userId) (updateData.$set as Record<string, unknown>).updatedBy = ctx.userId

      // Try direct update by bare id
      try {
        await service.update(ns, id, updateData)
      } catch (err) {
        if (!isNotFoundError(err)) throw err
        // Try namespace-qualified id
        try {
          await service.update(ns, `${ns}/${id}`, updateData)
        } catch (err2) {
          if (!isNotFoundError(err2)) throw err2
          // Fallback: find entity by user-set `id` field, update using internal ID
          const result = await service.find(ns, { id: id }, { limit: 1 })
          if (!result.items.length) throw new Error(`Entity ${id} not found`)
          const entity = result.items[0] as Record<string, unknown>
          const internalId = (entity.$id as string) || (entity.id as string) || id
          await service.update(ns, internalId, updateData)
        }
      }

      // Re-fetch to return the updated Document
      const doc = await this.get(model, id)
      if (!doc) throw new Error(`Entity ${id} not found after update`)
      return doc
    },

    async delete(model, id) {
      const ns = resolveNamespace(schema, model, tenantPrefix)
      // Try direct delete by bare id
      try {
        await service.delete(ns, id)
        return
      } catch (err) {
        if (!isNotFoundError(err)) throw err
      }
      // Try namespace-qualified id
      try {
        await service.delete(ns, `${ns}/${id}`)
        return
      } catch (err) {
        if (!isNotFoundError(err)) throw err
      }
      // Fallback: find entity by user-set `id` field, delete using internal ID
      try {
        const result = await service.find(ns, { id: id }, { limit: 1 })
        if (!result.items.length) return // Already gone
        const entity = result.items[0] as Record<string, unknown>
        const internalId = (entity.$id as string) || (entity.id as string) || id
        await service.delete(ns, internalId)
      } catch (err) {
        if (!isNotFoundError(err)) throw err
      }
    },

    async list(model, options) {
      const ns = resolveNamespace(schema, model, tenantPrefix)
      const limit = options?.limit ?? 20
      const offset = options?.offset ?? 0

      try {
        const result = await service.find(ns, buildFilter(options?.where), {
          limit,
          offset,
          sort: buildSort(options?.orderBy),
          cursor: options?.cursor,
        })

        return {
          data: (result.items || []).map((item) => entityToDocument(item as Record<string, unknown>, contextUrl)),
          total: result.total ?? 0,
          limit,
          offset,
          hasMore: result.hasMore,
        }
      } catch (err) {
        if (isNotFoundError(err)) return { ...EMPTY_LIST, limit, offset }
        throw err
      }
    },

    async search(model, query, options) {
      const ns = resolveNamespace(schema, model, tenantPrefix)
      const limit = options?.limit ?? 20
      const offset = options?.offset ?? 0
      const searchFilter = buildSearchFilter(schema, model, query)

      // Merge search filter with any existing where clause
      const existingFilter = buildFilter(options?.where)
      const combinedFilter = existingFilter ? { $and: [searchFilter, existingFilter] } : searchFilter

      try {
        const result = await service.find(ns, combinedFilter, {
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
      } catch (err) {
        if (isNotFoundError(err)) return { ...EMPTY_LIST, limit, offset }
        throw err
      }
    },

    async count(model, where) {
      const ns = resolveNamespace(schema, model, tenantPrefix)
      try {
        return await service.count(ns, buildFilter(where))
      } catch (err) {
        if (isNotFoundError(err)) return 0
        throw err
      }
    },

    async getEvents() {
      // CDC events live in the DO's SQLite WAL (managed by EventLogger),
      // not in a ParqueDB namespace. Return empty — callers that need
      // real events should query the DO's /events endpoint directly.
      return []
    },

    async listFormatted(model, prefix, options) {
      const ns = resolveNamespace(schema, model, tenantPrefix)
      const limit = options?.limit ?? 20
      const offset = options?.offset ?? 0

      try {
        const result = await service.find(ns, buildFilter(options?.where), {
          limit,
          offset,
          sort: buildSort(options?.orderBy),
          cursor: options?.cursor,
        })

        return {
          data: (result.items || []).map((item) => formatEntity(item as Record<string, unknown>, model, prefix, contextUrl)),
          total: result.total ?? 0,
          limit,
          offset,
          hasMore: result.hasMore,
        }
      } catch (err) {
        if (isNotFoundError(err)) return { ...EMPTY_LIST, limit, offset }
        throw err
      }
    },

    formatOne(model, prefix, doc) {
      return formatEntity(doc as unknown as Record<string, unknown>, model, prefix, contextUrl)
    },
  }
}
