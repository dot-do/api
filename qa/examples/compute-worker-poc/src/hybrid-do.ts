/**
 * Hybrid Durable Object - Cold/Warm Routing
 *
 * This DO implements the hybrid pattern: it tracks its own warm/cold state
 * and decides at runtime whether to execute queries directly (when warm)
 * or delegate to the shared compute worker (when cold).
 *
 * Key characteristics:
 * - Cold: Delegates to COMPUTE_WORKER, starts WASM load in background
 * - Warm: Executes directly via local PGLite (no overhead)
 * - Returns `wasHybridRouted: boolean` to track which path was taken
 *
 * This is the "best of both worlds" approach:
 * - Fast cold starts (uses shared compute worker)
 * - Fast hot queries (direct execution, no RPC overhead)
 */

import { Hono } from 'hono'
import { PGliteLocal, type QueryResult } from './pglite-local'
import { TimingCollector, MODULE_LOAD_TIME, MODULE_ID } from './shared/timing'
import type { HybridDoEnv, ComputeResponse } from './shared/types'

// @ts-ignore - Wrangler handles these imports
import pgliteWasm from './pglite-assets/pglite.wasm'
// @ts-ignore - Wrangler handles these imports
import pgliteData from './pglite-assets/pglite.data'

/**
 * Module-level tracking
 */
const DO_MODULE_LOADED_AT = Date.now()
let DO_INSTANCE_COUNT = 0

/**
 * Hybrid Durable Object - decides cold vs warm routing
 */
export class HybridDO implements DurableObject {
  private pg: PGliteLocal | null = null
  private pgPromise: Promise<PGliteLocal> | null = null
  private initialized = false
  private initializationTiming: TimingCollector | null = null

  private instanceId: string
  private instanceCreatedAt: number
  private instanceNumber: number
  private requestCount = 0
  private coldStart = true

  // Hybrid-specific tracking
  private hybridRoutedCount = 0 // Requests routed to compute worker
  private directExecutedCount = 0 // Requests executed directly
  private wasmLoadStartedAt: number | null = null
  private wasmLoadedAt: number | null = null
  private wasmLoadError: string | null = null

  // DO SQLite for persistence
  private sql: SqlStorage

  constructor(
    private state: DurableObjectState,
    private env: HybridDoEnv
  ) {
    DO_INSTANCE_COUNT++
    this.instanceNumber = DO_INSTANCE_COUNT
    this.instanceId = `hybrid-do-${Date.now().toString(36)}-${DO_INSTANCE_COUNT}`
    this.instanceCreatedAt = Date.now()
    this.sql = state.storage.sql

    // Initialize schema synchronously (fast - no WASM!)
    this.initSchema()

    // Note: We do NOT eagerly start WASM loading in constructor
    // We wait for the first request, then start loading in background
    // while returning result from compute worker
  }

  /**
   * Initialize DO SQLite schema for persistence
   */
  private initSchema(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `)

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS query_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sql TEXT,
        result TEXT,
        was_hybrid_routed INTEGER,
        compute_ms REAL,
        persist_ms REAL,
        total_ms REAL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
  }

  /**
   * Check if WASM/PGLite is ready for direct execution
   */
  private get isWarm(): boolean {
    return this.pg !== null && this.initialized
  }

  /**
   * Start loading WASM in background (non-blocking)
   * This is called when we route to compute worker, so WASM is ready for next request
   */
  private startWarmingUp(): void {
    if (this.pgPromise) return // Already loading
    if (this.pg) return // Already loaded

    this.wasmLoadStartedAt = Date.now()
    const timing = new TimingCollector()
    this.initializationTiming = timing

    this.pgPromise = (async () => {
      try {
        timing.start('wasm_load')
        const wasmModule = pgliteWasm
        timing.end({ wasmSize: 'pre-compiled' })

        timing.start('data_load')
        const dataBuffer = pgliteData
        timing.end({ dataSize: dataBuffer.byteLength })

        timing.start('module_init')
        const pg = await PGliteLocal.create({
          wasmModule,
          fsBundle: dataBuffer,
          debug: false,
        })
        timing.end()

        timing.start('first_query')
        await pg.query('SELECT 1')
        timing.end()

        this.wasmLoadedAt = Date.now()
        this.initialized = true
        this.pg = pg

        return pg
      } catch (error) {
        this.wasmLoadError = error instanceof Error ? error.message : String(error)
        throw error
      }
    })()
  }

  /**
   * Execute via compute worker (cold path)
   */
  private async executeViaComputeWorker(sql: string, timing: TimingCollector): Promise<ComputeResponse> {
    timing.start('rpc_call')
    const response = await this.env.COMPUTE_WORKER.fetch('https://compute/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, requestId: timing.requestId }),
    })
    timing.end()

    timing.start('parse_response')
    const data = (await response.json()) as ComputeResponse
    timing.end()

    return data
  }

  /**
   * Execute directly via local PGLite (warm path)
   */
  private async executeDirect(sql: string, timing: TimingCollector): Promise<QueryResult> {
    if (!this.pg) {
      throw new Error('PGLite not ready for direct execution')
    }

    timing.start('direct_query')
    const result = await this.pg.query(sql)
    timing.end()

    return result
  }

  /**
   * Persist query log
   */
  private persistQueryLog(
    sql: string,
    result: QueryResult | undefined,
    wasHybridRouted: boolean,
    computeMs: number,
    persistMs: number,
    totalMs: number
  ): void {
    this.sql.exec(
      `INSERT INTO query_log (sql, result, was_hybrid_routed, compute_ms, persist_ms, total_ms) VALUES (?, ?, ?, ?, ?, ?)`,
      sql,
      JSON.stringify(result?.rows || []),
      wasHybridRouted ? 1 : 0,
      computeMs,
      persistMs,
      totalMs
    )
  }

  /**
   * Get instance status (instant)
   */
  private getStatus(): object {
    const now = Date.now()

    const kvCount = this.sql.exec('SELECT COUNT(*) as count FROM kv').one() as { count: number }
    const queryCount = this.sql.exec('SELECT COUNT(*) as count FROM query_log').one() as { count: number }
    const hybridRoutedCount = this.sql.exec('SELECT COUNT(*) as count FROM query_log WHERE was_hybrid_routed = 1').one() as { count: number }
    const directCount = this.sql.exec('SELECT COUNT(*) as count FROM query_log WHERE was_hybrid_routed = 0').one() as { count: number }

    return {
      success: true,
      architecture: 'hybrid-cold-warm-routing',
      module: {
        id: MODULE_ID,
        loadedAt: new Date(MODULE_LOAD_TIME).toISOString(),
        ageMs: now - MODULE_LOAD_TIME,
        doModuleLoadedAt: new Date(DO_MODULE_LOADED_AT).toISOString(),
        doModuleAgeMs: now - DO_MODULE_LOADED_AT,
        instanceCount: DO_INSTANCE_COUNT,
      },
      instance: {
        id: this.instanceId,
        number: this.instanceNumber,
        createdAt: new Date(this.instanceCreatedAt).toISOString(),
        ageMs: now - this.instanceCreatedAt,
        requestCount: this.requestCount,
        coldStart: this.coldStart,
      },
      hybrid: {
        isWarm: this.isWarm,
        hybridRoutedCount: this.hybridRoutedCount,
        directExecutedCount: this.directExecutedCount,
        wasmLoadStatus: this.isWarm
          ? 'loaded'
          : this.pgPromise
            ? 'loading'
            : 'not_started',
        wasmLoadStartedAt: this.wasmLoadStartedAt ? new Date(this.wasmLoadStartedAt).toISOString() : null,
        wasmLoadedAt: this.wasmLoadedAt ? new Date(this.wasmLoadedAt).toISOString() : null,
        wasmLoadDurationMs: this.wasmLoadedAt && this.wasmLoadStartedAt
          ? this.wasmLoadedAt - this.wasmLoadStartedAt
          : null,
        wasmLoadError: this.wasmLoadError,
      },
      persistence: {
        kvEntries: kvCount.count,
        queryLogEntries: queryCount.count,
        hybridRoutedQueries: hybridRoutedCount.count,
        directExecutedQueries: directCount.count,
      },
      initializationTiming: this.initializationTiming?.getTimings() || null,
      note: 'Hybrid DO: routes cold requests to compute worker, warm requests execute directly',
    }
  }

  /**
   * Handle query - the core hybrid logic
   */
  private async handleQuery(sql: string): Promise<Response> {
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart
    const wasWarm = this.isWarm

    try {
      let result: QueryResult
      let wasHybridRouted: boolean
      let computeWorkerTimings: ComputeResponse['timings'] | undefined
      let computeWorkerInfo: ComputeResponse['workerInfo'] | undefined

      if (this.isWarm) {
        // WARM PATH: Execute directly (no overhead)
        wasHybridRouted = false
        this.directExecutedCount++

        result = await this.executeDirect(sql, timing)
      } else {
        // COLD PATH: Delegate to compute worker, start WASM load in background
        wasHybridRouted = true
        this.hybridRoutedCount++

        // Start WASM loading in background (via waitUntil for durability)
        this.state.waitUntil(Promise.resolve().then(() => this.startWarmingUp()))

        // Get result from compute worker NOW (instant response)
        const computeResult = await this.executeViaComputeWorker(sql, timing)

        if (!computeResult.success) {
          return Response.json({
            success: false,
            error: computeResult.error,
            coldStart: wasColdStart,
            wasHybridRouted: true,
            architecture: 'hybrid-cold-warm-routing',
          }, { status: 500 })
        }

        result = computeResult.result!
        computeWorkerTimings = computeResult.timings
        computeWorkerInfo = computeResult.workerInfo
      }

      // Persist query log
      timing.start('persist')
      this.persistQueryLog(
        sql,
        result,
        wasHybridRouted,
        timing.getDuration('direct_query') || computeWorkerTimings?.executionMs || 0,
        0,
        timing.getTimings().totalMs
      )
      timing.end()

      this.coldStart = false
      const timings = timing.getTimings()

      return Response.json({
        success: true,
        rows: result.rows,
        affectedRows: result.affectedRows,
        coldStart: wasColdStart,
        wasHybridRouted,
        wasWarm,
        architecture: 'hybrid-cold-warm-routing',
        timings: wasHybridRouted
          ? {
              doTimings: {
                rpcCallMs: timing.getDuration('rpc_call'),
                parseResponseMs: timing.getDuration('parse_response'),
                persistMs: timing.getDuration('persist'),
                totalMs: timings.totalMs,
              },
              computeWorkerTimings,
              computeWorkerInfo,
            }
          : {
              doTimings: {
                directQueryMs: timing.getDuration('direct_query'),
                persistMs: timing.getDuration('persist'),
                totalMs: timings.totalMs,
              },
            },
        instanceInfo: {
          instanceId: this.instanceId,
          instanceNumber: this.instanceNumber,
          requestCount: this.requestCount,
          hybridRoutedCount: this.hybridRoutedCount,
          directExecutedCount: this.directExecutedCount,
        },
      })
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        coldStart: wasColdStart,
        wasHybridRouted: !wasWarm,
        architecture: 'hybrid-cold-warm-routing',
      }, { status: 500 })
    }
  }

  /**
   * Handle timing request (detailed measurement)
   */
  private async handleTiming(sql: string, requestId?: string): Promise<Response> {
    const timing = new TimingCollector(requestId)
    const wasColdStart = this.coldStart
    const wasWarm = this.isWarm

    try {
      let result: QueryResult
      let wasHybridRouted: boolean
      let computeWorkerTimings: ComputeResponse['timings'] | undefined
      let computeWorkerInfo: ComputeResponse['workerInfo'] | undefined

      if (this.isWarm) {
        // WARM PATH: Execute directly
        wasHybridRouted = false
        this.directExecutedCount++

        result = await this.executeDirect(sql, timing)
      } else {
        // COLD PATH: Delegate to compute worker, start WASM load in background
        wasHybridRouted = true
        this.hybridRoutedCount++

        this.state.waitUntil(Promise.resolve().then(() => this.startWarmingUp()))

        const computeResult = await this.executeViaComputeWorker(sql, timing)

        if (!computeResult.success) {
          return Response.json({
            success: false,
            error: computeResult.error,
            coldStart: wasColdStart,
            wasHybridRouted: true,
            architecture: 'hybrid-cold-warm-routing',
          }, { status: 500 })
        }

        result = computeResult.result!
        computeWorkerTimings = computeResult.timings
        computeWorkerInfo = computeResult.workerInfo
      }

      timing.start('persist')
      this.persistQueryLog(
        sql,
        result,
        wasHybridRouted,
        timing.getDuration('direct_query') || computeWorkerTimings?.executionMs || 0,
        timing.getDuration('persist') || 0,
        timing.getTimings().totalMs
      )
      timing.end()

      this.coldStart = false
      const timings = timing.getTimings()

      return Response.json({
        success: true,
        rows: result.rows,
        affectedRows: result.affectedRows,
        coldStart: wasColdStart,
        wasHybridRouted,
        wasWarm,
        architecture: 'hybrid-cold-warm-routing',
        doTimings: wasHybridRouted
          ? {
              rpcCallMs: timing.getDuration('rpc_call'),
              parseResponseMs: timing.getDuration('parse_response'),
              persistMs: timing.getDuration('persist'),
              totalMs: timings.totalMs,
            }
          : {
              directQueryMs: timing.getDuration('direct_query'),
              persistMs: timing.getDuration('persist'),
              totalMs: timings.totalMs,
            },
        computeWorkerTimings: wasHybridRouted ? computeWorkerTimings : undefined,
        computeWorkerInfo: wasHybridRouted ? computeWorkerInfo : undefined,
        initializationTiming: wasColdStart ? this.initializationTiming?.getTimings() : null,
        instanceInfo: {
          instanceId: this.instanceId,
          instanceNumber: this.instanceNumber,
          requestCount: this.requestCount,
          hybridRoutedCount: this.hybridRoutedCount,
          directExecutedCount: this.directExecutedCount,
          isWarm: this.isWarm,
        },
      })
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        coldStart: wasColdStart,
        wasHybridRouted: !wasWarm,
        architecture: 'hybrid-cold-warm-routing',
      }, { status: 500 })
    }
  }

  /**
   * Handle write operation
   */
  private async handleWrite(sql: string): Promise<Response> {
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart
    const wasWarm = this.isWarm

    try {
      let result: QueryResult
      let wasHybridRouted: boolean
      let computeWorkerTimings: ComputeResponse['timings'] | undefined
      let computeWorkerInfo: ComputeResponse['workerInfo'] | undefined

      if (this.isWarm) {
        wasHybridRouted = false
        this.directExecutedCount++
        result = await this.executeDirect(sql, timing)
      } else {
        wasHybridRouted = true
        this.hybridRoutedCount++
        this.state.waitUntil(Promise.resolve().then(() => this.startWarmingUp()))

        const computeResult = await this.executeViaComputeWorker(sql, timing)

        if (!computeResult.success) {
          return Response.json({
            success: false,
            error: computeResult.error,
            coldStart: wasColdStart,
            wasHybridRouted: true,
            architecture: 'hybrid-cold-warm-routing',
          }, { status: 500 })
        }

        result = computeResult.result!
        computeWorkerTimings = computeResult.timings
        computeWorkerInfo = computeResult.workerInfo
      }

      timing.start('persist')
      this.persistQueryLog(sql, result, wasHybridRouted, 0, 0, timing.getTimings().totalMs)
      const key = `write-${Date.now()}`
      this.sql.exec(
        `INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
        key,
        JSON.stringify({ sql, result })
      )
      timing.end()

      this.coldStart = false
      const timings = timing.getTimings()

      return Response.json({
        success: true,
        affectedRows: result.affectedRows,
        coldStart: wasColdStart,
        wasHybridRouted,
        wasWarm,
        architecture: 'hybrid-cold-warm-routing',
        timings: wasHybridRouted
          ? {
              doTimings: {
                rpcCallMs: timing.getDuration('rpc_call'),
                parseResponseMs: timing.getDuration('parse_response'),
                persistMs: timing.getDuration('persist'),
                totalMs: timings.totalMs,
              },
              computeWorkerTimings,
              computeWorkerInfo,
            }
          : {
              doTimings: {
                directQueryMs: timing.getDuration('direct_query'),
                persistMs: timing.getDuration('persist'),
                totalMs: timings.totalMs,
              },
            },
      })
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        coldStart: wasColdStart,
        wasHybridRouted: !wasWarm,
        architecture: 'hybrid-cold-warm-routing',
      }, { status: 500 })
    }
  }

  /**
   * Force warm-up (for testing)
   */
  private async handleWarmup(): Promise<Response> {
    const timing = new TimingCollector()

    if (this.isWarm) {
      return Response.json({
        success: true,
        wasAlreadyWarm: true,
        architecture: 'hybrid-cold-warm-routing',
      })
    }

    timing.start('warmup')
    this.startWarmingUp()

    try {
      await this.pgPromise
      timing.end()

      return Response.json({
        success: true,
        wasAlreadyWarm: false,
        warmupDurationMs: timing.getDuration('warmup'),
        architecture: 'hybrid-cold-warm-routing',
      })
    } catch (error) {
      timing.end()
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        architecture: 'hybrid-cold-warm-routing',
      }, { status: 500 })
    }
  }

  /**
   * Fetch handler
   */
  async fetch(request: Request): Promise<Response> {
    this.requestCount++
    const url = new URL(request.url)

    // Status endpoint (instant)
    if (url.pathname === '/status') {
      return Response.json(this.getStatus())
    }

    // Warmup endpoint (force WASM load)
    if (url.pathname === '/warmup' && request.method === 'POST') {
      return this.handleWarmup()
    }

    // Query endpoint
    if (url.pathname === '/query' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleQuery(body.sql)
    }

    // Timing endpoint (detailed measurement)
    if (url.pathname === '/timing' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string; requestId?: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleTiming(body.sql, body.requestId)
    }

    // Write endpoint
    if (url.pathname === '/write' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleWrite(body.sql)
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}

/**
 * Worker that hosts the Hybrid DO
 */
const app = new Hono<{ Bindings: HybridDoEnv & { HYBRID_DO: DurableObjectNamespace } }>()

app.get('/', (c) => {
  return c.json({
    name: 'Hybrid DO Worker',
    description: 'Hosts the HybridDO - routes cold to compute worker, warm executes directly',
    architecture: 'hybrid-cold-warm-routing',
  })
})

app.get('/ping', (c) => {
  return c.json({ ok: true })
})

// Proxy all other requests to the DO
app.all('/*', async (c) => {
  const doId = c.env.HYBRID_DO.idFromName('hybrid-main')
  const stub = c.env.HYBRID_DO.get(doId)
  return stub.fetch(c.req.raw)
})

export default {
  fetch: app.fetch,
}
