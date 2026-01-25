/**
 * mongo.example.com.ai - MongoDB at the Edge
 *
 * Uses AutoRouter for clean JSON responses.
 * DO SQLite for document storage with MongoDB-compatible API.
 * Uses DO RPC for direct method calls.
 * Includes detailed latency metrics for all operations.
 */

import { AutoRouter } from 'itty-router'
import { DurableObject } from 'cloudflare:workers'

// =============================================================================
// Types
// =============================================================================

interface Env {
  MONGODB: DurableObjectNamespace<MongoDB>
}

interface Document {
  _id: string
  [key: string]: unknown
}

interface Timing {
  workerColo: string
  doColo: string
  queryMs: number
  rpcMs: number
  totalMs: number
}

interface QueryResult<T = unknown> {
  data: T
  queryMs: number
  doColo: string
}

// =============================================================================
// MongoDB Durable Object with RPC Methods
// =============================================================================

export class MongoDB extends DurableObject {
  private sqlStorage: SqlStorage
  private colo: string = 'unknown'
  private initialized = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sqlStorage = ctx.storage.sql
  }

  private async init(): Promise<void> {
    if (this.initialized) return

    // Fetch DO colo in parallel with init
    const coloPromise = fetch('https://workers.cloudflare.com/cf.json')
      .then(r => r.json())
      .then((cf: { colo?: string }) => { this.colo = cf.colo || 'unknown' })
      .catch(() => {})

    // Create collections metadata table
    this.sqlStorage.exec(`
      CREATE TABLE IF NOT EXISTS __collections (
        name TEXT PRIMARY KEY,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Create default 'products' collection
    this.sqlStorage.exec(`
      CREATE TABLE IF NOT EXISTS products (
        _id TEXT PRIMARY KEY,
        doc TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT
      )
    `)
    this.sqlStorage.exec(`
      INSERT OR IGNORE INTO __collections (name) VALUES ('products')
    `)

    // Seed with sample data if empty
    const count = [...this.sqlStorage.exec('SELECT COUNT(*) as c FROM products')][0].c as number
    if (count === 0) {
      const samples = [
        { _id: 'prod-1', name: 'Widget A', category: 'electronics', price: 29.99, inStock: true },
        { _id: 'prod-2', name: 'Widget B', category: 'electronics', price: 49.99, inStock: true },
        { _id: 'prod-3', name: 'T-Shirt', category: 'clothing', price: 19.99, inStock: false },
      ]
      for (const doc of samples) {
        this.sqlStorage.exec(
          `INSERT INTO products (_id, doc) VALUES (?, ?)`,
          doc._id, JSON.stringify(doc)
        )
      }
    }

    await coloPromise
    this.initialized = true
  }

  private ensureCollection(name: string): void {
    // Create collection table if not exists
    this.sqlStorage.exec(`
      CREATE TABLE IF NOT EXISTS "${name}" (
        _id TEXT PRIMARY KEY,
        doc TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT
      )
    `)
    this.sqlStorage.exec(
      `INSERT OR IGNORE INTO __collections (name) VALUES (?)`,
      name
    )
  }

  // ============================================================================
  // RPC Methods - MongoDB-compatible API
  // ============================================================================

  /** List all collections */
  async listCollections(): Promise<QueryResult<{ collections: string[] }>> {
    await this.init()
    const start = performance.now()
    const rows = [...this.sqlStorage.exec('SELECT name FROM __collections ORDER BY name')]
    return {
      data: { collections: rows.map(r => r.name as string) },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Find documents in a collection */
  async find(
    collection: string,
    filter?: Record<string, unknown>,
    options?: { limit?: number; skip?: number }
  ): Promise<QueryResult<{ documents: Document[]; count: number }>> {
    await this.init()
    this.ensureCollection(collection)

    const start = performance.now()
    let rows = [...this.sqlStorage.exec(`SELECT doc FROM "${collection}"`)]
    let docs = rows.map(r => JSON.parse(r.doc as string) as Document)

    // Apply filter
    if (filter && Object.keys(filter).length > 0) {
      docs = docs.filter(doc => {
        for (const [key, value] of Object.entries(filter)) {
          // Handle $eq, $ne, $gt, $gte, $lt, $lte operators
          if (typeof value === 'object' && value !== null) {
            const ops = value as Record<string, unknown>
            const docValue = doc[key]
            if ('$eq' in ops && docValue !== ops.$eq) return false
            if ('$ne' in ops && docValue === ops.$ne) return false
            if ('$gt' in ops && !(docValue as number > (ops.$gt as number))) return false
            if ('$gte' in ops && !(docValue as number >= (ops.$gte as number))) return false
            if ('$lt' in ops && !(docValue as number < (ops.$lt as number))) return false
            if ('$lte' in ops && !(docValue as number <= (ops.$lte as number))) return false
            if ('$in' in ops && !(ops.$in as unknown[]).includes(docValue)) return false
          } else if (doc[key] !== value) {
            return false
          }
        }
        return true
      })
    }

    const total = docs.length
    if (options?.skip) docs = docs.slice(options.skip)
    if (options?.limit) docs = docs.slice(0, options.limit)

    return {
      data: { documents: docs, count: total },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Find one document */
  async findOne(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<QueryResult<Document | null>> {
    await this.init()
    this.ensureCollection(collection)

    const start = performance.now()
    const result = await this.find(collection, filter, { limit: 1 })
    return {
      data: result.data.documents[0] || null,
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Insert one document */
  async insertOne(
    collection: string,
    doc: Record<string, unknown>
  ): Promise<QueryResult<{ insertedId: string; document: Document }>> {
    await this.init()
    this.ensureCollection(collection)

    const start = performance.now()
    const _id = (doc._id as string) || `${collection}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const fullDoc: Document = { ...doc, _id }

    this.sqlStorage.exec(
      `INSERT INTO "${collection}" (_id, doc) VALUES (?, ?)`,
      _id, JSON.stringify(fullDoc)
    )

    return {
      data: { insertedId: _id, document: fullDoc },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Update one document */
  async updateOne(
    collection: string,
    filter: Record<string, unknown>,
    update: { $set?: Record<string, unknown>; $unset?: Record<string, unknown> }
  ): Promise<QueryResult<{ matchedCount: number; modifiedCount: number }>> {
    await this.init()
    this.ensureCollection(collection)

    const start = performance.now()
    const findResult = await this.findOne(collection, filter)
    if (!findResult.data) {
      return {
        data: { matchedCount: 0, modifiedCount: 0 },
        queryMs: Math.round((performance.now() - start) * 100) / 100,
        doColo: this.colo,
      }
    }

    const doc = { ...findResult.data }
    if (update.$set) {
      for (const [key, value] of Object.entries(update.$set)) {
        doc[key] = value
      }
    }
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) {
        delete doc[key]
      }
    }

    this.sqlStorage.exec(
      `UPDATE "${collection}" SET doc = ?, updated_at = datetime('now') WHERE _id = ?`,
      JSON.stringify(doc), doc._id
    )

    return {
      data: { matchedCount: 1, modifiedCount: 1 },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Delete one document */
  async deleteOne(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<QueryResult<{ deletedCount: number; document: Document | null }>> {
    await this.init()
    this.ensureCollection(collection)

    const start = performance.now()
    const findResult = await this.findOne(collection, filter)
    if (!findResult.data) {
      return {
        data: { deletedCount: 0, document: null },
        queryMs: Math.round((performance.now() - start) * 100) / 100,
        doColo: this.colo,
      }
    }

    this.sqlStorage.exec(`DELETE FROM "${collection}" WHERE _id = ?`, findResult.data._id)

    return {
      data: { deletedCount: 1, document: findResult.data },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Get collection stats */
  async stats(collection: string): Promise<QueryResult<{ count: number; collection: string }>> {
    await this.init()
    this.ensureCollection(collection)

    const start = performance.now()
    const rows = [...this.sqlStorage.exec(`SELECT COUNT(*) as c FROM "${collection}"`)]
    return {
      data: { count: rows[0].c as number, collection },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Aggregate documents */
  async aggregate(
    collection: string,
    pipeline: Array<Record<string, unknown>>
  ): Promise<QueryResult<{ results: unknown[] }>> {
    await this.init()
    this.ensureCollection(collection)

    const start = performance.now()
    let rows = [...this.sqlStorage.exec(`SELECT doc FROM "${collection}"`)]
    let docs = rows.map(r => JSON.parse(r.doc as string) as Document)

    // Simple aggregation pipeline support
    for (const stage of pipeline) {
      if ('$match' in stage) {
        const filter = stage.$match as Record<string, unknown>
        docs = docs.filter(doc => {
          for (const [key, value] of Object.entries(filter)) {
            if (doc[key] !== value) return false
          }
          return true
        })
      }
      if ('$limit' in stage) {
        docs = docs.slice(0, stage.$limit as number)
      }
      if ('$skip' in stage) {
        docs = docs.slice(stage.$skip as number)
      }
      if ('$group' in stage) {
        const groupSpec = stage.$group as Record<string, unknown>
        const groupKey = groupSpec._id as string
        const groups: Map<unknown, Record<string, unknown>> = new Map()

        for (const doc of docs) {
          const keyValue = groupKey.startsWith('$') ? doc[groupKey.slice(1)] : groupKey
          if (!groups.has(keyValue)) {
            groups.set(keyValue, { _id: keyValue })
          }
          const group = groups.get(keyValue)!

          for (const [field, expr] of Object.entries(groupSpec)) {
            if (field === '_id') continue
            const e = expr as Record<string, unknown>
            if ('$sum' in e) {
              const sumField = (e.$sum as string).slice(1)
              group[field] = ((group[field] as number) || 0) + ((doc[sumField] as number) || 0)
            }
            if ('$count' in e) {
              group[field] = ((group[field] as number) || 0) + 1
            }
          }
        }

        docs = [...groups.values()] as Document[]
      }
    }

    return {
      data: { results: docs },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }
}

// =============================================================================
// Router with RPC Calls
// =============================================================================

const router = AutoRouter()

const db = (env: Env) => env.MONGODB.get(env.MONGODB.idFromName('default'))

const withTiming = <T>(
  workerColo: string,
  result: QueryResult<T>,
  rpcMs: number,
  totalMs: number,
  status = 200
): Response => {
  const timing: Timing = {
    workerColo,
    doColo: result.doColo,
    queryMs: result.queryMs,
    rpcMs: Math.round(rpcMs * 100) / 100,
    totalMs: Math.round(totalMs * 100) / 100,
  }
  return Response.json({ ...result.data as object, timing }, { status })
}

const getColo = (req: Request): string => {
  const cf = (req as unknown as { cf?: { colo?: string } }).cf
  return cf?.colo || 'unknown'
}

router.get('/', (req) => {
  const base = new URL(req.url).origin
  const workerColo = getColo(req)

  return {
    name: 'mongo.example.com.ai',
    description: 'MongoDB at the Edge - DO SQLite with MongoDB-compatible API',
    workerColo,
    links: {
      'Collections': `${base}/collections`,
      'List Products': `${base}/products`,
      'Product Stats': `${base}/products/stats`,
      'Aggregate Example': `${base}/products/aggregate`,
    },
    timing: {
      note: 'All endpoints return detailed timing info via DO RPC',
      fields: {
        workerColo: 'Cloudflare datacenter running the Worker',
        doColo: 'Cloudflare datacenter running the Durable Object',
        queryMs: 'Query execution time (ms)',
        rpcMs: 'Worker to DO RPC call time (ms)',
        totalMs: 'Total request latency (ms)',
      },
    },
  }
})

router.get('/collections', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).listCollections()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.get('/:collection', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const collection = req.params.collection
  const url = new URL(req.url)

  // Parse filter from query params
  const filter: Record<string, unknown> = {}
  for (const [key, value] of url.searchParams) {
    if (key === 'limit' || key === 'skip') continue
    filter[key] = isNaN(Number(value)) ? value : Number(value)
  }

  const options = {
    limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
    skip: url.searchParams.get('skip') ? parseInt(url.searchParams.get('skip')!) : undefined,
  }

  const rpcStart = performance.now()
  const result = await db(env).find(collection, Object.keys(filter).length > 0 ? filter : undefined, options)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.get('/:collection/stats', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const collection = req.params.collection

  const rpcStart = performance.now()
  const result = await db(env).stats(collection)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.get('/:collection/aggregate', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const collection = req.params.collection

  // Example aggregation: group by category with count
  const pipeline = [
    { $group: { _id: '$category', count: { $count: {} }, totalPrice: { $sum: '$price' } } },
  ]

  const rpcStart = performance.now()
  const result = await db(env).aggregate(collection, pipeline)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.get('/:collection/:id', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const { collection, id } = req.params

  const rpcStart = performance.now()
  const result = await db(env).findOne(collection, { _id: id })
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  if (!result.data) {
    return Response.json({ error: 'Not found', timing: { workerColo, doColo: result.doColo, queryMs: result.queryMs, rpcMs: Math.round(rpcMs * 100) / 100, totalMs: Math.round(totalMs * 100) / 100 } }, { status: 404 })
  }
  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.post('/:collection', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const collection = req.params.collection
  const doc = await req.json() as Record<string, unknown>

  const rpcStart = performance.now()
  const result = await db(env).insertOne(collection, doc)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs, 201)
})

router.patch('/:collection/:id', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const { collection, id } = req.params
  const body = await req.json() as Record<string, unknown>

  // Support both direct fields and $set
  const update = body.$set ? body as { $set: Record<string, unknown> } : { $set: body }

  const rpcStart = performance.now()
  const result = await db(env).updateOne(collection, { _id: id }, update)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  if (result.data.matchedCount === 0) {
    return Response.json({ error: 'Not found', timing: { workerColo, doColo: result.doColo, queryMs: result.queryMs, rpcMs: Math.round(rpcMs * 100) / 100, totalMs: Math.round(totalMs * 100) / 100 } }, { status: 404 })
  }
  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.delete('/:collection/:id', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const { collection, id } = req.params

  const rpcStart = performance.now()
  const result = await db(env).deleteOne(collection, { _id: id })
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  if (result.data.deletedCount === 0) {
    return Response.json({ error: 'Not found', timing: { workerColo, doColo: result.doColo, queryMs: result.queryMs, rpcMs: Math.round(rpcMs * 100) / 100, totalMs: Math.round(totalMs * 100) / 100 } }, { status: 404 })
  }
  return withTiming(workerColo, result, rpcMs, totalMs)
})

export default router
