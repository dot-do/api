/**
 * PGLite Factory Durable Object
 *
 * Maintains a warm PGLite instance and provides detailed timing information.
 * This DO explores:
 * 1. Whether keeping a DO warm reduces cold start for subsequent requests
 * 2. The overhead of using a factory pattern vs direct DO access
 * 3. How long WASM initialization actually takes in production
 */

import { TimingCollector, MODULE_LOAD_TIME, MODULE_ID } from './timing'
import { PGliteLocal, type QueryResult } from './pglite-local'

// @ts-ignore - Wrangler handles these imports
import pgliteWasm from './pglite-assets/pglite.wasm'
// @ts-ignore - Wrangler handles these imports
import pgliteData from './pglite-assets/pglite.data'

/**
 * Module-level tracking
 */
const DO_MODULE_LOADED_AT = Date.now()
let DO_INSTANCE_COUNT = 0

export class FactoryDO implements DurableObject {
  private pg: PGliteLocal | null = null
  private pgPromise: Promise<PGliteLocal> | null = null
  private initialized = false
  private initializationTiming: TimingCollector | null = null

  // Instance tracking
  private instanceId: string
  private instanceCreatedAt: number
  private instanceNumber: number
  private requestCount = 0
  private coldStart = true

  // Timing tracking
  private wasmLoadStartedAt: number | null = null
  private wasmLoadedAt: number | null = null

  constructor(private state: DurableObjectState) {
    DO_INSTANCE_COUNT++
    this.instanceNumber = DO_INSTANCE_COUNT
    // Use timestamp + counter instead of crypto.randomUUID() to avoid issues
    this.instanceId = `do-${Date.now().toString(36)}-${DO_INSTANCE_COUNT}`
    this.instanceCreatedAt = Date.now()

    // Start warm-up eagerly (but don't block constructor)
    this.wasmLoadStartedAt = Date.now()
    this.pgPromise = this.initPGLite()
  }

  /**
   * Initialize PGLite with detailed timing
   */
  private async initPGLite(): Promise<PGliteLocal> {
    if (this.pg) return this.pg

    const timing = new TimingCollector()
    this.initializationTiming = timing

    try {
      timing.start('wasm_load')
      // WASM is already compiled via static import (CompiledWasm rule)
      // This just tracks the time to reference it
      const wasmModule = pgliteWasm
      timing.end({ wasmSize: 'pre-compiled' })

      timing.start('data_load')
      // Data is loaded as ArrayBuffer via static import (Data rule)
      const dataBuffer = pgliteData
      timing.end({ dataSize: dataBuffer.byteLength })

      timing.start('module_init')
      this.pg = await PGliteLocal.create({
        wasmModule,
        fsBundle: dataBuffer,
        debug: false,
      })
      timing.end()

      this.wasmLoadedAt = Date.now()
      this.initialized = true

      // Run a simple query to fully warm the instance
      timing.start('first_query')
      await this.pg.query('SELECT 1')
      timing.end()

      return this.pg
    } catch (error) {
      console.error('PGLite initialization failed:', error)
      throw error
    }
  }

  /**
   * Ensure PGLite is ready
   */
  private async ensurePGLite(): Promise<PGliteLocal> {
    if (this.pg) return this.pg
    if (!this.pgPromise) {
      this.pgPromise = this.initPGLite()
    }
    this.pg = await this.pgPromise
    return this.pg
  }

  /**
   * Get instance status (instant, no PGLite wait)
   */
  private getStatus(): object {
    const now = Date.now()
    return {
      success: true,
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
      pglite: {
        initialized: this.initialized,
        initializing: this.pgPromise !== null && !this.initialized,
        wasmLoadStartedAt: this.wasmLoadStartedAt ? new Date(this.wasmLoadStartedAt).toISOString() : null,
        wasmLoadedAt: this.wasmLoadedAt ? new Date(this.wasmLoadedAt).toISOString() : null,
        loadDurationMs: this.wasmLoadedAt && this.wasmLoadStartedAt
          ? this.wasmLoadedAt - this.wasmLoadStartedAt
          : null,
        timeSinceLoadMs: this.wasmLoadedAt ? now - this.wasmLoadedAt : null,
      },
      initializationTiming: this.initializationTiming?.getTimings() || null,
    }
  }

  /**
   * Handle warmup request
   */
  private async handleWarmup(): Promise<Response> {
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart

    timing.start('ensure_pglite')
    await this.ensurePGLite()
    timing.end()

    // After first warmup, no longer cold
    this.coldStart = false

    const timings = timing.getTimings()

    return Response.json({
      success: true,
      wasColdStart,
      warmupMs: timings.events.find((e) => e.name === 'ensure_pglite')?.durationMs,
      status: this.getStatus(),
    })
  }

  /**
   * Handle query request
   */
  private async handleQuery(sql: string): Promise<Response> {
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart

    try {
      timing.start('ensure_pglite')
      const pg = await this.ensurePGLite()
      timing.end()

      this.coldStart = false

      timing.start('query_execution')
      const result = await pg.query(sql)
      timing.end()

      const timings = timing.getTimings()

      return Response.json({
        success: true,
        rows: result.rows,
        affectedRows: result.affectedRows,
        coldStart: wasColdStart,
        queryTimings: {
          ensurePGLiteMs: timings.events.find((e) => e.name === 'ensure_pglite')?.durationMs,
          queryExecutionMs: timings.events.find((e) => e.name === 'query_execution')?.durationMs,
          totalMs: timings.totalMs,
        },
      })
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          coldStart: wasColdStart,
        },
        { status: 500 }
      )
    }
  }

  /**
   * Handle timing request (detailed cold start measurement)
   */
  private async handleTiming(sql: string, requestId?: string): Promise<Response> {
    const timing = new TimingCollector(requestId)
    const wasColdStart = this.coldStart

    try {
      timing.start('ensure_pglite')
      const pg = await this.ensurePGLite()
      const ensureEvent = timing.end()

      this.coldStart = false

      timing.start('query_execution')
      const result = await pg.query(sql)
      timing.end()

      const timings = timing.getTimings()
      timings.coldStart = wasColdStart

      return Response.json({
        success: true,
        rows: result.rows,
        affectedRows: result.affectedRows,
        coldStart: wasColdStart,
        doTimings: {
          ensurePGLiteMs: ensureEvent?.durationMs,
          queryExecutionMs: timings.events.find((e) => e.name === 'query_execution')?.durationMs,
          totalMs: timings.totalMs,
        },
        initializationTiming: wasColdStart ? this.initializationTiming?.getTimings() : null,
        instanceInfo: {
          instanceId: this.instanceId,
          instanceNumber: this.instanceNumber,
          requestCount: this.requestCount,
        },
      })
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          coldStart: wasColdStart,
        },
        { status: 500 }
      )
    }
  }

  /**
   * Fetch handler
   */
  async fetch(request: Request): Promise<Response> {
    this.requestCount++
    const url = new URL(request.url)

    // Status endpoint (instant, no PGLite wait)
    if (url.pathname === '/status') {
      return Response.json(this.getStatus())
    }

    // Warmup endpoint
    if (url.pathname === '/warmup' && request.method === 'POST') {
      return this.handleWarmup()
    }

    // Query endpoint
    if (url.pathname === '/query' && request.method === 'POST') {
      const body = await request.json() as { sql: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleQuery(body.sql)
    }

    // Timing endpoint (detailed cold start measurement)
    if (url.pathname === '/timing' && request.method === 'POST') {
      const body = await request.json() as { sql: string; requestId?: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleTiming(body.sql, body.requestId)
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}
