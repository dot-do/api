/**
 * Lazy WASM Loading Durable Object
 *
 * IMPORTANT: This architecture does NOT work in Cloudflare Workers!
 *
 * Cloudflare Workers block runtime WASM compilation for security reasons:
 *   "WebAssembly.compile(): Wasm code generation disallowed by embedder"
 *
 * This implementation demonstrates the concept but will always fail to load
 * WASM dynamically. In practice, this DO will permanently delegate to the
 * compute worker (which has statically bundled WASM).
 *
 * For a WORKING alternative, see `hybrid-do.ts` which:
 * - Statically bundles WASM (required by Workers)
 * - Defers loading until first request
 * - Delegates to compute worker during warmup
 *
 * Original Design (kept for educational purposes):
 * - NO static WASM import (fast cold start, smaller bundle)
 * - First requests delegate to Compute Worker (instant response)
 * - Background: Fetch WASM from R2 + Cloudflare Cache
 * - Once loaded: Direct execution (fastest, no RPC overhead)
 */

import { Hono } from 'hono'
import { PGliteLocal, type QueryResult } from './pglite-local'
import { TimingCollector, MODULE_LOAD_TIME, MODULE_ID } from './shared/timing'
import type { HybridDoEnv, ComputeResponse } from './shared/types'

// Import ONLY the JS module factory - NOT the WASM or data files!
// The WASM and data will be fetched from R2/Cache on-demand
// @ts-ignore - JS module import
import PostgresModFactory from './pglite-assets/pglite.js'

/**
 * Environment bindings for Lazy WASM DO
 */
export interface LazyWasmDoEnv extends HybridDoEnv {
  WASM_BUCKET: R2Bucket
}

/**
 * Module-level tracking
 */
const DO_MODULE_LOADED_AT = Date.now()
let DO_INSTANCE_COUNT = 0

/**
 * WASM loading states
 */
type WasmLoadState =
  | 'not_started'
  | 'loading_from_cache'
  | 'loading_from_r2'
  | 'compiling'
  | 'initializing'
  | 'ready'
  | 'failed'

/**
 * Lazy WASM Loading Durable Object
 */
export class LazyWasmDO implements DurableObject {
  private pglite: PGliteLocal | null = null
  private wasmLoading: Promise<void> | null = null
  private wasmLoadState: WasmLoadState = 'not_started'
  private wasmLoadError: string | null = null

  // Timing tracking
  private wasmLoadStartedAt: number | null = null
  private wasmLoadedAt: number | null = null
  private wasmLoadTimings: {
    cacheCheckMs?: number
    r2FetchMs?: number
    dataFetchMs?: number
    compileMs?: number
    initMs?: number
    totalMs?: number
  } = {}

  // Instance tracking
  private instanceId: string
  private instanceCreatedAt: number
  private instanceNumber: number
  private requestCount = 0
  private coldStart = true

  // Request routing tracking
  private delegatedRequestCount = 0
  private localExecutionCount = 0

  // DO SQLite for persistence
  private sql: SqlStorage

  constructor(
    private state: DurableObjectState,
    private env: LazyWasmDoEnv
  ) {
    DO_INSTANCE_COUNT++
    this.instanceNumber = DO_INSTANCE_COUNT
    this.instanceId = `lazy-wasm-do-${Date.now().toString(36)}-${DO_INSTANCE_COUNT}`
    this.instanceCreatedAt = Date.now()
    this.sql = state.storage.sql

    // Initialize schema synchronously (fast - no WASM!)
    this.initSchema()

    // Note: We do NOT start WASM loading in constructor
    // We wait for first request, then load in background while returning response from compute worker
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
        was_delegated INTEGER,
        execution_ms REAL,
        total_ms REAL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
  }

  /**
   * Check if WASM/PGLite is ready for direct execution
   */
  private get isWasmReady(): boolean {
    return this.pglite !== null && this.wasmLoadState === 'ready'
  }

  /**
   * Load WASM from Cloudflare Cache or R2 (background operation)
   * This is the core of the lazy loading strategy
   */
  private async loadWasmFromCacheOrR2(): Promise<void> {
    if (this.wasmLoading) return // Already loading
    if (this.pglite) return // Already loaded

    this.wasmLoadStartedAt = performance.now()
    const overallStart = performance.now()

    try {
      // Try Cloudflare Cache first (fastest)
      this.wasmLoadState = 'loading_from_cache'
      const cacheStart = performance.now()
      const cache = await caches.open('pglite-wasm-v1')

      // Use fake URLs for cache keys (cache API requires URLs)
      const wasmCacheKey = 'https://wasm-cache.internal/pglite.wasm'
      const dataCacheKey = 'https://wasm-cache.internal/pglite.data'

      let wasmResponse = await cache.match(wasmCacheKey)
      let dataResponse = await cache.match(dataCacheKey)
      this.wasmLoadTimings.cacheCheckMs = performance.now() - cacheStart

      // If not in cache, fetch from R2
      if (!wasmResponse || !dataResponse) {
        this.wasmLoadState = 'loading_from_r2'
        const r2Start = performance.now()

        // Fetch from R2 in parallel
        const [wasmObject, dataObject] = await Promise.all([
          !wasmResponse ? this.env.WASM_BUCKET.get('pglite.wasm') : Promise.resolve(null),
          !dataResponse ? this.env.WASM_BUCKET.get('pglite.data') : Promise.resolve(null),
        ])

        this.wasmLoadTimings.r2FetchMs = performance.now() - r2Start

        if (!wasmResponse && !wasmObject) {
          throw new Error('pglite.wasm not found in R2 bucket')
        }
        if (!dataResponse && !dataObject) {
          throw new Error('pglite.data not found in R2 bucket')
        }

        // Convert R2 objects to responses and cache them
        if (wasmObject) {
          wasmResponse = new Response(wasmObject.body, {
            headers: {
              'Content-Type': 'application/wasm',
              'Content-Length': wasmObject.size.toString(),
            },
          })
          // Cache for future requests (don't await - fire and forget)
          this.state.waitUntil(cache.put(wasmCacheKey, wasmResponse.clone()))
        }

        if (dataObject) {
          dataResponse = new Response(dataObject.body, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': dataObject.size.toString(),
            },
          })
          // Cache for future requests (don't await - fire and forget)
          this.state.waitUntil(cache.put(dataCacheKey, dataResponse.clone()))
        }
      }

      // Read the data bundle
      const dataStart = performance.now()
      const dataBuffer = await dataResponse!.arrayBuffer()
      this.wasmLoadTimings.dataFetchMs = performance.now() - dataStart

      // Compile WASM module
      this.wasmLoadState = 'compiling'
      const compileStart = performance.now()
      const wasmBytes = await wasmResponse!.arrayBuffer()
      // @ts-ignore - WebAssembly.compile exists in Workers but types may be incomplete
      const wasmModule = await WebAssembly.compile(wasmBytes) as WebAssembly.Module
      this.wasmLoadTimings.compileMs = performance.now() - compileStart

      // Initialize PGLite
      this.wasmLoadState = 'initializing'
      const initStart = performance.now()
      this.pglite = await PGliteLocal.create({
        wasmModule,
        fsBundle: dataBuffer,
        debug: false,
      })
      this.wasmLoadTimings.initMs = performance.now() - initStart

      // Run a warmup query
      await this.pglite.query('SELECT 1')

      this.wasmLoadedAt = performance.now()
      this.wasmLoadTimings.totalMs = performance.now() - overallStart
      this.wasmLoadState = 'ready'

      console.log(`[LazyWasmDO] WASM loaded in ${this.wasmLoadTimings.totalMs.toFixed(2)}ms`, {
        cacheCheckMs: this.wasmLoadTimings.cacheCheckMs,
        r2FetchMs: this.wasmLoadTimings.r2FetchMs,
        dataFetchMs: this.wasmLoadTimings.dataFetchMs,
        compileMs: this.wasmLoadTimings.compileMs,
        initMs: this.wasmLoadTimings.initMs,
      })
    } catch (error) {
      this.wasmLoadState = 'failed'
      this.wasmLoadError = error instanceof Error ? error.message : String(error)
      console.error('[LazyWasmDO] Failed to load WASM:', this.wasmLoadError)
      throw error
    }
  }

  /**
   * Start loading WASM in background (non-blocking)
   */
  private startBackgroundWasmLoad(): void {
    if (this.wasmLoading || this.pglite) return

    this.wasmLoading = this.loadWasmFromCacheOrR2()
    // Use waitUntil to ensure the load completes even if the request finishes
    this.state.waitUntil(this.wasmLoading.catch(() => {
      // Error already logged in loadWasmFromCacheOrR2
    }))
  }

  /**
   * Execute query locally using loaded PGLite
   */
  private async executeLocal(sql: string, timing: TimingCollector): Promise<QueryResult> {
    if (!this.pglite) {
      throw new Error('PGLite not ready for local execution')
    }

    timing.start('local_query')
    const result = await this.pglite.query(sql)
    timing.end()

    return result
  }

  /**
   * Delegate query to compute worker (while WASM loads)
   */
  private async delegateToComputeWorker(sql: string, timing: TimingCollector): Promise<ComputeResponse> {
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
   * Persist query log
   */
  private persistQueryLog(
    sql: string,
    result: QueryResult | undefined,
    wasDelegated: boolean,
    executionMs: number,
    totalMs: number
  ): void {
    this.sql.exec(
      `INSERT INTO query_log (sql, result, was_delegated, execution_ms, total_ms) VALUES (?, ?, ?, ?, ?)`,
      sql,
      JSON.stringify(result?.rows || []),
      wasDelegated ? 1 : 0,
      executionMs,
      totalMs
    )
  }

  /**
   * Get instance status
   */
  private getStatus(): object {
    const now = Date.now()

    const kvCount = this.sql.exec('SELECT COUNT(*) as count FROM kv').one() as { count: number }
    const queryCount = this.sql.exec('SELECT COUNT(*) as count FROM query_log').one() as { count: number }
    const delegatedCount = this.sql.exec('SELECT COUNT(*) as count FROM query_log WHERE was_delegated = 1').one() as { count: number }
    const localCount = this.sql.exec('SELECT COUNT(*) as count FROM query_log WHERE was_delegated = 0').one() as { count: number }

    return {
      success: true,
      architecture: 'lazy-wasm-do',
      description: 'WASM loaded on-demand from R2/Cache, not bundled statically',
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
      wasmStatus: {
        state: this.wasmLoadState,
        isReady: this.isWasmReady,
        loadStartedAt: this.wasmLoadStartedAt ? this.wasmLoadStartedAt.toFixed(2) + 'ms' : null,
        loadedAt: this.wasmLoadedAt ? this.wasmLoadedAt.toFixed(2) + 'ms' : null,
        loadTimings: this.wasmLoadTimings,
        error: this.wasmLoadError,
      },
      requestRouting: {
        delegatedCount: this.delegatedRequestCount,
        localExecutionCount: this.localExecutionCount,
        totalQueries: delegatedCount.count + localCount.count,
      },
      persistence: {
        kvEntries: kvCount.count,
        queryLogEntries: queryCount.count,
      },
      note: 'Lazy WASM DO: WASM fetched from R2/Cache on-demand, not bundled',
    }
  }

  /**
   * Handle query - core lazy loading logic
   */
  async query(sql: string, params?: unknown[]): Promise<Response> {
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart
    const wasWasmReady = this.isWasmReady

    try {
      let result: QueryResult
      let wasDelegated: boolean
      let computeWorkerTimings: ComputeResponse['timings'] | undefined
      let computeWorkerInfo: ComputeResponse['workerInfo'] | undefined

      if (this.isWasmReady) {
        // WASM is ready - execute locally (fastest path)
        wasDelegated = false
        this.localExecutionCount++

        result = await this.executeLocal(sql, timing)
      } else {
        // WASM not ready - delegate to compute worker while loading
        wasDelegated = true
        this.delegatedRequestCount++

        // Start loading WASM in background if not already
        if (!this.wasmLoading) {
          this.startBackgroundWasmLoad()
        }

        // Get result from compute worker NOW (instant response)
        const computeResult = await this.delegateToComputeWorker(sql, timing)

        if (!computeResult.success) {
          return Response.json({
            success: false,
            error: computeResult.error,
            coldStart: wasColdStart,
            wasDelegated: true,
            wasmStatus: this.wasmLoadState,
            architecture: 'lazy-wasm-do',
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
        wasDelegated,
        timing.getDuration('local_query') || computeWorkerTimings?.executionMs || 0,
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
        wasDelegated,
        wasWasmReady,
        wasmStatus: this.wasmLoadState,
        wasmLoading: this.wasmLoading !== null && !this.isWasmReady,
        architecture: 'lazy-wasm-do',
        timings: wasDelegated
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
                localQueryMs: timing.getDuration('local_query'),
                persistMs: timing.getDuration('persist'),
                totalMs: timings.totalMs,
              },
              wasmLoadTimings: this.wasmLoadTimings,
            },
        instanceInfo: {
          instanceId: this.instanceId,
          instanceNumber: this.instanceNumber,
          requestCount: this.requestCount,
          delegatedCount: this.delegatedRequestCount,
          localExecutionCount: this.localExecutionCount,
        },
      })
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        coldStart: wasColdStart,
        wasDelegated: !wasWasmReady,
        wasmStatus: this.wasmLoadState,
        architecture: 'lazy-wasm-do',
      }, { status: 500 })
    }
  }

  /**
   * Handle timing request (detailed measurement)
   */
  private async handleTiming(sql: string, requestId?: string): Promise<Response> {
    const timing = new TimingCollector(requestId)
    const wasColdStart = this.coldStart
    const wasWasmReady = this.isWasmReady

    try {
      let result: QueryResult
      let wasDelegated: boolean
      let computeWorkerTimings: ComputeResponse['timings'] | undefined
      let computeWorkerInfo: ComputeResponse['workerInfo'] | undefined

      if (this.isWasmReady) {
        wasDelegated = false
        this.localExecutionCount++
        result = await this.executeLocal(sql, timing)
      } else {
        wasDelegated = true
        this.delegatedRequestCount++

        if (!this.wasmLoading) {
          this.startBackgroundWasmLoad()
        }

        const computeResult = await this.delegateToComputeWorker(sql, timing)

        if (!computeResult.success) {
          return Response.json({
            success: false,
            error: computeResult.error,
            coldStart: wasColdStart,
            wasDelegated: true,
            wasmStatus: this.wasmLoadState,
            architecture: 'lazy-wasm-do',
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
        wasDelegated,
        timing.getDuration('local_query') || computeWorkerTimings?.executionMs || 0,
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
        wasDelegated,
        wasWasmReady,
        wasmStatus: this.wasmLoadState,
        wasmLoading: this.wasmLoading !== null && !this.isWasmReady,
        architecture: 'lazy-wasm-do',
        doTimings: wasDelegated
          ? {
              rpcCallMs: timing.getDuration('rpc_call'),
              parseResponseMs: timing.getDuration('parse_response'),
              persistMs: timing.getDuration('persist'),
              totalMs: timings.totalMs,
            }
          : {
              localQueryMs: timing.getDuration('local_query'),
              persistMs: timing.getDuration('persist'),
              totalMs: timings.totalMs,
            },
        computeWorkerTimings: wasDelegated ? computeWorkerTimings : undefined,
        computeWorkerInfo: wasDelegated ? computeWorkerInfo : undefined,
        wasmLoadTimings: this.wasmLoadTimings,
        instanceInfo: {
          instanceId: this.instanceId,
          instanceNumber: this.instanceNumber,
          requestCount: this.requestCount,
          delegatedCount: this.delegatedRequestCount,
          localExecutionCount: this.localExecutionCount,
          wasmLoadState: this.wasmLoadState,
        },
      })
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        coldStart: wasColdStart,
        wasDelegated: !wasWasmReady,
        wasmStatus: this.wasmLoadState,
        architecture: 'lazy-wasm-do',
      }, { status: 500 })
    }
  }

  /**
   * Handle write operation
   */
  private async handleWrite(sql: string): Promise<Response> {
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart
    const wasWasmReady = this.isWasmReady

    try {
      let result: QueryResult
      let wasDelegated: boolean
      let computeWorkerTimings: ComputeResponse['timings'] | undefined
      let computeWorkerInfo: ComputeResponse['workerInfo'] | undefined

      if (this.isWasmReady) {
        wasDelegated = false
        this.localExecutionCount++
        result = await this.executeLocal(sql, timing)
      } else {
        wasDelegated = true
        this.delegatedRequestCount++

        if (!this.wasmLoading) {
          this.startBackgroundWasmLoad()
        }

        const computeResult = await this.delegateToComputeWorker(sql, timing)

        if (!computeResult.success) {
          return Response.json({
            success: false,
            error: computeResult.error,
            coldStart: wasColdStart,
            wasDelegated: true,
            wasmStatus: this.wasmLoadState,
            architecture: 'lazy-wasm-do',
          }, { status: 500 })
        }

        result = computeResult.result!
        computeWorkerTimings = computeResult.timings
        computeWorkerInfo = computeResult.workerInfo
      }

      timing.start('persist')
      this.persistQueryLog(sql, result, wasDelegated, 0, timing.getTimings().totalMs)
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
        wasDelegated,
        wasWasmReady,
        wasmStatus: this.wasmLoadState,
        architecture: 'lazy-wasm-do',
        timings: wasDelegated
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
                localQueryMs: timing.getDuration('local_query'),
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
        wasDelegated: !wasWasmReady,
        wasmStatus: this.wasmLoadState,
        architecture: 'lazy-wasm-do',
      }, { status: 500 })
    }
  }

  /**
   * Force WASM load (for testing/prewarming)
   */
  private async handleForceLoad(): Promise<Response> {
    const timing = new TimingCollector()

    if (this.isWasmReady) {
      return Response.json({
        success: true,
        wasAlreadyLoaded: true,
        wasmStatus: this.wasmLoadState,
        wasmLoadTimings: this.wasmLoadTimings,
        architecture: 'lazy-wasm-do',
      })
    }

    timing.start('force_load')

    try {
      if (!this.wasmLoading) {
        this.startBackgroundWasmLoad()
      }

      // Wait for WASM to load
      await this.wasmLoading
      timing.end()

      return Response.json({
        success: true,
        wasAlreadyLoaded: false,
        forcedLoadDurationMs: timing.getDuration('force_load'),
        wasmStatus: this.wasmLoadState,
        wasmLoadTimings: this.wasmLoadTimings,
        architecture: 'lazy-wasm-do',
      })
    } catch (error) {
      timing.end()
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        wasmStatus: this.wasmLoadState,
        wasmLoadError: this.wasmLoadError,
        architecture: 'lazy-wasm-do',
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

    // Force WASM load endpoint (for testing)
    if (url.pathname === '/force-load' && request.method === 'POST') {
      return this.handleForceLoad()
    }

    // Query endpoint
    if (url.pathname === '/query' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string; params?: unknown[] }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.query(body.sql, body.params)
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
 * Worker that hosts the Lazy WASM DO
 */
const app = new Hono<{ Bindings: LazyWasmDoEnv & { LAZY_WASM_DO: DurableObjectNamespace } }>()

app.get('/', (c) => {
  return c.json({
    name: 'Lazy WASM DO Worker',
    description: 'Hosts the LazyWasmDO - WASM loaded on-demand from R2/Cache',
    architecture: 'lazy-wasm-do',
    features: [
      'NO static WASM bundled (fast cold start)',
      'First requests delegate to compute worker',
      'WASM loaded from R2/Cache in background',
      'Once loaded: direct execution (fastest)',
    ],
    expectedBehavior: {
      'Request 1': 'Cold start, delegate to compute worker (~300ms)',
      'Request 2-5': 'Still delegating while WASM loads (~30ms)',
      'Request 6+': 'WASM loaded, direct execution (~10ms)',
    },
  })
})

app.get('/ping', (c) => {
  return c.json({ ok: true })
})

// Proxy all other requests to the DO
app.all('/*', async (c) => {
  // Support tenant-specific DOs
  const tenantId = c.req.header('X-Tenant-Id') || 'default'
  const doId = c.env.LAZY_WASM_DO.idFromName(`lazy-wasm-${tenantId}`)
  const stub = c.env.LAZY_WASM_DO.get(doId)
  return stub.fetch(c.req.raw)
})

export default {
  fetch: app.fetch,
}
