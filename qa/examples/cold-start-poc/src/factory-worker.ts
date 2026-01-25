/**
 * PGLite Factory Worker
 *
 * This worker maintains a pool of pre-initialized PGLite instances.
 * It explores whether service bindings can help reduce cold start times.
 *
 * Key hypotheses being tested:
 * 1. Can a pre-warmed worker reduce cold start for other workers?
 * 2. Can WASM modules be shared via service bindings?
 * 3. What is the overhead of RPC-based query execution?
 */

import { Hono } from 'hono'
import { FactoryDO } from './factory-do'
import { TimingCollector, MODULE_LOAD_TIME, MODULE_ID, createTimingHeaders } from './timing'

export { FactoryDO }

/**
 * Module-level state tracking
 */
const WORKER_CREATED_AT = Date.now()
let REQUEST_COUNT = 0

/**
 * Environment interface
 */
export interface Env {
  FACTORY_DO: DurableObjectNamespace
}

/**
 * Create the Hono app
 */
function createApp() {
  const app = new Hono<{ Bindings: Env }>()

  /**
   * Root endpoint - API info
   */
  app.get('/', (c) => {
    const baseUrl = new URL(c.req.url).origin
    return c.json({
      name: 'PGLite Factory Worker',
      version: '1.0.0',
      description: 'Pre-warms PGLite instances to reduce cold start times',
      moduleId: MODULE_ID,
      moduleLoadTime: new Date(MODULE_LOAD_TIME).toISOString(),
      workerCreatedAt: new Date(WORKER_CREATED_AT).toISOString(),
      workerAgeMs: Date.now() - WORKER_CREATED_AT,
      requestCount: REQUEST_COUNT,
      endpoints: {
        warmup: {
          description: 'Trigger factory DO to pre-warm PGLite',
          method: 'POST',
          url: `${baseUrl}/warmup`,
        },
        status: {
          description: 'Get factory status (warm state, pool size)',
          method: 'GET',
          url: `${baseUrl}/status`,
        },
        query: {
          description: 'Execute a query via the factory (RPC query)',
          method: 'POST',
          url: `${baseUrl}/query`,
          body: { sql: 'SELECT 1+1 as result' },
        },
        timing: {
          description: 'Execute query and return detailed timings',
          method: 'POST',
          url: `${baseUrl}/timing`,
          body: { sql: 'SELECT 1+1 as result' },
        },
        coldStart: {
          description: 'Simulate cold start by creating new DO instance',
          method: 'POST',
          url: `${baseUrl}/cold-start`,
          body: { sql: 'SELECT 1+1 as result' },
        },
      },
    })
  })

  /**
   * Health check
   */
  app.get('/ping', (c) => {
    return c.json({
      ok: true,
      moduleId: MODULE_ID,
      workerAgeMs: Date.now() - WORKER_CREATED_AT,
      requestCount: REQUEST_COUNT,
    })
  })

  /**
   * Get factory status
   */
  app.get('/status', async (c) => {
    const timing = new TimingCollector()

    try {
      timing.start('do_lookup')
      const doId = c.env.FACTORY_DO.idFromName('factory-main')
      const stub = c.env.FACTORY_DO.get(doId)
      timing.end()

      timing.start('rpc_call')
      const response = await stub.fetch(new Request('https://internal/status'))
      timing.end()

      timing.start('parse_response')
      const data = await response.json()
      timing.end()

      const timings = timing.getTimings()

      return c.json({
        ...data as object,
        rpcTimings: {
          doLookupMs: timings.events.find((e) => e.name === 'do_lookup')?.durationMs,
          rpcCallMs: timings.events.find((e) => e.name === 'rpc_call')?.durationMs,
          parseMs: timings.events.find((e) => e.name === 'parse_response')?.durationMs,
        },
      })
    } catch (error) {
      return c.json(
        {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  })

  /**
   * Trigger warmup
   */
  app.post('/warmup', async (c) => {
    const timing = new TimingCollector()

    try {
      timing.start('do_lookup')
      const doId = c.env.FACTORY_DO.idFromName('factory-main')
      const stub = c.env.FACTORY_DO.get(doId)
      timing.end()

      timing.start('rpc_warmup')
      const response = await stub.fetch(
        new Request('https://internal/warmup', { method: 'POST' })
      )
      timing.end()

      const data = await response.json()
      const timings = timing.getTimings()

      return c.json({
        ...data as object,
        rpcTimings: {
          doLookupMs: timings.events.find((e) => e.name === 'do_lookup')?.durationMs,
          rpcWarmupMs: timings.events.find((e) => e.name === 'rpc_warmup')?.durationMs,
        },
      })
    } catch (error) {
      return c.json(
        {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  })

  /**
   * Execute query via factory (measures RPC query overhead)
   */
  app.post('/query', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    try {
      timing.start('parse_body')
      const body = await c.req.json() as { sql: string }
      timing.end()

      if (!body.sql) {
        return c.json({ error: true, message: 'Missing sql parameter' }, 400)
      }

      timing.start('do_lookup')
      const doId = c.env.FACTORY_DO.idFromName('factory-main')
      const stub = c.env.FACTORY_DO.get(doId)
      timing.end()

      timing.start('rpc_query')
      const response = await stub.fetch(
        new Request('https://internal/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: body.sql }),
        })
      )
      timing.end()

      timing.start('parse_response')
      const data = await response.json()
      timing.end()

      const timings = timing.getTimings()
      const headers = createTimingHeaders(timings)

      return new Response(JSON.stringify({
        ...data as object,
        rpcOverhead: {
          parseBodyMs: timings.events.find((e) => e.name === 'parse_body')?.durationMs,
          doLookupMs: timings.events.find((e) => e.name === 'do_lookup')?.durationMs,
          rpcQueryMs: timings.events.find((e) => e.name === 'rpc_query')?.durationMs,
          parseResponseMs: timings.events.find((e) => e.name === 'parse_response')?.durationMs,
          totalOverheadMs: timings.totalMs,
        },
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries()),
        },
      })
    } catch (error) {
      return c.json(
        {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  })

  /**
   * Query with detailed timings (for cold start measurement)
   */
  app.post('/timing', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    try {
      timing.start('parse_body')
      const body = await c.req.json() as { sql: string }
      timing.end()

      if (!body.sql) {
        return c.json({ error: true, message: 'Missing sql parameter' }, 400)
      }

      timing.start('do_lookup')
      const doId = c.env.FACTORY_DO.idFromName('factory-main')
      const stub = c.env.FACTORY_DO.get(doId)
      timing.end()

      // Request detailed timings from DO
      timing.start('rpc_timing_query')
      const response = await stub.fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: body.sql,
            requestId: timing.requestId,
          }),
        })
      )
      timing.end()

      timing.start('parse_response')
      const data = await response.json() as {
        coldStart: boolean
        doTimings: Record<string, unknown>
      }
      timing.end()

      const timings = timing.getTimings()
      timings.coldStart = data.coldStart

      const headers = createTimingHeaders(timings)

      return new Response(JSON.stringify({
        ...data,
        workerTimings: {
          parseBodyMs: timings.events.find((e) => e.name === 'parse_body')?.durationMs,
          doLookupMs: timings.events.find((e) => e.name === 'do_lookup')?.durationMs,
          rpcTimingQueryMs: timings.events.find((e) => e.name === 'rpc_timing_query')?.durationMs,
          parseResponseMs: timings.events.find((e) => e.name === 'parse_response')?.durationMs,
          totalMs: timings.totalMs,
        },
        coldStart: data.coldStart,
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries()),
        },
      })
    } catch (error) {
      return c.json(
        {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  })

  /**
   * Simulate cold start by creating a new unique DO instance
   * This helps measure baseline cold start times
   */
  app.post('/cold-start', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    try {
      timing.start('parse_body')
      const body = await c.req.json() as { sql: string }
      timing.end()

      if (!body.sql) {
        return c.json({ error: true, message: 'Missing sql parameter' }, 400)
      }

      // Create a new unique DO instance to force cold start
      const uniqueId = `cold-start-${Date.now()}-${crypto.randomUUID()}`

      timing.start('do_lookup')
      const doId = c.env.FACTORY_DO.idFromName(uniqueId)
      const stub = c.env.FACTORY_DO.get(doId)
      timing.end()

      timing.start('cold_start_query')
      const response = await stub.fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: body.sql,
            requestId: timing.requestId,
          }),
        })
      )
      timing.end()

      timing.start('parse_response')
      const data = await response.json() as {
        coldStart: boolean
        doTimings: Record<string, unknown>
      }
      timing.end()

      const timings = timing.getTimings()
      timings.coldStart = true // Force true since we created new instance

      const headers = createTimingHeaders(timings)

      return new Response(JSON.stringify({
        ...data,
        uniqueDoId: uniqueId,
        workerTimings: {
          parseBodyMs: timings.events.find((e) => e.name === 'parse_body')?.durationMs,
          doLookupMs: timings.events.find((e) => e.name === 'do_lookup')?.durationMs,
          coldStartQueryMs: timings.events.find((e) => e.name === 'cold_start_query')?.durationMs,
          parseResponseMs: timings.events.find((e) => e.name === 'parse_response')?.durationMs,
          totalMs: timings.totalMs,
        },
        forcedColdStart: true,
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries()),
        },
      })
    } catch (error) {
      return c.json(
        {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
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
        hint: 'GET / for API documentation',
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
