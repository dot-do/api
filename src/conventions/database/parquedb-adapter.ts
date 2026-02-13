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
}

/**
 * Convert a ParqueDB entity (with $id, $type, createdAt, etc.) to a
 * @dotdo/api Document (with id, _version, _createdAt, etc.)
 */
function entityToDocument(entity: Record<string, unknown>, context?: string): Document {
  // ParqueDB entities use unprefixed field names (version, createdAt, etc.)
  // while some paths return $-prefixed names ($version, $createdAt).
  // Handle both conventions and destructure all meta fields out of ...rest
  // to prevent them appearing as duplicate data fields.
  const {
    $id, $type, $version, $createdAt, $updatedAt, $createdBy, $updatedBy, $deletedAt, $deletedBy,
    version, createdAt, updatedAt, createdBy, updatedBy, deletedAt, deletedBy,
    ...rest
  } = entity as Record<string, unknown> & {
    $id?: string; $type?: string; $version?: number
    $createdAt?: string; $updatedAt?: string; $createdBy?: string; $updatedBy?: string
    $deletedAt?: string; $deletedBy?: string
    version?: number; createdAt?: string; updatedAt?: string
    createdBy?: string; updatedBy?: string; deletedAt?: string; deletedBy?: string
  }

  // ParqueDB $id is "ns/id" (e.g. "~default/contacts/contact_abc") — extract just the entity id
  const rawId = ($id as string) || (entity.id as string) || ''
  const bareId = rawId.includes('/') ? rawId.slice(rawId.lastIndexOf('/') + 1) : rawId

  return {
    id: bareId,
    _version: ($version as number) ?? (version as number) ?? 1,
    _createdAt: ($createdAt as string) || (createdAt as string) || new Date().toISOString(),
    _updatedAt: ($updatedAt as string) || (updatedAt as string) || new Date().toISOString(),
    _createdBy: ($createdBy as string) || (createdBy as string) || undefined,
    _updatedBy: ($updatedBy as string) || (updatedBy as string) || undefined,
    _deletedAt: ($deletedAt as string) || (deletedAt as string) || null,
    _deletedBy: ($deletedBy as string) || (deletedBy as string) || null,
    _context: context || undefined,
    ...rest,
  }
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
  }
}
