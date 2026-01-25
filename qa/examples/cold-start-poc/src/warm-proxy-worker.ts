/**
 * Warm Proxy Worker
 *
 * This explores a different approach: keeping PGLite warm at the WORKER level
 * instead of the DO level. The hypothesis is:
 *
 * 1. Workers can stay warm longer than DOs (more traffic)
 * 2. A single warm worker can serve read queries directly
 * 3. Write queries are forwarded to the appropriate DO
 *
 * This is essentially a read-replica pattern where the worker IS the replica.
 *
 * LIMITATIONS:
 * - Worker-level state is per-isolate (not shared across colos)
 * - State is lost on worker restart
 * - No persistence without DO
 */

import { Hono } from 'hono'
import { TimingCollector, MODULE_LOAD_TIME, MODULE_ID, createTimingHeaders } from './timing'
import { PGliteLocal } from './pglite-local'

// @ts-ignore - Wrangler handles these imports
import pgliteWasm from './pglite-assets/pglite.wasm'
// @ts-ignore - Wrangler handles these imports
import pgliteData from './pglite-assets/pglite.data'

/**
 * Module-level state - this is the "warm pool"
 * In Cloudflare Workers, this is per-isolate and survives across requests
 */
const WORKER_CREATED_AT = Date.now()
let REQUEST_COUNT = 0
let PG_INSTANCE: PGliteLocal | null = null
let PG_PROMISE: Promise<PGliteLocal> | null = null
let PG_INITIALIZED_AT: number | null = null
let INIT_TIMING: TimingCollector | null = null

/**
 * Initialize PGLite at the worker (module) level
 */
async function initWorkerPGLite(): Promise<PGliteLocal> {
  if (PG_INSTANCE) return PG_INSTANCE

  const timing = new TimingCollector()
  INIT_TIMING = timing

  timing.start('wasm_load')
  const wasmModule = pgliteWasm
  timing.end({ wasmSize: 'pre-compiled' })

  timing.start('data_load')
  const dataBuffer = pgliteData
  timing.end({ dataSize: dataBuffer.byteLength })

  timing.start('module_init')
  PG_INSTANCE = await PGliteLocal.create({
    wasmModule,
    fsBundle: dataBuffer,
    debug: false,
  })
  timing.end()

  PG_INITIALIZED_AT = Date.now()

  timing.start('first_query')
  await PG_INSTANCE.query('SELECT 1')
  timing.end()

  return PG_INSTANCE
}

/**
 * Ensure PGLite is ready
 */
async function ensureWorkerPGLite(): Promise<PGliteLocal> {
  if (PG_INSTANCE) return PG_INSTANCE
  if (!PG_PROMISE) {
    PG_PROMISE = initWorkerPGLite()
  }
  return PG_PROMISE
}

// NOTE: We CANNOT start warming in global scope in Cloudflare Workers
// Async operations are not allowed in global scope
// The warming happens on first request instead
// PG_PROMISE = initWorkerPGLite() // DISABLED - not allowed in Workers

export interface Env {
  // No DO bindings - this worker handles everything directly
}

function createApp() {
  const app = new Hono<{ Bindings: Env }>()

  app.get('/', (c) => {
    const baseUrl = new URL(c.req.url).origin
    const now = Date.now()

    return c.json({
      name: 'Warm Proxy Worker',
      version: '1.0.0',
      description: 'Explores keeping PGLite warm at the worker level',
      architecture: 'Worker-level PGLite (no DO)',
      moduleId: MODULE_ID,
      moduleLoadTime: new Date(MODULE_LOAD_TIME).toISOString(),
      workerAgeMs: now - WORKER_CREATED_AT,
      requestCount: REQUEST_COUNT,
      pglite: {
        initialized: PG_INSTANCE !== null,
        initializing: PG_PROMISE !== null && PG_INSTANCE === null,
        initializedAt: PG_INITIALIZED_AT ? new Date(PG_INITIALIZED_AT).toISOString() : null,
        ageMs: PG_INITIALIZED_AT ? now - PG_INITIALIZED_AT : null,
      },
      tradeoffs: {
        pros: [
          'No DO cold start (worker already warm)',
          'Faster for read-heavy workloads',
          'Simpler architecture for stateless queries',
        ],
        cons: [
          'No persistence (state lost on restart)',
          'Per-isolate (not shared across colos)',
          'Not suitable for writes requiring durability',
        ],
      },
      endpoints: {
        query: {
          description: 'Execute read query via warm worker',
          method: 'POST',
          url: `${baseUrl}/query`,
          body: { sql: 'SELECT 1+1 as result' },
        },
        timing: {
          description: 'Query with detailed timing',
          method: 'POST',
          url: `${baseUrl}/timing`,
          body: { sql: 'SELECT 1+1 as result' },
        },
        status: {
          description: 'Worker and PGLite status',
          method: 'GET',
          url: `${baseUrl}/status`,
        },
      },
    })
  })

  app.get('/ping', (c) => {
    return c.json({
      ok: true,
      moduleId: MODULE_ID,
      workerAgeMs: Date.now() - WORKER_CREATED_AT,
      pgliteReady: PG_INSTANCE !== null,
    })
  })

  app.get('/status', (c) => {
    const now = Date.now()
    return c.json({
      module: {
        id: MODULE_ID,
        loadTime: new Date(MODULE_LOAD_TIME).toISOString(),
        workerCreatedAt: new Date(WORKER_CREATED_AT).toISOString(),
        workerAgeMs: now - WORKER_CREATED_AT,
        requestCount: REQUEST_COUNT,
      },
      pglite: {
        initialized: PG_INSTANCE !== null,
        initializing: PG_PROMISE !== null && PG_INSTANCE === null,
        initializedAt: PG_INITIALIZED_AT ? new Date(PG_INITIALIZED_AT).toISOString() : null,
        ageMs: PG_INITIALIZED_AT ? now - PG_INITIALIZED_AT : null,
        initTimings: INIT_TIMING?.getTimings() || null,
      },
    })
  })

  app.post('/query', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()
    const wasCold = PG_INSTANCE === null

    try {
      timing.start('parse_body')
      const body = await c.req.json() as { sql: string }
      timing.end()

      if (!body.sql) {
        return c.json({ error: true, message: 'Missing sql parameter' }, 400)
      }

      timing.start('ensure_pglite')
      const pg = await ensureWorkerPGLite()
      timing.end()

      timing.start('query_execution')
      const result = await pg.query(body.sql)
      timing.end()

      const timings = timing.getTimings()
      timings.coldStart = wasCold

      return new Response(
        JSON.stringify({
          success: true,
          rows: result.rows,
          affectedRows: result.affectedRows,
          coldStart: wasCold,
          queryTimings: {
            parseBodyMs: timings.events.find((e) => e.name === 'parse_body')?.durationMs,
            ensurePGLiteMs: timings.events.find((e) => e.name === 'ensure_pglite')?.durationMs,
            queryExecutionMs: timings.events.find((e) => e.name === 'query_execution')?.durationMs,
            totalMs: timings.totalMs,
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(createTimingHeaders(timings).entries()),
          },
        }
      )
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          coldStart: wasCold,
        },
        500
      )
    }
  })

  app.post('/timing', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()
    const wasCold = PG_INSTANCE === null

    try {
      timing.start('parse_body')
      const body = await c.req.json() as { sql: string }
      timing.end()

      if (!body.sql) {
        return c.json({ error: true, message: 'Missing sql parameter' }, 400)
      }

      timing.start('ensure_pglite')
      const pg = await ensureWorkerPGLite()
      timing.end()

      timing.start('query_execution')
      const result = await pg.query(body.sql)
      timing.end()

      const timings = timing.getTimings()
      timings.coldStart = wasCold

      return new Response(
        JSON.stringify({
          success: true,
          rows: result.rows,
          affectedRows: result.affectedRows,
          coldStart: wasCold,
          workerTimings: {
            parseBodyMs: timings.events.find((e) => e.name === 'parse_body')?.durationMs,
            ensurePGLiteMs: timings.events.find((e) => e.name === 'ensure_pglite')?.durationMs,
            queryExecutionMs: timings.events.find((e) => e.name === 'query_execution')?.durationMs,
            totalMs: timings.totalMs,
          },
          initializationTiming: wasCold ? INIT_TIMING?.getTimings() : null,
          instanceInfo: {
            moduleId: MODULE_ID,
            workerAgeMs: Date.now() - WORKER_CREATED_AT,
            pgliteAgeMs: PG_INITIALIZED_AT ? Date.now() - PG_INITIALIZED_AT : null,
            requestCount: REQUEST_COUNT,
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(createTimingHeaders(timings).entries()),
          },
        }
      )
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          coldStart: wasCold,
        },
        500
      )
    }
  })

  app.notFound((c) => {
    return c.json({ error: true, code: 'NOT_FOUND', message: `Route not found: ${c.req.method} ${c.req.path}` }, 404)
  })

  app.onError((err, c) => {
    console.error('Unhandled error:', err)
    return c.json({ error: true, code: 'INTERNAL_ERROR', message: err.message }, 500)
  })

  return app
}

const app = createApp()

export default {
  fetch: app.fetch,
}
