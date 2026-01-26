/**
 * Traditional Durable Object (WASM inside DO)
 *
 * This is the baseline comparison - the traditional approach where
 * PGLite WASM lives inside the Durable Object.
 *
 * Key characteristics:
 * - PGLite WASM loaded inside the DO
 * - Cold start includes WASM initialization (~1-3 seconds)
 * - Self-contained - no external dependencies
 *
 * This serves as the comparison baseline for the new architecture.
 */

import { Hono } from 'hono'
import { PGliteLocal, type QueryResult } from './pglite-local'
import { TimingCollector, MODULE_LOAD_TIME, MODULE_ID } from './shared/timing'
import type { TraditionalDoEnv } from './shared/types'

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
 * Traditional Durable Object - WASM inside
 */
export class TraditionalDO implements DurableObject {
  private pg: PGliteLocal | null = null
  private pgPromise: Promise<PGliteLocal> | null = null
  private initialized = false
  private initializationTiming: TimingCollector | null = null

  private instanceId: string
  private instanceCreatedAt: number
  private instanceNumber: number
  private requestCount = 0
  private coldStart = true

  private wasmLoadStartedAt: number | null = null
  private wasmLoadedAt: number | null = null

  constructor(private state: DurableObjectState) {
    DO_INSTANCE_COUNT++
    this.instanceNumber = DO_INSTANCE_COUNT
    this.instanceId = `traditional-do-${Date.now().toString(36)}-${DO_INSTANCE_COUNT}`
    this.instanceCreatedAt = Date.now()

    // Start WASM loading eagerly (but don't block constructor)
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
      const wasmModule = pgliteWasm
      timing.end({ wasmSize: 'pre-compiled' })

      timing.start('data_load')
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
      architecture: 'traditional-wasm-in-do',
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
        loadDurationMs:
          this.wasmLoadedAt && this.wasmLoadStartedAt ? this.wasmLoadedAt - this.wasmLoadStartedAt : null,
      },
      initializationTiming: this.initializationTiming?.getTimings() || null,
      note: 'This DO has WASM inside - cold start includes WASM init',
    }
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
        architecture: 'traditional-wasm-in-do',
        timings: {
          ensurePGLiteMs: timing.getDuration('ensure_pglite'),
          queryExecutionMs: timing.getDuration('query_execution'),
          totalMs: timings.totalMs,
        },
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
          architecture: 'traditional-wasm-in-do',
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

      return Response.json({
        success: true,
        rows: result.rows,
        affectedRows: result.affectedRows,
        coldStart: wasColdStart,
        architecture: 'traditional-wasm-in-do',
        doTimings: {
          ensurePGLiteMs: ensureEvent?.durationMs,
          queryExecutionMs: timing.getDuration('query_execution'),
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
          architecture: 'traditional-wasm-in-do',
        },
        { status: 500 }
      )
    }
  }

  /**
   * Handle write request
   */
  private async handleWrite(sql: string): Promise<Response> {
    const timing = new TimingCollector()
    const wasColdStart = this.coldStart

    try {
      timing.start('ensure_pglite')
      const pg = await this.ensurePGLite()
      timing.end()

      this.coldStart = false

      timing.start('execute_write')
      const result = await pg.query(sql)
      timing.end()

      const timings = timing.getTimings()

      return Response.json({
        success: true,
        affectedRows: result.affectedRows,
        coldStart: wasColdStart,
        architecture: 'traditional-wasm-in-do',
        timings: {
          ensurePGLiteMs: timing.getDuration('ensure_pglite'),
          executeWriteMs: timing.getDuration('execute_write'),
          totalMs: timings.totalMs,
        },
      })
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          coldStart: wasColdStart,
          architecture: 'traditional-wasm-in-do',
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

    // Query endpoint
    if (url.pathname === '/query' && request.method === 'POST') {
      const body = (await request.json()) as { sql: string }
      if (!body.sql) {
        return Response.json({ error: true, message: 'Missing sql parameter' }, { status: 400 })
      }
      return this.handleQuery(body.sql)
    }

    // Timing endpoint (detailed cold start measurement)
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
 * Worker that hosts the Traditional DO
 */
const app = new Hono<{ Bindings: TraditionalDoEnv & { TRADITIONAL_DO: DurableObjectNamespace } }>()

app.get('/', (c) => {
  return c.json({
    name: 'Traditional DO Worker',
    description: 'Hosts the TraditionalDO - DO with WASM inside (baseline)',
    architecture: 'traditional-wasm-in-do',
  })
})

app.get('/ping', (c) => {
  return c.json({ ok: true })
})

// Proxy all other requests to the DO
app.all('/*', async (c) => {
  const doId = c.env.TRADITIONAL_DO.idFromName('traditional-main')
  const stub = c.env.TRADITIONAL_DO.get(doId)
  return stub.fetch(c.req.raw)
})

export default {
  fetch: app.fetch,
}
