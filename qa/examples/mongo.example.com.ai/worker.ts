/**
 * mongo.example.com.ai - MongoDB at the Edge
 *
 * Uses AutoRouter for clean JSON responses.
 * DO SQLite for document storage with MongoDB-compatible API.
 * Uses DO RPC for direct method calls.
 * Includes detailed latency metrics for all operations.
 *
 * Initialization Strategy:
 * Uses "eager-but-non-blocking" initialization:
 * - Initialization starts immediately on DO constructor (not lazy)
 * - Non-query endpoints (ping, debug) respond instantly while init runs
 * - Queries wait only for remaining init time (often near-zero)
 * - Uses ctx.waitUntil() to keep DO alive during background init
 *
 * WebSocket Hibernation Support:
 * - Connect to /ws for persistent WebSocket connections
 * - 95% cost savings vs regular DO requests
 * - Uses Cloudflare's hibernation API
 */

import { AutoRouter } from 'itty-router'
import { DurableObject } from 'cloudflare:workers'

// =============================================================================
// Module-Level Instance Tracking (outside DO class)
// =============================================================================
// These persist as long as the isolate lives - helps us understand DO lifecycle
// The module loads once per isolate, so this tracks isolate lifetime

// Note: Date.now() at module evaluation time in Workers returns 0
// We capture the first request time instead
let MODULE_LOAD_TIME: number | null = null
const MODULE_INSTANCE_ID = Math.random().toString(36).slice(2, 10)

function getModuleLoadTime(): number {
  if (MODULE_LOAD_TIME === null) {
    MODULE_LOAD_TIME = Date.now()
  }
  return MODULE_LOAD_TIME
}

// Track request count at module level
let moduleRequestCount = 0

// =============================================================================
// Module-Level Initialization Tracking (survives DO class reinstantiation)
// =============================================================================
// The isolate persists longer than DO class instances. By tracking init state
// at module scope, we can understand when the DO is truly cold vs warm.

/** Whether initialization has completed */
let moduleInitialized = false

/** Promise for in-progress initialization. Shared for deduplication. */
let moduleInitPromise: Promise<void> | null = null

/** Timestamp when initialization started */
let initStartedAt: number | null = null

/** Timestamp when initialization completed */
let initCompletedAt: number | null = null

/** DO colo (persists at module level) */
let moduleColo: string = 'unknown'

/**
 * Check if initialization is currently in progress.
 */
function isInitializing(): boolean {
  return moduleInitPromise !== null && !moduleInitialized
}

/**
 * Start initialization in background.
 * Returns immediately - the promise is tracked for later awaiting.
 */
function startInitInBackground(sqlStorage: SqlStorage): void {
  // Already initialized or initializing
  if (moduleInitialized || moduleInitPromise) return

  initStartedAt = Date.now()
  console.log(`[mongo.example.com.ai] Starting init in background - module: ${MODULE_INSTANCE_ID}`)

  moduleInitPromise = (async () => {
    // Fetch DO colo in parallel with table setup
    const coloPromise = fetch('https://workers.cloudflare.com/cf.json')
      .then(r => r.json())
      .then((cf: { colo?: string }) => { moduleColo = cf.colo || 'unknown' })
      .catch(() => {})

    // Create collections metadata table
    sqlStorage.exec(`
      CREATE TABLE IF NOT EXISTS __collections (
        name TEXT PRIMARY KEY,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Create default 'products' collection
    sqlStorage.exec(`
      CREATE TABLE IF NOT EXISTS products (
        _id TEXT PRIMARY KEY,
        doc TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT
      )
    `)
    sqlStorage.exec(`
      INSERT OR IGNORE INTO __collections (name) VALUES ('products')
    `)

    // Seed with sample data if empty
    const count = [...sqlStorage.exec('SELECT COUNT(*) as c FROM products')][0].c as number
    if (count === 0) {
      const samples = [
        { _id: 'prod-1', name: 'Widget A', category: 'electronics', price: 29.99, inStock: true },
        { _id: 'prod-2', name: 'Widget B', category: 'electronics', price: 49.99, inStock: true },
        { _id: 'prod-3', name: 'T-Shirt', category: 'clothing', price: 19.99, inStock: false },
      ]
      for (const doc of samples) {
        sqlStorage.exec(
          `INSERT INTO products (_id, doc) VALUES (?, ?)`,
          doc._id, JSON.stringify(doc)
        )
      }
    }

    await coloPromise
    moduleInitialized = true
    initCompletedAt = Date.now()
    const initDuration = initCompletedAt - (initStartedAt ?? initCompletedAt)
    console.log(`[mongo.example.com.ai] INIT COMPLETE - took ${initDuration}ms, module: ${MODULE_INSTANCE_ID}`)
  })().catch((err) => {
    console.error(`[mongo.example.com.ai] Init failed:`, err)
    moduleInitPromise = null
    throw err
  })
}

/**
 * Wait for initialization to complete if in progress.
 */
async function waitForInit(): Promise<void> {
  if (moduleInitialized) return
  if (moduleInitPromise) await moduleInitPromise
}

// =============================================================================
// Types
// =============================================================================

interface Env {
  MONGODB: DurableObjectNamespace<MongoDB>
}

/** WebSocket RPC message format */
interface WSRpcMessage {
  id: number | string
  method?: 'do'
  path: string
  args?: unknown[]
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
// MongoDB Durable Object with Background Initialization
// =============================================================================

export class MongoDB extends DurableObject {
  private sqlStorage: SqlStorage

  // Instance-level tracking
  private readonly instanceCreatedAt = Date.now()
  private readonly instanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  private instanceRequestCount = 0
  private initWaitedMs: number | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sqlStorage = ctx.storage.sql
    moduleRequestCount++

    // =========================================================================
    // EAGER-BUT-NON-BLOCKING: Start initialization in background immediately
    // =========================================================================
    // This is the key insight: don't wait for init, just start it.
    // Use ctx.waitUntil() to keep the DO alive while init runs in background.
    // Non-query endpoints (ping, debug) can respond instantly.
    // Queries will wait only for remaining init time.
    startInitInBackground(this.sqlStorage)

    // Keep DO alive while init runs (critical for hibernation)
    if (moduleInitPromise) {
      ctx.waitUntil(moduleInitPromise.catch(() => {}))
    }
  }

  /**
   * Wait for initialization to complete.
   * Init already started in constructor, so this just waits for remaining time.
   */
  private async init(): Promise<void> {
    if (moduleInitialized) return

    const waitStart = performance.now()
    await waitForInit()
    const waitMs = performance.now() - waitStart

    // Track wait time if we actually had to wait
    if (waitMs > 1) {
      this.initWaitedMs = Math.round(waitMs * 100) / 100
      console.log(`[MongoDB DO] Query waited ${this.initWaitedMs}ms for init to complete`)
    }
  }

  /** Get current colo (from module-level cache) */
  private get colo(): string {
    return moduleColo
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

  /**
   * Health check - responds INSTANTLY without waiting for initialization.
   * This is the key benefit of background loading.
   */
  ping(): {
    ok: boolean
    initialized: boolean
    initializing: boolean
    doColo: string
    moduleId: string
  } {
    return {
      ok: true,
      initialized: moduleInitialized,
      initializing: isInitializing(),
      doColo: this.colo,
      moduleId: MODULE_INSTANCE_ID,
    }
  }

  /**
   * Get instance lifecycle info for debugging cold starts.
   * Responds INSTANTLY with current state - doesn't wait for initialization.
   */
  getDebugInfo(): {
    module: { id: string; loadedAt: string; ageMs: number; requestCount: number }
    instance: { id: string; createdAt: string; ageMs: number; requestCount: number }
    init: {
      complete: boolean
      inProgress: boolean
      startedAt: string | null
      completedAt: string | null
      durationMs: number | null
      timeSinceCompleteMs: number | null
    }
    doColo: string
  } {
    this.instanceRequestCount++
    const now = Date.now()
    const moduleLoadTime = getModuleLoadTime()
    return {
      module: {
        id: MODULE_INSTANCE_ID,
        loadedAt: new Date(moduleLoadTime).toISOString(),
        ageMs: now - moduleLoadTime,
        requestCount: moduleRequestCount,
      },
      instance: {
        id: this.instanceId,
        createdAt: new Date(this.instanceCreatedAt).toISOString(),
        ageMs: now - this.instanceCreatedAt,
        requestCount: this.instanceRequestCount,
      },
      init: {
        complete: moduleInitialized,
        inProgress: isInitializing(),
        startedAt: initStartedAt ? new Date(initStartedAt).toISOString() : null,
        completedAt: initCompletedAt ? new Date(initCompletedAt).toISOString() : null,
        durationMs: initStartedAt && initCompletedAt ? initCompletedAt - initStartedAt : null,
        timeSinceCompleteMs: initCompletedAt !== null ? now - initCompletedAt : null,
      },
      doColo: this.colo,
    }
  }

  /** Get instance lifecycle info for debugging cold starts (waits for init) */
  async getInstanceInfo(): Promise<{
    module: { id: string; loadedAt: string; ageMs: number; requestCount: number }
    instance: { id: string; createdAt: string; ageMs: number; requestCount: number }
    init: {
      complete: boolean
      completedAt: string | null
      ageMs: number | null
      reused: boolean
      waitedMs: number | null
    }
    doColo: string
  }> {
    // Initialize to get accurate timing
    const initStart = performance.now()
    const wasAlreadyInitialized = moduleInitialized
    await this.init()
    const initMs = wasAlreadyInitialized ? null : Math.round((performance.now() - initStart) * 100) / 100

    this.instanceRequestCount++
    const now = Date.now()
    const moduleLoadTime = getModuleLoadTime()
    return {
      module: {
        id: MODULE_INSTANCE_ID,
        loadedAt: new Date(moduleLoadTime).toISOString(),
        ageMs: now - moduleLoadTime,
        requestCount: moduleRequestCount,
      },
      instance: {
        id: this.instanceId,
        createdAt: new Date(this.instanceCreatedAt).toISOString(),
        ageMs: now - this.instanceCreatedAt,
        requestCount: this.instanceRequestCount,
      },
      init: {
        complete: moduleInitialized,
        completedAt: initCompletedAt ? new Date(initCompletedAt).toISOString() : null,
        ageMs: initCompletedAt ? now - initCompletedAt : null,
        reused: wasAlreadyInitialized,
        waitedMs: this.initWaitedMs,
      },
      doColo: this.colo,
    }
  }

  // ============================================================================
  // WebSocket Hibernation Support (95% cost savings)
  // ============================================================================

  /** Handle WebSocket upgrade requests for hibernation */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server)
    return new Response(null, { status: 101, webSocket: client })
  }

  /** Handle WebSocket messages (hibernation callback) */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') {
      ws.send(JSON.stringify({ error: 'Binary messages not supported' }))
      return
    }

    let msg: WSRpcMessage
    try {
      msg = JSON.parse(message)
    } catch {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }))
      return
    }

    const { id, path, args = [] } = msg

    try {
      const result = await this.dispatch(path, args)
      ws.send(JSON.stringify({ id, result }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'RPC error'
      ws.send(JSON.stringify({ id, error: { message: errorMsg } }))
    }
  }

  /** Handle WebSocket close */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    // Cleanup if needed
  }

  /** Dispatch RPC call to the appropriate method */
  private async dispatch(path: string, args: unknown[]): Promise<unknown> {
    const parts = path.split('.')
    let target: unknown = this
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof target !== 'object' || target === null) {
        throw new Error(`Invalid path: ${path}`)
      }
      target = (target as Record<string, unknown>)[parts[i]]
    }

    const methodName = parts[parts.length - 1]
    if (typeof target !== 'object' || target === null) {
      throw new Error(`Invalid path: ${path}`)
    }
    const method = (target as Record<string, unknown>)[methodName]

    if (typeof method !== 'function') {
      throw new Error(`Not a function: ${path}`)
    }

    return method.apply(target, args)
  }

  /** Broadcast message to all connected WebSocket clients */
  broadcast(message: unknown, exclude?: WebSocket): void {
    const data = typeof message === 'string' ? message : JSON.stringify(message)
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== exclude) {
        try { ws.send(data) } catch { /* ignore closed sockets */ }
      }
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
  const wsBase = base.replace(/^http/, 'ws')
  const workerColo = getColo(req)

  return {
    name: 'mongo.example.com.ai',
    description: 'MongoDB at the Edge - DO SQLite with MongoDB-compatible API',
    workerColo,
    initStrategy: 'eager-but-non-blocking (starts init in constructor, non-query endpoints respond instantly)',
    links: {
      'Collections': `${base}/collections`,
      'List Products': `${base}/products`,
      'Product Stats': `${base}/products/stats`,
      'Aggregate Example': `${base}/products/aggregate`,
      'WebSocket': `${wsBase}/ws (persistent connection, 95% cheaper)`,
      'Health Check': `${base}/ping (instant, no init wait)`,
      'Debug (instant)': `${base}/debug (DO lifecycle info, no init wait)`,
      'Debug (full)': `${base}/debug/full (DO lifecycle info, waits for init)`,
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
    websocket: {
      url: `${wsBase}/ws`,
      note: 'WebSocket hibernation provides 95% cost savings for persistent connections',
      protocol: {
        request: '{ id: number, path: string, args?: unknown[] }',
        response: '{ id: number, result: unknown } | { id: number, error: { message: string } }',
        example: '{ "id": 1, "path": "find", "args": ["products", {}] }',
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

// Health check - responds INSTANTLY without waiting for initialization
router.get('/ping', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).ping()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return Response.json({
    ...result,
    timing: {
      workerColo,
      rpcMs: Math.round(rpcMs * 100) / 100,
      totalMs: Math.round(totalMs * 100) / 100,
    },
  })
})

// Debug endpoint - responds INSTANTLY with current state (doesn't wait for init)
router.get('/debug', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const debugInfo = await db(env).getDebugInfo()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return Response.json({
    ...debugInfo,
    timing: {
      workerColo,
      doColo: debugInfo.doColo,
      rpcMs: Math.round(rpcMs * 100) / 100,
      totalMs: Math.round(totalMs * 100) / 100,
    },
    explanation: {
      moduleAge: 'How long since the isolate/module loaded (survives across DO instances)',
      instanceAge: 'How long since THIS DO class was instantiated',
      initComplete: 'Whether DO initialization has finished',
      initInProgress: 'Whether initialization is currently running in background',
      noWasm: 'MongoDB uses DO SQLite directly - no WASM overhead',
      strategy: 'Eager-but-non-blocking: init starts in constructor, non-query endpoints respond instantly',
    },
  })
})

// Debug endpoint that waits for init (for full timing info)
router.get('/debug/full', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const instanceInfo = await db(env).getInstanceInfo()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return Response.json({
    ...instanceInfo,
    timing: {
      workerColo,
      doColo: instanceInfo.doColo,
      rpcMs: Math.round(rpcMs * 100) / 100,
      totalMs: Math.round(totalMs * 100) / 100,
    },
    explanation: {
      moduleAge: 'How long since the isolate/module loaded (survives across DO instances)',
      instanceAge: 'How long since THIS DO class was instantiated',
      initAge: 'How long since initialization completed',
      initReused: 'Whether initialization was reused from module-level cache',
      initWaitedMs: 'Time this call waited for init (null if already complete)',
      noWasm: 'MongoDB uses DO SQLite directly - no WASM overhead',
      coldStart: 'If module.ageMs ≈ instance.ageMs ≈ init.ageMs, this was a cold start',
      warmStart: 'If module.ageMs >> instance.ageMs, the isolate stayed warm but DO class was recreated',
    },
  })
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

// Handle WebSocket upgrades BEFORE the router to avoid interference
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Handle WebSocket upgrade to /ws
    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      const stub = db(env)
      return stub.fetch(request)
    }

    // All other requests go through the router
    return router.fetch(request, env, ctx)
  },
}
