/**
 * PGLite Compute Worker
 *
 * A stateless worker that holds the PGLite WASM module and executes SQL queries.
 * This is the "compute" part of the "Stateful DO + Stateless Compute Worker" architecture.
 *
 * Key characteristics:
 * - Holds PGLite WASM (warm after first request)
 * - Stateless - no persistence (that's the DO's job)
 * - In-memory PGLite instance
 * - Exposes RPC methods: execute, executeBatch
 * - Starts WASM loading eagerly at module level
 *
 * The insight: by keeping WASM in a separate Worker, DOs can have instant cold starts.
 * The WASM worker stays warm in Cloudflare's pool, ready to serve compute requests.
 */

import { Hono } from 'hono'
import { PGliteLocal, type QueryResult } from './pglite-local'
import { TimingCollector, MODULE_LOAD_TIME, MODULE_ID } from './shared/timing'
import type { ComputeRequest, ComputeResponse, ComputeWorkerEnv } from './shared/types'

// @ts-ignore - Wrangler handles these imports
import pgliteWasm from './pglite-assets/pglite.wasm'
// @ts-ignore - Wrangler handles these imports
import pgliteData from './pglite-assets/pglite.data'

/**
 * Module-level state tracking
 */
const WORKER_CREATED_AT = Date.now()
let REQUEST_COUNT = 0
let KEEP_WARM_COUNT = 0
let LAST_KEEP_WARM_AT: number | null = null
let WORKER_ID = `compute-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Eagerly start PGLite initialization at module load time.
 * This ensures the WASM is ready when the first request arrives.
 */
let pgInstance: PGliteLocal | null = null
let pgInitPromise: Promise<PGliteLocal> | null = null
let pgInitStartedAt: number | null = null
let pgInitCompletedAt: number | null = null
let pgColdStart = true

async function ensurePGLite(): Promise<PGliteLocal> {
  if (pgInstance) return pgInstance

  if (!pgInitPromise) {
    pgInitStartedAt = Date.now()
    pgInitPromise = PGliteLocal.create({
      wasmModule: pgliteWasm,
      fsBundle: pgliteData,
      debug: false,
    }).then((pg) => {
      pgInstance = pg
      pgInitCompletedAt = Date.now()
      return pg
    })
  }

  return pgInitPromise
}

// NOTE: We CANNOT start warming in global scope in Cloudflare Workers
// Async operations are not allowed in global scope
// The warming happens on first request instead
// pgInitPromise = ensurePGLite() // DISABLED - not allowed in Workers

/**
 * Create the Hono app
 */
function createApp() {
  const app = new Hono<{ Bindings: ComputeWorkerEnv }>()

  /**
   * Health check / status
   */
  app.get('/', (c) => {
    const now = Date.now()
    return c.json({
      name: 'PGLite Compute Worker',
      version: '1.0.0',
      description: 'Stateless compute worker holding PGLite WASM',
      workerId: WORKER_ID,
      moduleId: MODULE_ID,
      moduleLoadTime: new Date(MODULE_LOAD_TIME).toISOString(),
      workerCreatedAt: new Date(WORKER_CREATED_AT).toISOString(),
      workerAgeMs: now - WORKER_CREATED_AT,
      requestCount: REQUEST_COUNT,
      keepWarm: {
        count: KEEP_WARM_COUNT,
        lastAt: LAST_KEEP_WARM_AT ? new Date(LAST_KEEP_WARM_AT).toISOString() : null,
        lastAgoMs: LAST_KEEP_WARM_AT ? now - LAST_KEEP_WARM_AT : null,
      },
      pglite: {
        initialized: pgInstance !== null,
        initializing: pgInitPromise !== null && pgInstance === null,
        initStartedAt: pgInitStartedAt ? new Date(pgInitStartedAt).toISOString() : null,
        initCompletedAt: pgInitCompletedAt ? new Date(pgInitCompletedAt).toISOString() : null,
        initDurationMs: pgInitStartedAt && pgInitCompletedAt ? pgInitCompletedAt - pgInitStartedAt : null,
      },
      endpoints: {
        execute: {
          method: 'POST',
          path: '/execute',
          body: { sql: 'SELECT 1+1 as result', params: [], requestId: 'optional-id' },
        },
        executeBatch: {
          method: 'POST',
          path: '/execute-batch',
          body: { statements: ['SELECT 1', 'SELECT 2'], requestId: 'optional-id' },
        },
        keepWarm: {
          method: 'POST',
          path: '/keep-warm',
          description: 'Keep the compute worker warm by running a simple query',
        },
      },
    })
  })

  /**
   * Ping endpoint for health checks
   */
  app.get('/ping', (c) => {
    return c.json({
      ok: true,
      workerId: WORKER_ID,
      workerAgeMs: Date.now() - WORKER_CREATED_AT,
      pgliteReady: pgInstance !== null,
    })
  })

  /**
   * Keep-warm endpoint - runs a simple query to keep WASM loaded and ready
   * This is called periodically (via alarm or external cron) to prevent cold starts
   */
  app.post('/keep-warm', async (c) => {
    KEEP_WARM_COUNT++
    LAST_KEEP_WARM_AT = Date.now()
    const timing = new TimingCollector()
    const wasColdStart = pgColdStart

    try {
      timing.start('ensure_pglite')
      const pg = await ensurePGLite()
      timing.end()

      // Mark as no longer cold after first successful init
      if (pgColdStart) {
        pgColdStart = false
      }

      // Run a simple query to keep the engine warmed
      timing.start('warmup_query')
      await pg.query('SELECT 1 as keepalive')
      timing.end()

      const timings = timing.getTimings()

      return c.json({
        success: true,
        workerId: WORKER_ID,
        workerAgeMs: Date.now() - WORKER_CREATED_AT,
        wasColdStart,
        keepWarmCount: KEEP_WARM_COUNT,
        requestCount: REQUEST_COUNT,
        pgliteInitialized: pgInstance !== null,
        timings: {
          ensurePGLiteMs: timing.getDuration('ensure_pglite'),
          warmupQueryMs: timing.getDuration('warmup_query'),
          totalMs: timings.totalMs,
        },
      })
    } catch (error) {
      return c.json({
        success: false,
        workerId: WORKER_ID,
        workerAgeMs: Date.now() - WORKER_CREATED_AT,
        wasColdStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 500)
    }
  })

  /**
   * Execute a single SQL query
   * This is the main RPC endpoint called by State DOs
   */
  app.post('/execute', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()
    const wasColdStart = pgColdStart

    try {
      timing.start('parse_body')
      const body = await c.req.json() as { sql: string; params?: unknown[]; requestId?: string }
      timing.end()

      if (!body.sql) {
        return c.json({ success: false, error: 'Missing sql parameter' }, 400)
      }

      timing.start('ensure_pglite')
      const pg = await ensurePGLite()
      timing.end()

      // After first successful init, no longer cold
      if (pgColdStart) {
        pgColdStart = false
      }

      timing.start('execute_query')
      const result = await pg.query(body.sql)
      timing.end()

      const timings = timing.getTimings()

      const response: ComputeResponse = {
        success: true,
        result,
        timings: {
          ensurePGLiteMs: timing.getDuration('ensure_pglite') || 0,
          executionMs: timing.getDuration('execute_query') || 0,
          totalMs: timings.totalMs,
        },
        workerInfo: {
          workerId: WORKER_ID,
          instanceAge: Date.now() - WORKER_CREATED_AT,
          requestCount: REQUEST_COUNT,
          wasColdStart,
        },
      }

      return c.json(response)
    } catch (error) {
      const timings = timing.getTimings()
      const response: ComputeResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timings: {
          ensurePGLiteMs: timing.getDuration('ensure_pglite') || 0,
          executionMs: timing.getDuration('execute_query') || 0,
          totalMs: timings.totalMs,
        },
        workerInfo: {
          workerId: WORKER_ID,
          instanceAge: Date.now() - WORKER_CREATED_AT,
          requestCount: REQUEST_COUNT,
          wasColdStart,
        },
      }
      return c.json(response, 500)
    }
  })

  /**
   * Execute multiple SQL statements in sequence
   */
  app.post('/execute-batch', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()
    const wasColdStart = pgColdStart

    try {
      timing.start('parse_body')
      const body = await c.req.json() as { statements: string[]; requestId?: string }
      timing.end()

      if (!body.statements || !Array.isArray(body.statements)) {
        return c.json({ success: false, error: 'Missing statements array' }, 400)
      }

      timing.start('ensure_pglite')
      const pg = await ensurePGLite()
      timing.end()

      if (pgColdStart) {
        pgColdStart = false
      }

      timing.start('execute_batch')
      const results: QueryResult[] = []
      for (const sql of body.statements) {
        const result = await pg.query(sql)
        results.push(result)
      }
      timing.end()

      const timings = timing.getTimings()

      const response: ComputeResponse = {
        success: true,
        results,
        timings: {
          ensurePGLiteMs: timing.getDuration('ensure_pglite') || 0,
          executionMs: timing.getDuration('execute_batch') || 0,
          totalMs: timings.totalMs,
        },
        workerInfo: {
          workerId: WORKER_ID,
          instanceAge: Date.now() - WORKER_CREATED_AT,
          requestCount: REQUEST_COUNT,
          wasColdStart,
        },
      }

      return c.json(response)
    } catch (error) {
      const timings = timing.getTimings()
      const response: ComputeResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timings: {
          ensurePGLiteMs: timing.getDuration('ensure_pglite') || 0,
          executionMs: timing.getDuration('execute_batch') || 0,
          totalMs: timings.totalMs,
        },
        workerInfo: {
          workerId: WORKER_ID,
          instanceAge: Date.now() - WORKER_CREATED_AT,
          requestCount: REQUEST_COUNT,
          wasColdStart,
        },
      }
      return c.json(response, 500)
    }
  })

  /**
   * RPC handler - general purpose endpoint that handles ComputeRequest objects
   */
  app.post('/rpc', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()
    const wasColdStart = pgColdStart

    try {
      timing.start('parse_body')
      const request = await c.req.json() as ComputeRequest
      timing.end()

      timing.start('ensure_pglite')
      const pg = await ensurePGLite()
      timing.end()

      if (pgColdStart) {
        pgColdStart = false
      }

      let result: QueryResult | undefined
      let results: QueryResult[] | undefined

      timing.start('execute')
      if (request.type === 'execute' && request.sql) {
        result = await pg.query(request.sql)
      } else if (request.type === 'execute_batch' && request.statements) {
        results = []
        for (const sql of request.statements) {
          const r = await pg.query(sql)
          results.push(r)
        }
      } else {
        return c.json({ success: false, error: 'Invalid request type or missing parameters' }, 400)
      }
      timing.end()

      const timings = timing.getTimings()

      const response: ComputeResponse = {
        success: true,
        result,
        results,
        timings: {
          ensurePGLiteMs: timing.getDuration('ensure_pglite') || 0,
          executionMs: timing.getDuration('execute') || 0,
          totalMs: timings.totalMs,
        },
        workerInfo: {
          workerId: WORKER_ID,
          instanceAge: Date.now() - WORKER_CREATED_AT,
          requestCount: REQUEST_COUNT,
          wasColdStart,
        },
      }

      return c.json(response)
    } catch (error) {
      const timings = timing.getTimings()
      const response: ComputeResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timings: {
          ensurePGLiteMs: timing.getDuration('ensure_pglite') || 0,
          executionMs: timing.getDuration('execute') || 0,
          totalMs: timings.totalMs,
        },
        workerInfo: {
          workerId: WORKER_ID,
          instanceAge: Date.now() - WORKER_CREATED_AT,
          requestCount: REQUEST_COUNT,
          wasColdStart,
        },
      }
      return c.json(response, 500)
    }
  })

  /**
   * 404 handler
   */
  app.notFound((c) => {
    return c.json(
      {
        error: true,
        code: 'NOT_FOUND',
        message: `Route not found: ${c.req.method} ${c.req.path}`,
      },
      404
    )
  })

  /**
   * Error handler
   */
  app.onError((err, c) => {
    console.error('Unhandled error:', err)
    return c.json(
      {
        error: true,
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
      500
    )
  })

  return app
}

const app = createApp()

export default {
  fetch: app.fetch,
}
