/**
 * Consumer Worker - Uses Service Bindings to Factory
 *
 * This worker explores whether service bindings to a pre-warmed factory
 * can reduce cold start times for database operations.
 *
 * Three query modes:
 * 1. Direct: Execute query in consumer's own DO (baseline)
 * 2. Factory: Execute query via factory service binding (RPC)
 * 3. Hybrid: Try factory first, fall back to direct
 */

import { Hono } from 'hono'
import { ConsumerDO } from './consumer-do'
import { TimingCollector, MODULE_LOAD_TIME, MODULE_ID, createTimingHeaders } from './timing'

export { ConsumerDO }

/**
 * Module-level state
 */
const WORKER_CREATED_AT = Date.now()
let REQUEST_COUNT = 0

/**
 * Environment interface
 */
export interface Env {
  // Consumer's own DO
  CONSUMER_DO: DurableObjectNamespace

  // Service binding to factory worker
  FACTORY: Fetcher
}

function createApp() {
  const app = new Hono<{ Bindings: Env }>()

  /**
   * Root endpoint
   */
  app.get('/', (c) => {
    const baseUrl = new URL(c.req.url).origin
    return c.json({
      name: 'Cold Start Consumer Worker',
      version: '1.0.0',
      description: 'Tests service binding approach to reduce cold starts',
      moduleId: MODULE_ID,
      workerAgeMs: Date.now() - WORKER_CREATED_AT,
      requestCount: REQUEST_COUNT,
      endpoints: {
        direct: {
          description: 'Query via consumer DO (baseline cold start)',
          method: 'POST',
          url: `${baseUrl}/direct`,
          body: { sql: 'SELECT 1+1 as result' },
        },
        factory: {
          description: 'Query via factory service binding (RPC)',
          method: 'POST',
          url: `${baseUrl}/factory`,
          body: { sql: 'SELECT 1+1 as result' },
        },
        compare: {
          description: 'Run same query both ways and compare timings',
          method: 'POST',
          url: `${baseUrl}/compare`,
          body: { sql: 'SELECT 1+1 as result' },
        },
        coldDirect: {
          description: 'Force cold start on consumer DO',
          method: 'POST',
          url: `${baseUrl}/cold-direct`,
          body: { sql: 'SELECT 1+1 as result' },
        },
        coldFactory: {
          description: 'Force cold start via factory',
          method: 'POST',
          url: `${baseUrl}/cold-factory`,
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
    })
  })

  /**
   * Direct query via consumer's own DO (baseline)
   */
  app.post('/direct', async (c) => {
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
      const doId = c.env.CONSUMER_DO.idFromName('consumer-main')
      const stub = c.env.CONSUMER_DO.get(doId)
      timing.end()

      timing.start('do_query')
      const response = await stub.fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: body.sql, requestId: timing.requestId }),
        })
      )
      timing.end()

      timing.start('parse_response')
      const data = await response.json() as { coldStart: boolean }
      timing.end()

      const timings = timing.getTimings()
      timings.coldStart = data.coldStart

      return new Response(
        JSON.stringify({
          mode: 'direct',
          ...data,
          workerTimings: {
            parseBodyMs: timings.events.find((e) => e.name === 'parse_body')?.durationMs,
            doLookupMs: timings.events.find((e) => e.name === 'do_lookup')?.durationMs,
            doQueryMs: timings.events.find((e) => e.name === 'do_query')?.durationMs,
            parseResponseMs: timings.events.find((e) => e.name === 'parse_response')?.durationMs,
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
      return c.json({ error: true, message: error instanceof Error ? error.message : 'Unknown' }, 500)
    }
  })

  /**
   * Query via factory service binding (RPC)
   */
  app.post('/factory', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    try {
      timing.start('parse_body')
      const body = await c.req.json() as { sql: string }
      timing.end()

      if (!body.sql) {
        return c.json({ error: true, message: 'Missing sql parameter' }, 400)
      }

      timing.start('service_binding_call')
      const response = await c.env.FACTORY.fetch(
        new Request('https://factory/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: body.sql }),
        })
      )
      timing.end()

      timing.start('parse_response')
      const data = await response.json() as { coldStart: boolean }
      timing.end()

      const timings = timing.getTimings()
      timings.coldStart = data.coldStart

      return new Response(
        JSON.stringify({
          mode: 'factory',
          ...data,
          workerTimings: {
            parseBodyMs: timings.events.find((e) => e.name === 'parse_body')?.durationMs,
            serviceBindingCallMs: timings.events.find((e) => e.name === 'service_binding_call')?.durationMs,
            parseResponseMs: timings.events.find((e) => e.name === 'parse_response')?.durationMs,
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
      return c.json({ error: true, message: error instanceof Error ? error.message : 'Unknown' }, 500)
    }
  })

  /**
   * Compare both approaches
   */
  app.post('/compare', async (c) => {
    REQUEST_COUNT++

    try {
      const body = await c.req.json() as { sql: string }
      if (!body.sql) {
        return c.json({ error: true, message: 'Missing sql parameter' }, 400)
      }

      // Run factory query first (usually warmer)
      const factoryTiming = new TimingCollector()
      factoryTiming.start('factory_total')
      const factoryResponse = await c.env.FACTORY.fetch(
        new Request('https://factory/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: body.sql }),
        })
      )
      const factoryData = await factoryResponse.json() as { coldStart: boolean }
      factoryTiming.end()

      // Run direct query
      const directTiming = new TimingCollector()
      directTiming.start('direct_total')
      const doId = c.env.CONSUMER_DO.idFromName('consumer-main')
      const stub = c.env.CONSUMER_DO.get(doId)
      const directResponse = await stub.fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: body.sql }),
        })
      )
      const directData = await directResponse.json() as { coldStart: boolean }
      directTiming.end()

      const factoryTimings = factoryTiming.getTimings()
      const directTimings = directTiming.getTimings()

      const factoryMs = factoryTimings.events.find((e) => e.name === 'factory_total')?.durationMs || 0
      const directMs = directTimings.events.find((e) => e.name === 'direct_total')?.durationMs || 0

      return c.json({
        comparison: {
          factoryMs,
          directMs,
          difference: directMs - factoryMs,
          factoryFaster: factoryMs < directMs,
          percentageDiff: ((directMs - factoryMs) / directMs * 100).toFixed(2) + '%',
        },
        factory: {
          coldStart: factoryData.coldStart,
          totalMs: factoryMs,
          data: factoryData,
        },
        direct: {
          coldStart: directData.coldStart,
          totalMs: directMs,
          data: directData,
        },
      })
    } catch (error) {
      return c.json({ error: true, message: error instanceof Error ? error.message : 'Unknown' }, 500)
    }
  })

  /**
   * Force cold start on consumer DO
   */
  app.post('/cold-direct', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    try {
      timing.start('parse_body')
      const body = await c.req.json() as { sql: string }
      timing.end()

      if (!body.sql) {
        return c.json({ error: true, message: 'Missing sql parameter' }, 400)
      }

      // Create unique DO to force cold start
      const uniqueId = `cold-${Date.now()}-${crypto.randomUUID()}`

      timing.start('do_lookup')
      const doId = c.env.CONSUMER_DO.idFromName(uniqueId)
      const stub = c.env.CONSUMER_DO.get(doId)
      timing.end()

      timing.start('cold_do_query')
      const response = await stub.fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: body.sql, requestId: timing.requestId }),
        })
      )
      timing.end()

      timing.start('parse_response')
      const data = await response.json()
      timing.end()

      const timings = timing.getTimings()
      timings.coldStart = true

      return new Response(
        JSON.stringify({
          mode: 'cold-direct',
          uniqueDoId: uniqueId,
          forcedColdStart: true,
          ...data as object,
          workerTimings: {
            parseBodyMs: timings.events.find((e) => e.name === 'parse_body')?.durationMs,
            doLookupMs: timings.events.find((e) => e.name === 'do_lookup')?.durationMs,
            coldDoQueryMs: timings.events.find((e) => e.name === 'cold_do_query')?.durationMs,
            parseResponseMs: timings.events.find((e) => e.name === 'parse_response')?.durationMs,
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
      return c.json({ error: true, message: error instanceof Error ? error.message : 'Unknown' }, 500)
    }
  })

  /**
   * Force cold start via factory
   */
  app.post('/cold-factory', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    try {
      timing.start('parse_body')
      const body = await c.req.json() as { sql: string }
      timing.end()

      if (!body.sql) {
        return c.json({ error: true, message: 'Missing sql parameter' }, 400)
      }

      timing.start('service_binding_cold_call')
      const response = await c.env.FACTORY.fetch(
        new Request('https://factory/cold-start', {
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
      timings.coldStart = true

      return new Response(
        JSON.stringify({
          mode: 'cold-factory',
          forcedColdStart: true,
          ...data as object,
          workerTimings: {
            parseBodyMs: timings.events.find((e) => e.name === 'parse_body')?.durationMs,
            serviceBindingColdCallMs: timings.events.find((e) => e.name === 'service_binding_cold_call')?.durationMs,
            parseResponseMs: timings.events.find((e) => e.name === 'parse_response')?.durationMs,
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
      return c.json({ error: true, message: error instanceof Error ? error.message : 'Unknown' }, 500)
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
