/**
 * postgres.example.com.ai - PostgreSQL at the Edge
 *
 * Uses AutoRouter for clean JSON responses.
 * PGLite WASM with DO SQLite for persistence.
 * Uses DO RPC for direct method calls (not fetch anti-pattern).
 * Includes detailed latency metrics for all operations.
 *
 * WASM Loading Strategy:
 * Uses BackgroundPGLiteManager for "eager-but-non-blocking" loading:
 * - WASM loading starts immediately on DO init (not lazy)
 * - Non-query endpoints (ping, debug) respond instantly while WASM loads
 * - Queries wait only for remaining load time (often near-zero)
 * - Uses ctx.waitUntil() to keep DO alive during background loading
 *
 * WebSocket Hibernation Support:
 * - Connect to /ws for persistent WebSocket connections
 * - 95% cost savings vs regular DO requests
 * - Uses Cloudflare's hibernation API
 */

import { AutoRouter } from 'itty-router'
import { DurableObject } from 'cloudflare:workers'
import { PGliteLocal } from './src/pglite-local'

// Static WASM imports - Wrangler pre-compiles these
// @ts-ignore
import pgliteWasm from './src/pglite-assets/pglite.wasm'
// @ts-ignore
import pgliteData from './src/pglite-assets/pglite.data'

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
// Module-Level WASM Hoisting (survives DO class reinstantiation)
// =============================================================================
// The isolate persists longer than DO class instances. By hoisting the PGLite
// instance to module scope, we can reuse it across DO class reinstantiations
// within the same isolate - reducing warm starts from ~1200ms to ~30ms.

/** Hoisted PGLite instance - survives DO class reinstantiation within same isolate */
let hoistedPglite: PGliteLocal | null = null

/** Promise for in-progress PGLite initialization. Shared for deduplication. */
let hoistedPglitePromise: Promise<PGliteLocal> | null = null

/** Timestamp when WASM loading started */
let wasmLoadStartedAt: number | null = null

/** Timestamp when WASM was loaded */
let wasmLoadedAt: number | null = null

/**
 * Check if WASM is currently loading in background.
 */
function isWasmLoading(): boolean {
  return hoistedPglitePromise !== null && hoistedPglite === null
}

/**
 * Start WASM loading in background.
 * Returns immediately - the promise is tracked for later awaiting.
 */
function startWasmLoadingInBackground(): void {
  // Already loaded or loading
  if (hoistedPglite || hoistedPglitePromise) return

  wasmLoadStartedAt = Date.now()
  console.log(`[postgres.example.com.ai] Starting WASM load in background - module: ${MODULE_INSTANCE_ID}`)

  hoistedPglitePromise = PGliteLocal.create({
    wasmModule: pgliteWasm,
    fsBundle: pgliteData,
  }).then((pg) => {
    hoistedPglite = pg
    wasmLoadedAt = Date.now()
    const loadDuration = wasmLoadedAt - (wasmLoadStartedAt ?? wasmLoadedAt)
    console.log(`[postgres.example.com.ai] WASM LOADED - took ${loadDuration}ms, module: ${MODULE_INSTANCE_ID}`)
    return pg
  }).catch((err) => {
    console.error(`[postgres.example.com.ai] WASM load failed:`, err)
    hoistedPglitePromise = null
    throw err
  })
}

/**
 * Get or await the hoisted PGLite instance.
 * If loading is in progress, waits for it. If not started, starts loading.
 */
async function getOrAwaitHoistedPglite(): Promise<PGliteLocal> {
  if (hoistedPglite) return hoistedPglite
  if (hoistedPglitePromise) return hoistedPglitePromise

  // Not started yet - start now (fallback, shouldn't happen if init() called)
  startWasmLoadingInBackground()
  return hoistedPglitePromise!
}

// =============================================================================
// Types
// =============================================================================

interface Env {
  POSTGRES: DurableObjectNamespace<Postgres>
}

/** WebSocket RPC message format */
interface WSRpcMessage {
  id: number | string
  method?: 'do' // rpc.do protocol
  path: string
  args?: unknown[]
}

interface Post {
  id: number
  title: string
  content: string | null
  published: boolean
  created_at: string
}

interface Timing {
  /** Cloudflare colo where the Worker is running */
  workerColo: string
  /** Cloudflare colo where the Durable Object is running */
  doColo: string
  /** Time spent executing the PostgreSQL query (ms) */
  queryMs: number
  /** Round-trip time from Worker to DO via RPC (ms) */
  rpcMs: number
  /** Total request latency (ms) */
  totalMs: number
}

interface QueryResult<T = Record<string, unknown>> {
  data: T
  queryMs: number
  doColo: string
}

// Helper to escape SQL strings
const esc = (s: string | null | undefined): string => {
  if (s === null || s === undefined) return 'NULL'
  return `'${String(s).replace(/'/g, "''")}'`
}

// =============================================================================
// Postgres Durable Object with Background WASM Loading
// =============================================================================

export class Postgres extends DurableObject {
  private pglite: PGliteLocal | null = null
  private initPromise: Promise<void> | null = null
  private sqlStorage: SqlStorage
  private colo: string = 'unknown'

  // Instance-level tracking
  private readonly instanceCreatedAt = Date.now()
  private readonly instanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  private instanceRequestCount = 0
  private wasmInitializedAt: number | null = null
  private wasmWaitedMs: number | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sqlStorage = ctx.storage.sql
    // Get colo from ctx.id location hint or fallback
    this.colo = (ctx as unknown as { colo?: string }).colo || 'unknown'
    moduleRequestCount++

    // =========================================================================
    // EAGER-BUT-NON-BLOCKING: Start WASM loading in background immediately
    // =========================================================================
    // This is the key insight: don't wait for WASM, just start loading it.
    // Use ctx.waitUntil() to keep the DO alive while WASM loads in background.
    // Non-query endpoints (ping, debug) can respond instantly.
    // Queries will wait only for remaining load time.
    startWasmLoadingInBackground()

    // Keep DO alive while WASM loads (critical for hibernation)
    if (hoistedPglitePromise) {
      ctx.waitUntil(hoistedPglitePromise.catch(() => {}))
    }
  }

  /**
   * Initialize PGLite and set up the database.
   * Waits for WASM if not yet loaded, but WASM loading already started in constructor.
   */
  private async init(): Promise<void> {
    if (this.pglite) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      // DO SQLite for persistence (independent of WASM)
      this.sqlStorage.exec(`
        CREATE TABLE IF NOT EXISTS __posts (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          published INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)

      // Fetch DO colo in parallel with WASM loading
      const coloPromise = fetch('https://workers.cloudflare.com/cf.json')
        .then(r => r.json())
        .then((cf: { colo?: string }) => { this.colo = cf.colo || 'unknown' })
        .catch(() => { /* keep default 'unknown' */ })

      // Wait for WASM if not yet loaded (loading started in constructor)
      const wasmWasAlreadyLoaded = hoistedPglite !== null
      const waitStart = performance.now()

      const [pglite] = await Promise.all([
        getOrAwaitHoistedPglite(),
        coloPromise,
      ])

      const waitMs = performance.now() - waitStart
      this.pglite = pglite
      this.wasmInitializedAt = Date.now()

      // Track wait time if we actually had to wait
      if (!wasmWasAlreadyLoaded && waitMs > 1) {
        this.wasmWaitedMs = Math.round(waitMs * 100) / 100
        console.log(`[Postgres DO] Query waited ${this.wasmWaitedMs}ms for WASM to finish loading`)
      }

      // Log reuse status
      console.log(`[Postgres DO] WASM ${wasmWasAlreadyLoaded ? 'REUSED' : 'LOADED'} - module age: ${Date.now() - (MODULE_LOAD_TIME ?? Date.now())}ms, instance age: ${Date.now() - this.instanceCreatedAt}ms`)

      await this.pglite.exec(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          published BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)

      // Restore from DO SQLite
      const rows = [...this.sqlStorage.exec('SELECT * FROM __posts ORDER BY id')]
      for (const row of rows) {
        const ts = new Date(row.created_at as string).toISOString()
        await this.pglite.exec(`
          INSERT INTO posts (id, title, content, published, created_at)
          VALUES (${row.id}, ${esc(row.title as string)}, ${esc(row.content as string)}, ${row.published === 1}, '${ts}'::timestamptz)
          ON CONFLICT (id) DO NOTHING
        `)
      }
      if (rows.length > 0) {
        const maxId = Math.max(...rows.map(r => r.id as number))
        await this.pglite.exec(`SELECT setval('posts_id_seq', ${maxId})`)
      }

      // Seed if empty
      if (rows.length === 0) {
        await this._createPost('Welcome to PostgreSQL at the Edge', 'PGLite WASM in a Durable Object with persistence!', true)
        await this._createPost('How It Works', 'DO SQLite persists data, PGLite provides PostgreSQL features.', true)
        await this._createPost('Draft Post', 'This is unpublished.', false)
      }
    })()

    return this.initPromise
  }

  private async _createPost(title: string, content: string | null, published: boolean): Promise<Post> {
    const result = await this.pglite!.query<Post>(`
      INSERT INTO posts (title, content, published)
      VALUES (${esc(title)}, ${esc(content)}, ${published})
      RETURNING *
    `)
    const post = result.rows[0]
    const createdAt = post.created_at instanceof Date ? post.created_at.toISOString() : String(post.created_at)
    this.sqlStorage.exec(
      `INSERT OR REPLACE INTO __posts (id, title, content, published, created_at) VALUES (?, ?, ?, ?, ?)`,
      post.id, post.title, post.content, post.published ? 1 : 0, createdAt
    )
    return post
  }

  // ============================================================================
  // RPC Methods - Called directly from Worker
  // ============================================================================

  /** Execute raw SQL query */
  async query(sql: string): Promise<QueryResult> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query(sql)
    return {
      data: { rows: result.rows, rowCount: result.rows.length },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Get all posts with optional filter */
  async getPosts(published?: 'true' | 'false'): Promise<QueryResult<{ posts: Post[] }>> {
    await this.init()
    let query = 'SELECT * FROM posts'
    if (published === 'true') query += ' WHERE published = true'
    if (published === 'false') query += ' WHERE published = false'
    query += ' ORDER BY created_at DESC'
    const start = performance.now()
    const result = await this.pglite!.query<Post>(query)
    return {
      data: { posts: result.rows },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Get a single post by ID */
  async getPost(id: number): Promise<QueryResult<Post | { error: string }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<Post>(`SELECT * FROM posts WHERE id = ${id}`)
    const queryMs = Math.round((performance.now() - start) * 100) / 100
    if (result.rows.length === 0) {
      return { data: { error: 'Not found' }, queryMs, doColo: this.colo }
    }
    return { data: result.rows[0], queryMs, doColo: this.colo }
  }

  /** Create a new post */
  async createPost(title: string, content: string | null, published: boolean): Promise<QueryResult<Post | { error: string }>> {
    await this.init()
    if (!title) {
      return { data: { error: 'Title required' }, queryMs: 0, doColo: this.colo }
    }
    const start = performance.now()
    const post = await this._createPost(title, content, published)
    return {
      data: post,
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Update a post */
  async updatePost(id: number, updates: Partial<Post>): Promise<QueryResult<Post | { error: string }>> {
    await this.init()
    const sets: string[] = []
    if (updates.title !== undefined) sets.push(`title = ${esc(updates.title)}`)
    if (updates.content !== undefined) sets.push(`content = ${esc(updates.content)}`)
    if (updates.published !== undefined) sets.push(`published = ${updates.published}`)
    if (sets.length === 0) {
      return { data: { error: 'No updates' }, queryMs: 0, doColo: this.colo }
    }
    const start = performance.now()
    const result = await this.pglite!.query<Post>(`UPDATE posts SET ${sets.join(', ')} WHERE id = ${id} RETURNING *`)
    const queryMs = Math.round((performance.now() - start) * 100) / 100
    if (result.rows.length === 0) {
      return { data: { error: 'Not found' }, queryMs, doColo: this.colo }
    }
    const post = result.rows[0]
    this.sqlStorage.exec(`UPDATE __posts SET title = ?, content = ?, published = ? WHERE id = ?`, post.title, post.content, post.published ? 1 : 0, post.id)
    return { data: post, queryMs, doColo: this.colo }
  }

  /** Delete a post */
  async deletePost(id: number): Promise<QueryResult<{ deleted: boolean; post: Post } | { error: string }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<Post>(`DELETE FROM posts WHERE id = ${id} RETURNING *`)
    const queryMs = Math.round((performance.now() - start) * 100) / 100
    if (result.rows.length === 0) {
      return { data: { error: 'Not found' }, queryMs, doColo: this.colo }
    }
    this.sqlStorage.exec('DELETE FROM __posts WHERE id = ?', id)
    return { data: { deleted: true, post: result.rows[0] }, queryMs, doColo: this.colo }
  }

  /** Get statistics */
  async getStats(): Promise<QueryResult<{ total: number; published: number; drafts: number }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<{ total: number; published: number; drafts: number }>(`
      SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE published)::int as published, COUNT(*) FILTER (WHERE NOT published)::int as drafts FROM posts
    `)
    return {
      data: result.rows[0],
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Get PostgreSQL version */
  async getVersion(): Promise<QueryResult<{ version: string }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<{ version: string }>('SELECT version()')
    return {
      data: result.rows[0],
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Get DO colo for diagnostics */
  getColo(): string {
    return this.colo
  }

  /**
   * Health check - responds INSTANTLY without waiting for WASM.
   * This is the key benefit of background loading.
   */
  ping(): {
    ok: boolean
    wasmLoaded: boolean
    wasmLoading: boolean
    doColo: string
    moduleId: string
  } {
    return {
      ok: true,
      wasmLoaded: hoistedPglite !== null,
      wasmLoading: isWasmLoading(),
      doColo: this.colo,
      moduleId: MODULE_INSTANCE_ID,
    }
  }

  /**
   * Get instance lifecycle info for debugging cold starts.
   * Responds INSTANTLY with current state - doesn't wait for WASM.
   */
  getDebugInfo(): {
    module: { id: string; loadedAt: string; ageMs: number; requestCount: number }
    instance: { id: string; createdAt: string; ageMs: number; requestCount: number }
    wasm: {
      loaded: boolean
      loading: boolean
      loadStartedAt: string | null
      loadedAt: string | null
      loadDurationMs: number | null
      timeSinceLoadMs: number | null
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
      wasm: {
        loaded: hoistedPglite !== null,
        loading: isWasmLoading(),
        loadStartedAt: wasmLoadStartedAt ? new Date(wasmLoadStartedAt).toISOString() : null,
        loadedAt: wasmLoadedAt ? new Date(wasmLoadedAt).toISOString() : null,
        loadDurationMs: wasmLoadStartedAt && wasmLoadedAt ? wasmLoadedAt - wasmLoadStartedAt : null,
        timeSinceLoadMs: wasmLoadedAt !== null ? now - wasmLoadedAt : null,
      },
      doColo: this.colo,
    }
  }

  /** Get instance lifecycle info for debugging cold starts (waits for WASM) */
  async getInstanceInfo(): Promise<{
    module: { id: string; loadedAt: string; ageMs: number; requestCount: number }
    instance: { id: string; createdAt: string; ageMs: number; requestCount: number }
    wasm: { initialized: boolean; initializedAt: string | null; ageMs: number | null; reused: boolean; initMs: number | null; waitedMs: number | null }
    doColo: string
  }> {
    // Initialize to get accurate WASM timing
    const wasmInitStart = performance.now()
    const wasAlreadyInitialized = this.pglite !== null
    await this.init()
    const wasmInitMs = wasAlreadyInitialized ? null : Math.round((performance.now() - wasmInitStart) * 100) / 100

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
      wasm: {
        initialized: this.pglite !== null,
        initializedAt: this.wasmInitializedAt ? new Date(this.wasmInitializedAt).toISOString() : null,
        ageMs: this.wasmInitializedAt ? now - this.wasmInitializedAt : null,
        reused: hoistedPglite !== null && this.pglite === hoistedPglite,
        initMs: wasmInitMs,
        waitedMs: this.wasmWaitedMs,
      },
      doColo: this.colo,
    }
  }

  // ============================================================================
  // WebSocket Hibernation Support (95% cost savings)
  // ============================================================================

  /**
   * Handle WebSocket upgrade requests for hibernation
   * Called via fetch() when Worker forwards WebSocket upgrade
   */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    // Accept with hibernation API for 95% cost savings
    this.ctx.acceptWebSocket(server)

    return new Response(null, { status: 101, webSocket: client })
  }

  /**
   * Handle WebSocket messages (hibernation callback)
   * Protocol: { id, path, args } -> { id, result } | { id, error }
   */
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

  /**
   * Handle WebSocket close (hibernation callback)
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    // Cleanup if needed
  }

  /**
   * Dispatch RPC call to the appropriate method
   */
  private async dispatch(path: string, args: unknown[]): Promise<unknown> {
    const parts = path.split('.')

    // Navigate the method path
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

  /**
   * Broadcast message to all connected WebSocket clients
   */
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

const db = (env: Env) => env.POSTGRES.get(env.POSTGRES.idFromName('default'))

/** Wrap RPC result with full timing */
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
  const body = {
    ...result.data as object,
    timing,
  }
  return Response.json(body, { status })
}

/** Get worker colo from request */
const getColo = (req: Request): string => {
  const cf = (req as unknown as { cf?: { colo?: string } }).cf
  return cf?.colo || 'unknown'
}

router.get('/', (req) => {
  const base = new URL(req.url).origin
  const wsBase = base.replace(/^http/, 'ws')
  const workerColo = getColo(req)

  return {
    name: 'postgres.example.com.ai',
    description: 'PostgreSQL at the Edge - PGLite WASM + Durable Objects',
    workerColo,
    wasmStrategy: 'eager-but-non-blocking (starts loading in constructor, non-query endpoints respond instantly)',
    links: {
      'List Posts': `${base}/posts`,
      'Published Only': `${base}/posts?published=true`,
      'Drafts Only': `${base}/posts?published=false`,
      'Statistics': `${base}/stats`,
      'PostgreSQL Version': `${base}/version`,
      'Raw Query': `${base}/query (POST with {"sql": "SELECT ..."})`,
      'WebSocket': `${wsBase}/ws (persistent connection, 95% cheaper)`,
      'Health Check': `${base}/ping (instant, no WASM wait)`,
      'Debug (instant)': `${base}/debug (DO lifecycle info, no WASM wait)`,
      'Debug (full)': `${base}/debug/full (DO lifecycle info, waits for WASM)`,
    },
    timing: {
      note: 'All endpoints return detailed timing info via DO RPC',
      fields: {
        workerColo: 'Cloudflare datacenter running the Worker',
        doColo: 'Cloudflare datacenter running the Durable Object',
        queryMs: 'PostgreSQL query execution time (ms)',
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
        example: '{ "id": 1, "path": "getPosts" }',
      },
    },
  }
})

router.get('/posts', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const url = new URL(req.url)
  const published = url.searchParams.get('published') as 'true' | 'false' | null

  const rpcStart = performance.now()
  const result = await db(env).getPosts(published || undefined)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.post('/posts', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const { title, content, published } = await req.json() as { title: string; content?: string; published?: boolean }

  const rpcStart = performance.now()
  const result = await db(env).createPost(title, content || null, published || false)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  const hasError = 'error' in result.data
  return withTiming(workerColo, result, rpcMs, totalMs, hasError ? 400 : 201)
})

router.get('/posts/:id', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const id = parseInt(req.params.id)

  const rpcStart = performance.now()
  const result = await db(env).getPost(id)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  const hasError = 'error' in result.data
  return withTiming(workerColo, result, rpcMs, totalMs, hasError ? 404 : 200)
})

router.patch('/posts/:id', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const id = parseInt(req.params.id)
  const updates = await req.json() as Partial<Post>

  const rpcStart = performance.now()
  const result = await db(env).updatePost(id, updates)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  const data = result.data as { error?: string }
  const status = data.error === 'No updates' ? 400 : data.error === 'Not found' ? 404 : 200
  return withTiming(workerColo, result, rpcMs, totalMs, status)
})

router.delete('/posts/:id', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const id = parseInt(req.params.id)

  const rpcStart = performance.now()
  const result = await db(env).deletePost(id)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  const hasError = 'error' in result.data
  return withTiming(workerColo, result, rpcMs, totalMs, hasError ? 404 : 200)
})

router.get('/stats', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).getStats()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.get('/version', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).getVersion()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

// Health check - responds INSTANTLY without waiting for WASM
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

// Debug endpoint - responds INSTANTLY with current state (doesn't wait for WASM)
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
      wasmLoaded: 'Whether PGLite WASM is fully loaded and ready',
      wasmLoading: 'Whether WASM is currently loading in background',
      strategy: 'Eager-but-non-blocking: WASM starts loading in constructor, non-query endpoints respond instantly',
    },
  })
})

// Debug endpoint that waits for WASM (for full timing info)
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
      wasmAge: 'How long since PGLite WASM was initialized',
      wasmReused: 'Whether the WASM instance was reused from module-level cache',
      wasmWaitedMs: 'Time this init() call waited for WASM (null if already loaded)',
      coldStart: 'If module.ageMs ≈ instance.ageMs ≈ wasm.ageMs, this was a cold start',
      warmStart: 'If module.ageMs >> instance.ageMs, the isolate stayed warm but DO class was recreated',
    },
  })
})

router.post('/query', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const { sql } = await req.json() as { sql: string }

  try {
    const rpcStart = performance.now()
    const result = await db(env).query(sql)
    const rpcMs = performance.now() - rpcStart
    const totalMs = performance.now() - requestStart

    return withTiming(workerColo, result, rpcMs, totalMs)
  } catch (error) {
    const totalMs = performance.now() - requestStart
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: {
        workerColo,
        doColo: 'unknown',
        queryMs: 0,
        rpcMs: 0,
        totalMs: Math.round(totalMs * 100) / 100,
      },
    }, { status: 500 })
  }
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
