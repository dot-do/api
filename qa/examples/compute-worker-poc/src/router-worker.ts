/**
 * Router Worker
 *
 * Routes requests to the appropriate DO or Worker for the benchmark comparison.
 * Provides unified endpoints for comparing:
 * - New architecture: State DO + Compute Worker
 * - Traditional architecture: WASM in DO
 *
 * Benchmark endpoints:
 * - /benchmark/cold-start - Measure DO cold start times
 * - /benchmark/hot-query - Measure hot query performance
 * - /benchmark/write - Measure write path performance
 * - /benchmark/compare - Run full comparison
 */

import { Hono } from 'hono'
import { TimingCollector, createTimingHeaders } from './shared/timing'
import type { RouterEnv, BenchmarkResult } from './shared/types'

/**
 * Module-level tracking
 */
const WORKER_CREATED_AT = Date.now()
let REQUEST_COUNT = 0

/**
 * Create the Hono app
 */
function createApp() {
  const app = new Hono<{ Bindings: RouterEnv }>()

  /**
   * Root endpoint - API info
   */
  app.get('/', (c) => {
    const baseUrl = new URL(c.req.url).origin
    return c.json({
      name: 'Compute Worker POC Router',
      version: '1.0.0',
      description: 'Routes requests for Stateful DO + Stateless Compute Worker architecture comparison',
      workerAgeMs: Date.now() - WORKER_CREATED_AT,
      requestCount: REQUEST_COUNT,
      architectures: {
        new: 'State DO (no WASM) + Compute Worker (WASM)',
        traditional: 'Traditional DO (WASM inside)',
        hybrid: 'Hybrid DO (cold: compute worker, warm: direct execution)',
        thinState: 'Thin State DO (NO WASM, ALWAYS delegates - pure state coordinator)',
        lazyWasm: 'Lazy WASM DO (WASM fetched from R2/Cache on-demand, not bundled)',
      },
      endpoints: {
        // Benchmark endpoints
        benchmarkColdStart: {
          method: 'POST',
          url: `${baseUrl}/benchmark/cold-start`,
          description: 'Compare cold start times (forces new DO instances)',
          body: { sql: 'SELECT 1+1 as result' },
        },
        benchmarkHotQuery: {
          method: 'POST',
          url: `${baseUrl}/benchmark/hot-query`,
          description: 'Compare hot query latency (reuses existing DO instances)',
          body: { sql: 'SELECT 1+1 as result' },
        },
        benchmarkWrite: {
          method: 'POST',
          url: `${baseUrl}/benchmark/write`,
          description: 'Compare write path performance',
          body: { sql: "INSERT INTO test VALUES (1, 'test')" },
        },
        benchmarkCompare: {
          method: 'POST',
          url: `${baseUrl}/benchmark/compare`,
          description: 'Run comprehensive comparison benchmark',
          body: { iterations: 5 },
        },
        // Direct endpoints
        newArchStatus: {
          method: 'GET',
          url: `${baseUrl}/new/status`,
          description: 'Get State DO status',
        },
        newArchQuery: {
          method: 'POST',
          url: `${baseUrl}/new/query`,
          description: 'Query via new architecture',
          body: { sql: 'SELECT 1+1 as result' },
        },
        traditionalStatus: {
          method: 'GET',
          url: `${baseUrl}/traditional/status`,
          description: 'Get Traditional DO status',
        },
        traditionalQuery: {
          method: 'POST',
          url: `${baseUrl}/traditional/query`,
          description: 'Query via traditional architecture',
          body: { sql: 'SELECT 1+1 as result' },
        },
        computeWorkerStatus: {
          method: 'GET',
          url: `${baseUrl}/compute/status`,
          description: 'Get Compute Worker status',
        },
        // Hybrid endpoints
        hybridStatus: {
          method: 'GET',
          url: `${baseUrl}/hybrid/status`,
          description: 'Get Hybrid DO status',
        },
        hybridQuery: {
          method: 'POST',
          url: `${baseUrl}/hybrid/query`,
          description: 'Query via hybrid architecture (cold: compute worker, warm: direct)',
          body: { sql: 'SELECT 1+1 as result' },
        },
        hybridWarmup: {
          method: 'POST',
          url: `${baseUrl}/hybrid/warmup`,
          description: 'Force hybrid DO to load WASM',
        },
        // Thin State endpoints
        thinStateStatus: {
          method: 'GET',
          url: `${baseUrl}/thin-state/status`,
          description: 'Get Thin State DO status (NO WASM architecture)',
        },
        thinStateQuery: {
          method: 'POST',
          url: `${baseUrl}/thin-state/query`,
          description: 'Query via thin state architecture (always delegates)',
          body: { sql: 'SELECT 1+1 as result' },
        },
        // Lazy WASM endpoints
        lazyWasmStatus: {
          method: 'GET',
          url: `${baseUrl}/lazy-wasm/status`,
          description: 'Get Lazy WASM DO status (WASM loaded from R2/Cache)',
        },
        lazyWasmQuery: {
          method: 'POST',
          url: `${baseUrl}/lazy-wasm/query`,
          description: 'Query via lazy WASM architecture (first requests delegate, later execute locally)',
          body: { sql: 'SELECT 1+1 as result' },
        },
        lazyWasmForceLoad: {
          method: 'POST',
          url: `${baseUrl}/lazy-wasm/force-load`,
          description: 'Force WASM load from R2/Cache (for testing/prewarming)',
        },
        // Multi-tenant hybrid endpoint
        multiTenantHybridQuery: {
          method: 'POST',
          url: `${baseUrl}/multi-tenant/hybrid/:tenantId/query`,
          description: 'Query via hybrid architecture for specific tenant',
          body: { sql: 'SELECT 1+1 as result' },
        },
        // Multi-tenant lazy WASM endpoint
        multiTenantLazyWasmQuery: {
          method: 'POST',
          url: `${baseUrl}/multi-tenant/lazy-wasm/:tenantId/query`,
          description: 'Query via lazy WASM architecture for specific tenant',
          body: { sql: 'SELECT 1+1 as result' },
        },
        // Comparison benchmark
        benchmarkTripleCompare: {
          method: 'POST',
          url: `${baseUrl}/benchmark/triple-compare`,
          description: 'Compare all three architectures: traditional, new, hybrid',
          body: { iterations: 5 },
        },
        // Quad-compare benchmark (includes thin-state)
        benchmarkQuadCompare: {
          method: 'POST',
          url: `${baseUrl}/benchmark/quad-compare`,
          description: 'Compare all four architectures: traditional, new, hybrid, thin-state',
          body: { iterations: 5 },
        },
        // Thin state vs hybrid comparison
        benchmarkThinVsHybrid: {
          method: 'POST',
          url: `${baseUrl}/benchmark/thin-vs-hybrid`,
          description: 'Direct comparison of thin-state vs hybrid architectures',
          body: { iterations: 10 },
        },
        // Multi-tenant endpoints
        multiTenantNewQuery: {
          method: 'POST',
          url: `${baseUrl}/multi-tenant/new/:tenantId/query`,
          description: 'Query via new architecture for specific tenant',
          body: { sql: 'SELECT 1+1 as result' },
        },
        multiTenantTraditionalQuery: {
          method: 'POST',
          url: `${baseUrl}/multi-tenant/traditional/:tenantId/query`,
          description: 'Query via traditional architecture for specific tenant',
          body: { sql: 'SELECT 1+1 as result' },
        },
        multiTenantBurstBenchmark: {
          method: 'POST',
          url: `${baseUrl}/benchmark/multi-tenant/burst`,
          description: 'Burst test with N unique tenants (cold start comparison)',
          body: { tenantCount: 50, sql: 'SELECT 1+1 as result' },
        },
        // DO ID vs Name routing benchmarks
        benchmarkDoRouting: {
          method: 'POST',
          url: `${baseUrl}/benchmark/do-routing`,
          description: 'Test idFromName() vs cached ID latency difference',
          body: { iterations: 100 },
        },
        benchmarkDoFirstAccess: {
          method: 'POST',
          url: `${baseUrl}/benchmark/do-first-access`,
          description: 'Test first-access vs subsequent-access latency (round-the-world check)',
          body: { uniqueNames: 10 },
        },
        computeKeepWarm: {
          method: 'POST',
          url: `${baseUrl}/compute/keep-warm`,
          description: 'Trigger keep-warm request to compute worker',
        },
      },
    })
  })

  /**
   * Health check
   */
  app.get('/ping', (c) => {
    return c.json({ ok: true, workerAgeMs: Date.now() - WORKER_CREATED_AT })
  })

  // ==========================================================================
  // NEW ARCHITECTURE ENDPOINTS (State DO + Compute Worker)
  // ==========================================================================

  app.get('/new/status', async (c) => {
    const doId = c.env.STATE_DO.idFromName('state-main')
    const stub = c.env.STATE_DO.get(doId)
    return stub.fetch(new Request('https://internal/status'))
  })

  app.post('/new/query', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.STATE_DO.idFromName('state-main')
    const stub = c.env.STATE_DO.get(doId)
    timing.end()

    timing.start('do_request')
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

    return new Response(
      JSON.stringify({
        ...data as object,
        routerTimings: {
          parseBodyMs: timing.getDuration('parse_body'),
          doLookupMs: timing.getDuration('do_lookup'),
          doRequestMs: timing.getDuration('do_request'),
          parseResponseMs: timing.getDuration('parse_response'),
          totalMs: timings.totalMs,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries()),
        },
      }
    )
  })

  app.post('/new/timing', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.STATE_DO.idFromName('state-main')
    const stub = c.env.STATE_DO.get(doId)
    timing.end()

    timing.start('do_request')
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

    return c.json({
      ...data as object,
      routerTimings: {
        parseBodyMs: timing.getDuration('parse_body'),
        doLookupMs: timing.getDuration('do_lookup'),
        doRequestMs: timing.getDuration('do_request'),
        parseResponseMs: timing.getDuration('parse_response'),
        totalMs: timings.totalMs,
      },
    })
  })

  // ==========================================================================
  // TRADITIONAL ARCHITECTURE ENDPOINTS (WASM in DO)
  // ==========================================================================

  app.get('/traditional/status', async (c) => {
    const doId = c.env.TRADITIONAL_DO.idFromName('traditional-main')
    const stub = c.env.TRADITIONAL_DO.get(doId)
    return stub.fetch(new Request('https://internal/status'))
  })

  app.post('/traditional/query', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.TRADITIONAL_DO.idFromName('traditional-main')
    const stub = c.env.TRADITIONAL_DO.get(doId)
    timing.end()

    timing.start('do_request')
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

    return new Response(
      JSON.stringify({
        ...data as object,
        routerTimings: {
          parseBodyMs: timing.getDuration('parse_body'),
          doLookupMs: timing.getDuration('do_lookup'),
          doRequestMs: timing.getDuration('do_request'),
          parseResponseMs: timing.getDuration('parse_response'),
          totalMs: timings.totalMs,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries()),
        },
      }
    )
  })

  app.post('/traditional/timing', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.TRADITIONAL_DO.idFromName('traditional-main')
    const stub = c.env.TRADITIONAL_DO.get(doId)
    timing.end()

    timing.start('do_request')
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

    return c.json({
      ...data as object,
      routerTimings: {
        parseBodyMs: timing.getDuration('parse_body'),
        doLookupMs: timing.getDuration('do_lookup'),
        doRequestMs: timing.getDuration('do_request'),
        parseResponseMs: timing.getDuration('parse_response'),
        totalMs: timings.totalMs,
      },
    })
  })

  // ==========================================================================
  // HYBRID ARCHITECTURE ENDPOINTS (Cold: compute worker, Warm: direct)
  // ==========================================================================

  app.get('/hybrid/status', async (c) => {
    const doId = c.env.HYBRID_DO.idFromName('hybrid-main')
    const stub = c.env.HYBRID_DO.get(doId)
    return stub.fetch(new Request('https://internal/status'))
  })

  app.post('/hybrid/query', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.HYBRID_DO.idFromName('hybrid-main')
    const stub = c.env.HYBRID_DO.get(doId)
    timing.end()

    timing.start('do_request')
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

    return new Response(
      JSON.stringify({
        ...data as object,
        routerTimings: {
          parseBodyMs: timing.getDuration('parse_body'),
          doLookupMs: timing.getDuration('do_lookup'),
          doRequestMs: timing.getDuration('do_request'),
          parseResponseMs: timing.getDuration('parse_response'),
          totalMs: timings.totalMs,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries()),
        },
      }
    )
  })

  app.post('/hybrid/timing', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.HYBRID_DO.idFromName('hybrid-main')
    const stub = c.env.HYBRID_DO.get(doId)
    timing.end()

    timing.start('do_request')
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

    return c.json({
      ...data as object,
      routerTimings: {
        parseBodyMs: timing.getDuration('parse_body'),
        doLookupMs: timing.getDuration('do_lookup'),
        doRequestMs: timing.getDuration('do_request'),
        parseResponseMs: timing.getDuration('parse_response'),
        totalMs: timings.totalMs,
      },
    })
  })

  app.post('/hybrid/warmup', async (c) => {
    REQUEST_COUNT++
    const doId = c.env.HYBRID_DO.idFromName('hybrid-main')
    const stub = c.env.HYBRID_DO.get(doId)
    const response = await stub.fetch(
      new Request('https://internal/warmup', { method: 'POST' })
    )
    return response
  })

  // ==========================================================================
  // THIN STATE ARCHITECTURE ENDPOINTS (NO WASM - pure state coordinator)
  // ==========================================================================

  app.get('/thin-state/status', async (c) => {
    const doId = c.env.THIN_STATE_DO.idFromName('thin-state-main')
    const stub = c.env.THIN_STATE_DO.get(doId)
    return stub.fetch(new Request('https://internal/status'))
  })

  app.post('/thin-state/query', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string; params?: unknown[] }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.THIN_STATE_DO.idFromName('thin-state-main')
    const stub = c.env.THIN_STATE_DO.get(doId)
    timing.end()

    timing.start('do_request')
    const response = await stub.fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: body.sql, params: body.params }),
      })
    )
    timing.end()

    timing.start('parse_response')
    const data = await response.json()
    timing.end()

    const timings = timing.getTimings()
    const headers = createTimingHeaders(timings)

    return new Response(
      JSON.stringify({
        ...data as object,
        routerTimings: {
          parseBodyMs: timing.getDuration('parse_body'),
          doLookupMs: timing.getDuration('do_lookup'),
          doRequestMs: timing.getDuration('do_request'),
          parseResponseMs: timing.getDuration('parse_response'),
          totalMs: timings.totalMs,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries()),
        },
      }
    )
  })

  app.post('/thin-state/timing', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string; params?: unknown[] }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.THIN_STATE_DO.idFromName('thin-state-main')
    const stub = c.env.THIN_STATE_DO.get(doId)
    timing.end()

    timing.start('do_request')
    const response = await stub.fetch(
      new Request('https://internal/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: body.sql, params: body.params, requestId: timing.requestId }),
      })
    )
    timing.end()

    timing.start('parse_response')
    const data = await response.json()
    timing.end()

    const timings = timing.getTimings()

    return c.json({
      ...data as object,
      routerTimings: {
        parseBodyMs: timing.getDuration('parse_body'),
        doLookupMs: timing.getDuration('do_lookup'),
        doRequestMs: timing.getDuration('do_request'),
        parseResponseMs: timing.getDuration('parse_response'),
        totalMs: timings.totalMs,
      },
    })
  })

  // ==========================================================================
  // LAZY WASM DO ENDPOINTS (WASM loaded on-demand from R2/Cache)
  // ==========================================================================

  app.get('/lazy-wasm/status', async (c) => {
    const tenantId = c.req.header('X-Tenant-Id') || 'default'
    const doId = c.env.LAZY_WASM_DO.idFromName(`lazy-wasm-${tenantId}`)
    const stub = c.env.LAZY_WASM_DO.get(doId)
    return stub.fetch(new Request('https://internal/status'))
  })

  app.post('/lazy-wasm/query', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string; params?: unknown[] }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    const tenantId = c.req.header('X-Tenant-Id') || 'default'

    timing.start('do_lookup')
    const doId = c.env.LAZY_WASM_DO.idFromName(`lazy-wasm-${tenantId}`)
    const stub = c.env.LAZY_WASM_DO.get(doId)
    timing.end()

    timing.start('do_request')
    const response = await stub.fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: body.sql, params: body.params }),
      })
    )
    timing.end()

    timing.start('parse_response')
    const data = await response.json()
    timing.end()

    const timings = timing.getTimings()
    const headers = createTimingHeaders(timings)

    return new Response(
      JSON.stringify({
        ...data as object,
        routerTimings: {
          parseBodyMs: timing.getDuration('parse_body'),
          doLookupMs: timing.getDuration('do_lookup'),
          doRequestMs: timing.getDuration('do_request'),
          parseResponseMs: timing.getDuration('parse_response'),
          totalMs: timings.totalMs,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries()),
        },
      }
    )
  })

  app.post('/lazy-wasm/timing', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string; params?: unknown[] }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    const tenantId = c.req.header('X-Tenant-Id') || 'default'

    timing.start('do_lookup')
    const doId = c.env.LAZY_WASM_DO.idFromName(`lazy-wasm-${tenantId}`)
    const stub = c.env.LAZY_WASM_DO.get(doId)
    timing.end()

    timing.start('do_request')
    const response = await stub.fetch(
      new Request('https://internal/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: body.sql, params: body.params }),
      })
    )
    timing.end()

    timing.start('parse_response')
    const data = await response.json()
    timing.end()

    const timings = timing.getTimings()

    return c.json({
      ...data as object,
      routerTimings: {
        parseBodyMs: timing.getDuration('parse_body'),
        doLookupMs: timing.getDuration('do_lookup'),
        doRequestMs: timing.getDuration('do_request'),
        parseResponseMs: timing.getDuration('parse_response'),
        totalMs: timings.totalMs,
      },
    })
  })

  app.post('/lazy-wasm/force-load', async (c) => {
    REQUEST_COUNT++
    const tenantId = c.req.header('X-Tenant-Id') || 'default'
    const doId = c.env.LAZY_WASM_DO.idFromName(`lazy-wasm-${tenantId}`)
    const stub = c.env.LAZY_WASM_DO.get(doId)
    const response = await stub.fetch(
      new Request('https://internal/force-load', { method: 'POST' })
    )
    return response
  })

  // Multi-tenant lazy WASM endpoint
  app.post('/multi-tenant/lazy-wasm/:tenantId/query', async (c) => {
    REQUEST_COUNT++
    const timing = new TimingCollector()
    const tenantId = c.req.param('tenantId')

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string; params?: unknown[] }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.LAZY_WASM_DO.idFromName(`lazy-wasm-${tenantId}`)
    const stub = c.env.LAZY_WASM_DO.get(doId)
    timing.end()

    timing.start('do_request')
    const response = await stub.fetch(
      new Request('https://internal/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: body.sql, params: body.params }),
      })
    )
    timing.end()

    timing.start('parse_response')
    const data = await response.json()
    timing.end()

    const timings = timing.getTimings()

    return c.json({
      ...data as object,
      tenantId,
      routerTimings: {
        parseBodyMs: timing.getDuration('parse_body'),
        doLookupMs: timing.getDuration('do_lookup'),
        doRequestMs: timing.getDuration('do_request'),
        parseResponseMs: timing.getDuration('parse_response'),
        totalMs: timings.totalMs,
      },
    })
  })

  // ==========================================================================
  // COMPUTE WORKER DIRECT ACCESS
  // ==========================================================================

  app.get('/compute/status', async (c) => {
    const response = await c.env.COMPUTE_WORKER.fetch('https://compute/')
    return response
  })

  // ==========================================================================
  // BENCHMARK ENDPOINTS
  // ==========================================================================

  /**
   * Cold start benchmark - forces new DO instances
   */
  app.post('/benchmark/cold-start', async (c) => {
    REQUEST_COUNT++
    const body = await c.req.json() as { sql?: string }
    const sql = body.sql || 'SELECT 1+1 as result'

    // Generate unique IDs to force cold starts
    const uniqueId = `cold-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

    const results: { new: BenchmarkResult; traditional: BenchmarkResult } = {
      new: { name: 'new-cold', success: false, e2eMs: 0 },
      traditional: { name: 'traditional-cold', success: false, e2eMs: 0 },
    }

    // Test new architecture cold start
    const newStart = performance.now()
    try {
      const doId = c.env.STATE_DO.idFromName(`state-${uniqueId}`)
      const stub = c.env.STATE_DO.get(doId)
      const response = await stub.fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      const data = await response.json() as Record<string, unknown>
      results.new = {
        name: 'new-cold',
        success: true,
        e2eMs: performance.now() - newStart,
        coldStart: data.coldStart as boolean,
        timings: data.doTimings as BenchmarkResult['timings'],
      }
    } catch (error) {
      results.new = {
        name: 'new-cold',
        success: false,
        e2eMs: performance.now() - newStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // Test traditional architecture cold start
    const tradStart = performance.now()
    try {
      const doId = c.env.TRADITIONAL_DO.idFromName(`traditional-${uniqueId}`)
      const stub = c.env.TRADITIONAL_DO.get(doId)
      const response = await stub.fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      const data = await response.json() as Record<string, unknown>
      results.traditional = {
        name: 'traditional-cold',
        success: true,
        e2eMs: performance.now() - tradStart,
        coldStart: data.coldStart as boolean,
        timings: data.doTimings as BenchmarkResult['timings'],
      }
    } catch (error) {
      results.traditional = {
        name: 'traditional-cold',
        success: false,
        e2eMs: performance.now() - tradStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    const speedup = results.traditional.e2eMs / results.new.e2eMs

    return c.json({
      benchmark: 'cold-start',
      sql,
      uniqueId,
      results,
      analysis: {
        newArchMs: results.new.e2eMs.toFixed(2),
        traditionalMs: results.traditional.e2eMs.toFixed(2),
        differenceMs: (results.traditional.e2eMs - results.new.e2eMs).toFixed(2),
        speedup: speedup.toFixed(2) + 'x',
        winner: results.new.e2eMs < results.traditional.e2eMs ? 'new' : 'traditional',
      },
    })
  })

  /**
   * Hot query benchmark - reuses existing DO instances
   */
  app.post('/benchmark/hot-query', async (c) => {
    REQUEST_COUNT++
    const body = await c.req.json() as { sql?: string }
    const sql = body.sql || 'SELECT 1+1 as result'

    // First, warm up both DOs
    const warmupNewId = c.env.STATE_DO.idFromName('state-main')
    const warmupTradId = c.env.TRADITIONAL_DO.idFromName('traditional-main')

    await c.env.STATE_DO.get(warmupNewId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT 1' }),
      })
    )
    await c.env.TRADITIONAL_DO.get(warmupTradId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT 1' }),
      })
    )

    const results: { new: BenchmarkResult; traditional: BenchmarkResult } = {
      new: { name: 'new-hot', success: false, e2eMs: 0 },
      traditional: { name: 'traditional-hot', success: false, e2eMs: 0 },
    }

    // Test new architecture hot query
    const newStart = performance.now()
    try {
      const doId = c.env.STATE_DO.idFromName('state-main')
      const stub = c.env.STATE_DO.get(doId)
      const response = await stub.fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      const data = await response.json() as Record<string, unknown>
      results.new = {
        name: 'new-hot',
        success: true,
        e2eMs: performance.now() - newStart,
        coldStart: data.coldStart as boolean,
        timings: data.doTimings as BenchmarkResult['timings'],
      }
    } catch (error) {
      results.new = {
        name: 'new-hot',
        success: false,
        e2eMs: performance.now() - newStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // Test traditional architecture hot query
    const tradStart = performance.now()
    try {
      const doId = c.env.TRADITIONAL_DO.idFromName('traditional-main')
      const stub = c.env.TRADITIONAL_DO.get(doId)
      const response = await stub.fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      const data = await response.json() as Record<string, unknown>
      results.traditional = {
        name: 'traditional-hot',
        success: true,
        e2eMs: performance.now() - tradStart,
        coldStart: data.coldStart as boolean,
        timings: data.doTimings as BenchmarkResult['timings'],
      }
    } catch (error) {
      results.traditional = {
        name: 'traditional-hot',
        success: false,
        e2eMs: performance.now() - tradStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    const overhead = results.new.e2eMs - results.traditional.e2eMs

    return c.json({
      benchmark: 'hot-query',
      sql,
      results,
      analysis: {
        newArchMs: results.new.e2eMs.toFixed(2),
        traditionalMs: results.traditional.e2eMs.toFixed(2),
        rpcOverheadMs: overhead.toFixed(2),
        winner: results.new.e2eMs < results.traditional.e2eMs ? 'new' : 'traditional',
        note: 'New arch has RPC overhead to Compute Worker',
      },
    })
  })

  /**
   * Write benchmark
   */
  app.post('/benchmark/write', async (c) => {
    REQUEST_COUNT++
    const body = await c.req.json() as { sql?: string }
    const sql = body.sql || "CREATE TABLE IF NOT EXISTS test_write (id SERIAL PRIMARY KEY, value TEXT)"

    // Warm up both DOs first
    const warmupNewId = c.env.STATE_DO.idFromName('state-main')
    const warmupTradId = c.env.TRADITIONAL_DO.idFromName('traditional-main')

    await c.env.STATE_DO.get(warmupNewId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT 1' }),
      })
    )
    await c.env.TRADITIONAL_DO.get(warmupTradId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT 1' }),
      })
    )

    const results: { new: BenchmarkResult; traditional: BenchmarkResult } = {
      new: { name: 'new-write', success: false, e2eMs: 0 },
      traditional: { name: 'traditional-write', success: false, e2eMs: 0 },
    }

    // Test new architecture write
    const newStart = performance.now()
    try {
      const doId = c.env.STATE_DO.idFromName('state-main')
      const stub = c.env.STATE_DO.get(doId)
      const response = await stub.fetch(
        new Request('https://internal/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      const data = await response.json() as Record<string, unknown>
      results.new = {
        name: 'new-write',
        success: true,
        e2eMs: performance.now() - newStart,
        timings: data.timings as BenchmarkResult['timings'],
      }
    } catch (error) {
      results.new = {
        name: 'new-write',
        success: false,
        e2eMs: performance.now() - newStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // Test traditional architecture write
    const tradStart = performance.now()
    try {
      const doId = c.env.TRADITIONAL_DO.idFromName('traditional-main')
      const stub = c.env.TRADITIONAL_DO.get(doId)
      const response = await stub.fetch(
        new Request('https://internal/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      const data = await response.json() as Record<string, unknown>
      results.traditional = {
        name: 'traditional-write',
        success: true,
        e2eMs: performance.now() - tradStart,
        timings: data.timings as BenchmarkResult['timings'],
      }
    } catch (error) {
      results.traditional = {
        name: 'traditional-write',
        success: false,
        e2eMs: performance.now() - tradStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    return c.json({
      benchmark: 'write',
      sql,
      results,
      analysis: {
        newArchMs: results.new.e2eMs.toFixed(2),
        traditionalMs: results.traditional.e2eMs.toFixed(2),
        differenceMs: (results.new.e2eMs - results.traditional.e2eMs).toFixed(2),
        winner: results.new.e2eMs < results.traditional.e2eMs ? 'new' : 'traditional',
      },
    })
  })

  /**
   * Comprehensive comparison benchmark
   */
  app.post('/benchmark/compare', async (c) => {
    REQUEST_COUNT++
    const body = await c.req.json() as { iterations?: number }
    const iterations = body.iterations || 5
    const sql = 'SELECT 1+1 as result'

    const coldResults: { new: number[]; traditional: number[] } = { new: [], traditional: [] }
    const hotResults: { new: number[]; traditional: number[] } = { new: [], traditional: [] }

    // Run cold start tests
    for (let i = 0; i < iterations; i++) {
      const uniqueId = `compare-cold-${Date.now()}-${i}`

      // New arch cold start
      const newStart = performance.now()
      const newDoId = c.env.STATE_DO.idFromName(`state-${uniqueId}`)
      await c.env.STATE_DO.get(newDoId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      coldResults.new.push(performance.now() - newStart)

      // Traditional cold start
      const tradStart = performance.now()
      const tradDoId = c.env.TRADITIONAL_DO.idFromName(`traditional-${uniqueId}`)
      await c.env.TRADITIONAL_DO.get(tradDoId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      coldResults.traditional.push(performance.now() - tradStart)
    }

    // Warm up for hot tests
    const mainNewId = c.env.STATE_DO.idFromName('state-main')
    const mainTradId = c.env.TRADITIONAL_DO.idFromName('traditional-main')
    await c.env.STATE_DO.get(mainNewId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
    )
    await c.env.TRADITIONAL_DO.get(mainTradId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
    )

    // Run hot query tests
    for (let i = 0; i < iterations; i++) {
      // New arch hot
      const newStart = performance.now()
      await c.env.STATE_DO.get(mainNewId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      hotResults.new.push(performance.now() - newStart)

      // Traditional hot
      const tradStart = performance.now()
      await c.env.TRADITIONAL_DO.get(mainTradId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      hotResults.traditional.push(performance.now() - tradStart)
    }

    const stats = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b)
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: arr.reduce((a, b) => a + b, 0) / arr.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
      }
    }

    const coldStatsNew = stats(coldResults.new)
    const coldStatsTrad = stats(coldResults.traditional)
    const hotStatsNew = stats(hotResults.new)
    const hotStatsTrad = stats(hotResults.traditional)

    return c.json({
      benchmark: 'compare',
      iterations,
      sql,
      coldStart: {
        new: coldStatsNew,
        traditional: coldStatsTrad,
        speedup: (coldStatsTrad.avg / coldStatsNew.avg).toFixed(2) + 'x',
        savings: (coldStatsTrad.avg - coldStatsNew.avg).toFixed(2) + 'ms',
      },
      hotQuery: {
        new: hotStatsNew,
        traditional: hotStatsTrad,
        rpcOverhead: (hotStatsNew.avg - hotStatsTrad.avg).toFixed(2) + 'ms',
      },
      analysis: {
        coldStartWinner: coldStatsNew.avg < coldStatsTrad.avg ? 'new' : 'traditional',
        hotQueryWinner: hotStatsNew.avg < hotStatsTrad.avg ? 'new' : 'traditional',
        recommendation:
          coldStatsTrad.avg - coldStatsNew.avg > (hotStatsNew.avg - hotStatsTrad.avg) * 10
            ? 'New architecture recommended - cold start savings outweigh RPC overhead'
            : 'Consider traditional architecture if hot query latency is critical',
      },
    })
  })

  /**
   * Triple-compare benchmark: Traditional vs New vs Hybrid
   * Tests all three architectures to find the best approach
   */
  app.post('/benchmark/triple-compare', async (c) => {
    REQUEST_COUNT++
    const body = await c.req.json() as { iterations?: number }
    const iterations = body.iterations || 5
    const sql = 'SELECT 1+1 as result'

    const coldResults: { new: number[]; traditional: number[]; hybrid: number[] } = { new: [], traditional: [], hybrid: [] }
    const hotResults: { new: number[]; traditional: number[]; hybrid: number[] } = { new: [], traditional: [], hybrid: [] }
    const hybridRouted: boolean[] = []

    // Run cold start tests
    for (let i = 0; i < iterations; i++) {
      const uniqueId = `triple-cold-${Date.now()}-${i}`

      // New arch cold start
      const newStart = performance.now()
      const newDoId = c.env.STATE_DO.idFromName(`state-${uniqueId}`)
      await c.env.STATE_DO.get(newDoId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      coldResults.new.push(performance.now() - newStart)

      // Traditional cold start
      const tradStart = performance.now()
      const tradDoId = c.env.TRADITIONAL_DO.idFromName(`traditional-${uniqueId}`)
      await c.env.TRADITIONAL_DO.get(tradDoId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      coldResults.traditional.push(performance.now() - tradStart)

      // Hybrid cold start
      const hybridStart = performance.now()
      const hybridDoId = c.env.HYBRID_DO.idFromName(`hybrid-${uniqueId}`)
      const hybridResponse = await c.env.HYBRID_DO.get(hybridDoId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      coldResults.hybrid.push(performance.now() - hybridStart)
      const hybridData = await hybridResponse.json() as Record<string, unknown>
      hybridRouted.push(hybridData.wasHybridRouted as boolean)
    }

    // Warm up for hot tests
    const mainNewId = c.env.STATE_DO.idFromName('state-main')
    const mainTradId = c.env.TRADITIONAL_DO.idFromName('traditional-main')
    const mainHybridId = c.env.HYBRID_DO.idFromName('hybrid-main')

    await c.env.STATE_DO.get(mainNewId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
    )
    await c.env.TRADITIONAL_DO.get(mainTradId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
    )
    // For hybrid, we need to ensure it's warm by doing multiple requests
    await c.env.HYBRID_DO.get(mainHybridId).fetch(
      new Request('https://internal/warmup', { method: 'POST' })
    )
    // Wait for WASM to load
    await new Promise(r => setTimeout(r, 100))
    await c.env.HYBRID_DO.get(mainHybridId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
    )

    // Run hot query tests
    for (let i = 0; i < iterations; i++) {
      // New arch hot
      const newStart = performance.now()
      await c.env.STATE_DO.get(mainNewId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      hotResults.new.push(performance.now() - newStart)

      // Traditional hot
      const tradStart = performance.now()
      await c.env.TRADITIONAL_DO.get(mainTradId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      hotResults.traditional.push(performance.now() - tradStart)

      // Hybrid hot (should be direct execution now)
      const hybridStart = performance.now()
      await c.env.HYBRID_DO.get(mainHybridId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      hotResults.hybrid.push(performance.now() - hybridStart)
    }

    const stats = (arr: number[]) => {
      if (arr.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0 }
      const sorted = [...arr].sort((a, b) => a - b)
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: arr.reduce((a, b) => a + b, 0) / arr.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
      }
    }

    const coldStatsNew = stats(coldResults.new)
    const coldStatsTrad = stats(coldResults.traditional)
    const coldStatsHybrid = stats(coldResults.hybrid)
    const hotStatsNew = stats(hotResults.new)
    const hotStatsTrad = stats(hotResults.traditional)
    const hotStatsHybrid = stats(hotResults.hybrid)

    // Calculate rankings
    const coldRanking = [
      { name: 'new', avg: coldStatsNew.avg },
      { name: 'traditional', avg: coldStatsTrad.avg },
      { name: 'hybrid', avg: coldStatsHybrid.avg },
    ].sort((a, b) => a.avg - b.avg)

    const hotRanking = [
      { name: 'new', avg: hotStatsNew.avg },
      { name: 'traditional', avg: hotStatsTrad.avg },
      { name: 'hybrid', avg: hotStatsHybrid.avg },
    ].sort((a, b) => a.avg - b.avg)

    return c.json({
      benchmark: 'triple-compare',
      iterations,
      sql,
      coldStart: {
        new: coldStatsNew,
        traditional: coldStatsTrad,
        hybrid: coldStatsHybrid,
        ranking: coldRanking.map((r, i) => `${i + 1}. ${r.name} (${r.avg.toFixed(2)}ms)`),
        winner: coldRanking[0].name,
      },
      hotQuery: {
        new: hotStatsNew,
        traditional: hotStatsTrad,
        hybrid: hotStatsHybrid,
        ranking: hotRanking.map((r, i) => `${i + 1}. ${r.name} (${r.avg.toFixed(2)}ms)`),
        winner: hotRanking[0].name,
      },
      hybridBehavior: {
        coldRequestsRouted: hybridRouted.filter(Boolean).length,
        totalColdRequests: hybridRouted.length,
        routedPercentage: `${((hybridRouted.filter(Boolean).length / hybridRouted.length) * 100).toFixed(1)}%`,
      },
      analysis: {
        coldStartWinner: coldRanking[0].name,
        hotQueryWinner: hotRanking[0].name,
        hybridVsNew: {
          coldStartDiff: `${(coldStatsHybrid.avg - coldStatsNew.avg).toFixed(2)}ms`,
          hotQueryDiff: `${(hotStatsHybrid.avg - hotStatsNew.avg).toFixed(2)}ms`,
          verdict: hotStatsHybrid.avg < hotStatsNew.avg
            ? 'Hybrid wins: no RPC overhead when warm'
            : 'New wins: consistent performance',
        },
        hybridVsTraditional: {
          coldStartDiff: `${(coldStatsHybrid.avg - coldStatsTrad.avg).toFixed(2)}ms`,
          hotQueryDiff: `${(hotStatsHybrid.avg - hotStatsTrad.avg).toFixed(2)}ms`,
          verdict: coldStatsHybrid.avg < coldStatsTrad.avg
            ? 'Hybrid wins: fast cold starts via compute worker'
            : 'Traditional wins: simpler architecture',
        },
        recommendation:
          coldStatsHybrid.avg < coldStatsTrad.avg && hotStatsHybrid.avg <= hotStatsTrad.avg * 1.1
            ? 'HYBRID RECOMMENDED: Best of both worlds - fast cold starts AND low warm latency'
            : coldStatsNew.avg < coldStatsTrad.avg
              ? 'NEW ARCH RECOMMENDED: Consistently fast cold starts outweigh RPC overhead'
              : 'TRADITIONAL RECOMMENDED: Simplest architecture with acceptable performance',
      },
    })
  })

  /**
   * Quad-compare benchmark: Traditional vs New vs Hybrid vs Thin-State
   * Tests all four architectures to find the best approach
   */
  app.post('/benchmark/quad-compare', async (c) => {
    REQUEST_COUNT++
    const body = await c.req.json() as { iterations?: number }
    const iterations = body.iterations || 5
    const sql = 'SELECT 1+1 as result'

    const coldResults: { new: number[]; traditional: number[]; hybrid: number[]; thinState: number[] } = {
      new: [], traditional: [], hybrid: [], thinState: []
    }
    const hotResults: { new: number[]; traditional: number[]; hybrid: number[]; thinState: number[] } = {
      new: [], traditional: [], hybrid: [], thinState: []
    }

    // Run cold start tests
    for (let i = 0; i < iterations; i++) {
      const uniqueId = `quad-cold-${Date.now()}-${i}`

      // New arch cold start
      const newStart = performance.now()
      const newDoId = c.env.STATE_DO.idFromName(`state-${uniqueId}`)
      await c.env.STATE_DO.get(newDoId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      coldResults.new.push(performance.now() - newStart)

      // Traditional cold start
      const tradStart = performance.now()
      const tradDoId = c.env.TRADITIONAL_DO.idFromName(`traditional-${uniqueId}`)
      await c.env.TRADITIONAL_DO.get(tradDoId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      coldResults.traditional.push(performance.now() - tradStart)

      // Hybrid cold start
      const hybridStart = performance.now()
      const hybridDoId = c.env.HYBRID_DO.idFromName(`hybrid-${uniqueId}`)
      await c.env.HYBRID_DO.get(hybridDoId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      coldResults.hybrid.push(performance.now() - hybridStart)

      // Thin State cold start
      const thinStart = performance.now()
      const thinDoId = c.env.THIN_STATE_DO.idFromName(`thin-state-${uniqueId}`)
      await c.env.THIN_STATE_DO.get(thinDoId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      coldResults.thinState.push(performance.now() - thinStart)
    }

    // Warm up for hot tests
    const mainNewId = c.env.STATE_DO.idFromName('state-main')
    const mainTradId = c.env.TRADITIONAL_DO.idFromName('traditional-main')
    const mainHybridId = c.env.HYBRID_DO.idFromName('hybrid-main')
    const mainThinId = c.env.THIN_STATE_DO.idFromName('thin-state-main')

    await c.env.STATE_DO.get(mainNewId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
    )
    await c.env.TRADITIONAL_DO.get(mainTradId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
    )
    // For hybrid, ensure WASM is loaded
    await c.env.HYBRID_DO.get(mainHybridId).fetch(
      new Request('https://internal/warmup', { method: 'POST' })
    )
    await new Promise(r => setTimeout(r, 100))
    await c.env.HYBRID_DO.get(mainHybridId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
    )
    // Thin state doesn't need warmup - it's always delegating
    await c.env.THIN_STATE_DO.get(mainThinId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
    )

    // Run hot query tests
    for (let i = 0; i < iterations; i++) {
      // New arch hot
      const newStart = performance.now()
      await c.env.STATE_DO.get(mainNewId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      hotResults.new.push(performance.now() - newStart)

      // Traditional hot
      const tradStart = performance.now()
      await c.env.TRADITIONAL_DO.get(mainTradId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      hotResults.traditional.push(performance.now() - tradStart)

      // Hybrid hot (direct execution)
      const hybridStart = performance.now()
      await c.env.HYBRID_DO.get(mainHybridId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      hotResults.hybrid.push(performance.now() - hybridStart)

      // Thin State hot (always delegates)
      const thinStart = performance.now()
      await c.env.THIN_STATE_DO.get(mainThinId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      hotResults.thinState.push(performance.now() - thinStart)
    }

    const stats = (arr: number[]) => {
      if (arr.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0 }
      const sorted = [...arr].sort((a, b) => a - b)
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: arr.reduce((a, b) => a + b, 0) / arr.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
      }
    }

    const coldStatsNew = stats(coldResults.new)
    const coldStatsTrad = stats(coldResults.traditional)
    const coldStatsHybrid = stats(coldResults.hybrid)
    const coldStatsThin = stats(coldResults.thinState)
    const hotStatsNew = stats(hotResults.new)
    const hotStatsTrad = stats(hotResults.traditional)
    const hotStatsHybrid = stats(hotResults.hybrid)
    const hotStatsThin = stats(hotResults.thinState)

    // Calculate rankings
    const coldRanking = [
      { name: 'new', avg: coldStatsNew.avg },
      { name: 'traditional', avg: coldStatsTrad.avg },
      { name: 'hybrid', avg: coldStatsHybrid.avg },
      { name: 'thinState', avg: coldStatsThin.avg },
    ].sort((a, b) => a.avg - b.avg)

    const hotRanking = [
      { name: 'new', avg: hotStatsNew.avg },
      { name: 'traditional', avg: hotStatsTrad.avg },
      { name: 'hybrid', avg: hotStatsHybrid.avg },
      { name: 'thinState', avg: hotStatsThin.avg },
    ].sort((a, b) => a.avg - b.avg)

    return c.json({
      benchmark: 'quad-compare',
      iterations,
      sql,
      coldStart: {
        new: coldStatsNew,
        traditional: coldStatsTrad,
        hybrid: coldStatsHybrid,
        thinState: coldStatsThin,
        ranking: coldRanking.map((r, i) => `${i + 1}. ${r.name} (${r.avg.toFixed(2)}ms)`),
        winner: coldRanking[0].name,
      },
      hotQuery: {
        new: hotStatsNew,
        traditional: hotStatsTrad,
        hybrid: hotStatsHybrid,
        thinState: hotStatsThin,
        ranking: hotRanking.map((r, i) => `${i + 1}. ${r.name} (${r.avg.toFixed(2)}ms)`),
        winner: hotRanking[0].name,
      },
      analysis: {
        coldStartWinner: coldRanking[0].name,
        hotQueryWinner: hotRanking[0].name,
        thinStateVsTraditional: {
          coldStartSavingsMs: `${(coldStatsTrad.avg - coldStatsThin.avg).toFixed(2)}ms`,
          coldStartSpeedup: `${(coldStatsTrad.avg / coldStatsThin.avg).toFixed(2)}x`,
          hotQueryOverheadMs: `${(hotStatsThin.avg - hotStatsTrad.avg).toFixed(2)}ms`,
        },
        thinStateVsHybrid: {
          coldStartDiffMs: `${(coldStatsHybrid.avg - coldStatsThin.avg).toFixed(2)}ms`,
          hotQueryDiffMs: `${(hotStatsThin.avg - hotStatsHybrid.avg).toFixed(2)}ms`,
          verdict: coldStatsThin.avg < coldStatsHybrid.avg
            ? 'Thin State wins cold starts (no WASM to even optionally load)'
            : 'Hybrid matches thin state cold starts',
        },
        recommendation:
          coldStatsThin.avg < coldStatsTrad.avg * 0.5
            ? 'THIN STATE: Dramatic cold start improvement, consistent latency'
            : coldStatsHybrid.avg < coldStatsTrad.avg && hotStatsHybrid.avg <= hotStatsTrad.avg * 1.1
              ? 'HYBRID: Best balance of cold start and warm performance'
              : 'TRADITIONAL: Simplest if cold starts are acceptable',
      },
    })
  })

  /**
   * Direct thin-state vs hybrid comparison benchmark
   * Tests the hypothesis: thin state has faster cold starts, hybrid has faster warm queries
   */
  app.post('/benchmark/thin-vs-hybrid', async (c) => {
    REQUEST_COUNT++
    const body = await c.req.json() as { iterations?: number }
    const iterations = body.iterations || 10
    const sql = 'SELECT 1+1 as result'

    const results = {
      thinState: {
        cold: [] as number[],
        hot: [] as number[],
      },
      hybrid: {
        cold: [] as number[],
        coldRouted: [] as boolean[], // Was request routed to compute worker?
        hot: [] as number[],
        hotDirect: [] as boolean[], // Was request executed directly (WASM)?
      },
    }

    // Cold start tests
    for (let i = 0; i < iterations; i++) {
      const uniqueId = `thin-vs-hybrid-${Date.now()}-${i}`

      // Thin State cold start
      const thinStart = performance.now()
      await c.env.THIN_STATE_DO.get(c.env.THIN_STATE_DO.idFromName(`thin-${uniqueId}`)).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      results.thinState.cold.push(performance.now() - thinStart)

      // Hybrid cold start
      const hybridStart = performance.now()
      const hybridResponse = await c.env.HYBRID_DO.get(c.env.HYBRID_DO.idFromName(`hybrid-${uniqueId}`)).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      results.hybrid.cold.push(performance.now() - hybridStart)
      const hybridData = await hybridResponse.json() as Record<string, unknown>
      results.hybrid.coldRouted.push(hybridData.wasHybridRouted as boolean)
    }

    // Warm up main instances
    const mainThinId = c.env.THIN_STATE_DO.idFromName('thin-state-main')
    const mainHybridId = c.env.HYBRID_DO.idFromName('hybrid-main')

    // Warm thin state (just needs to hit the compute worker)
    await c.env.THIN_STATE_DO.get(mainThinId).fetch(
      new Request('https://internal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
    )

    // Warm hybrid with WASM
    await c.env.HYBRID_DO.get(mainHybridId).fetch(
      new Request('https://internal/warmup', { method: 'POST' })
    )
    await new Promise(r => setTimeout(r, 200)) // Give WASM time to load

    // Hot query tests
    for (let i = 0; i < iterations; i++) {
      // Thin State hot (always delegates)
      const thinStart = performance.now()
      await c.env.THIN_STATE_DO.get(mainThinId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      results.thinState.hot.push(performance.now() - thinStart)

      // Hybrid hot (should be direct execution)
      const hybridStart = performance.now()
      const hybridResponse = await c.env.HYBRID_DO.get(mainHybridId).fetch(
        new Request('https://internal/timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql }),
        })
      )
      results.hybrid.hot.push(performance.now() - hybridStart)
      const hybridData = await hybridResponse.json() as Record<string, unknown>
      results.hybrid.hotDirect.push(!(hybridData.wasHybridRouted as boolean))
    }

    const stats = (arr: number[]) => {
      if (arr.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0 }
      const sorted = [...arr].sort((a, b) => a - b)
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: arr.reduce((a, b) => a + b, 0) / arr.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
      }
    }

    const thinColdStats = stats(results.thinState.cold)
    const thinHotStats = stats(results.thinState.hot)
    const hybridColdStats = stats(results.hybrid.cold)
    const hybridHotStats = stats(results.hybrid.hot)

    const coldRoutedCount = results.hybrid.coldRouted.filter(Boolean).length
    const hotDirectCount = results.hybrid.hotDirect.filter(Boolean).length

    return c.json({
      benchmark: 'thin-vs-hybrid',
      iterations,
      sql,
      thinState: {
        coldStart: thinColdStats,
        hotQuery: thinHotStats,
        note: 'Always delegates to compute worker (no WASM)',
      },
      hybrid: {
        coldStart: hybridColdStats,
        hotQuery: hybridHotStats,
        coldRoutedToCompute: `${coldRoutedCount}/${iterations}`,
        hotExecutedDirect: `${hotDirectCount}/${iterations}`,
        note: 'Routes to compute when cold, direct when warm',
      },
      comparison: {
        coldStart: {
          thinStateAvgMs: thinColdStats.avg.toFixed(2),
          hybridAvgMs: hybridColdStats.avg.toFixed(2),
          differenceMs: (hybridColdStats.avg - thinColdStats.avg).toFixed(2),
          winner: thinColdStats.avg < hybridColdStats.avg ? 'thinState' : 'hybrid',
        },
        hotQuery: {
          thinStateAvgMs: thinHotStats.avg.toFixed(2),
          hybridAvgMs: hybridHotStats.avg.toFixed(2),
          differenceMs: (thinHotStats.avg - hybridHotStats.avg).toFixed(2),
          winner: thinHotStats.avg < hybridHotStats.avg ? 'thinState' : 'hybrid',
        },
      },
      analysis: {
        hypothesis: 'Thin state should have slightly faster cold starts (no WASM to skip), hybrid should have faster warm queries (direct execution)',
        coldStartResult: thinColdStats.avg < hybridColdStats.avg
          ? 'CONFIRMED: Thin state has faster cold starts'
          : 'UNEXPECTED: Hybrid matches or beats thin state cold starts',
        hotQueryResult: hybridHotStats.avg < thinHotStats.avg
          ? 'CONFIRMED: Hybrid has faster warm queries (no RPC overhead)'
          : 'UNEXPECTED: Thin state matches hybrid warm queries',
        overallRecommendation:
          thinColdStats.avg < hybridColdStats.avg && hybridHotStats.avg < thinHotStats.avg
            ? 'USE CASE DEPENDENT: Thin state for cold-start-critical, Hybrid for query-latency-critical'
            : thinColdStats.avg < hybridColdStats.avg
              ? 'THIN STATE: Better cold starts without significant warm query penalty'
              : 'HYBRID: Best overall performance profile',
      },
    })
  })

  // ==========================================================================
  // MULTI-TENANT BENCHMARK ENDPOINTS
  // Tests the key hypothesis: shared compute worker pool stays warm from
  // aggregate traffic across many tenants
  // ==========================================================================

  /**
   * Multi-tenant query via new architecture (State DO + Compute Worker)
   * Each tenantId maps to a unique State DO
   */
  app.post('/multi-tenant/new/:tenantId/query', async (c) => {
    REQUEST_COUNT++
    const tenantId = c.req.param('tenantId')
    const timing = new TimingCollector()
    const requestTimestamp = Date.now()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.STATE_DO.idFromName(`tenant-${tenantId}`)
    const stub = c.env.STATE_DO.get(doId)
    timing.end()

    timing.start('do_request')
    const response = await stub.fetch(
      new Request('https://internal/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: body.sql, requestId: timing.requestId }),
      })
    )
    timing.end()

    timing.start('parse_response')
    const data = await response.json() as Record<string, unknown>
    timing.end()

    const timings = timing.getTimings()

    // Extract cold start info from nested response
    const wasColdStart = data.coldStart as boolean
    const computeWorkerInfo = data.computeWorkerInfo as Record<string, unknown> | undefined
    const computeWorkerWarm = computeWorkerInfo ? !(computeWorkerInfo.wasColdStart as boolean) : undefined

    return c.json({
      success: true,
      architecture: 'new',
      tenantId,
      ...data,
      multiTenantInfo: {
        wasColdStart,
        computeWorkerWarm,
        totalMs: timings.totalMs,
        requestTimestamp: new Date(requestTimestamp).toISOString(),
      },
      routerTimings: {
        parseBodyMs: timing.getDuration('parse_body'),
        doLookupMs: timing.getDuration('do_lookup'),
        doRequestMs: timing.getDuration('do_request'),
        parseResponseMs: timing.getDuration('parse_response'),
        totalMs: timings.totalMs,
      },
    })
  })

  /**
   * Multi-tenant query via traditional architecture (WASM in DO)
   * Each tenantId maps to a unique Traditional DO
   */
  app.post('/multi-tenant/traditional/:tenantId/query', async (c) => {
    REQUEST_COUNT++
    const tenantId = c.req.param('tenantId')
    const timing = new TimingCollector()
    const requestTimestamp = Date.now()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.TRADITIONAL_DO.idFromName(`tenant-${tenantId}`)
    const stub = c.env.TRADITIONAL_DO.get(doId)
    timing.end()

    timing.start('do_request')
    const response = await stub.fetch(
      new Request('https://internal/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: body.sql, requestId: timing.requestId }),
      })
    )
    timing.end()

    timing.start('parse_response')
    const data = await response.json() as Record<string, unknown>
    timing.end()

    const timings = timing.getTimings()
    const wasColdStart = data.coldStart as boolean

    return c.json({
      success: true,
      architecture: 'traditional',
      tenantId,
      ...data,
      multiTenantInfo: {
        wasColdStart,
        totalMs: timings.totalMs,
        requestTimestamp: new Date(requestTimestamp).toISOString(),
      },
      routerTimings: {
        parseBodyMs: timing.getDuration('parse_body'),
        doLookupMs: timing.getDuration('do_lookup'),
        doRequestMs: timing.getDuration('do_request'),
        parseResponseMs: timing.getDuration('parse_response'),
        totalMs: timings.totalMs,
      },
    })
  })

  /**
   * Multi-tenant query via hybrid architecture
   * Each tenantId maps to a unique Hybrid DO
   */
  app.post('/multi-tenant/hybrid/:tenantId/query', async (c) => {
    REQUEST_COUNT++
    const tenantId = c.req.param('tenantId')
    const timing = new TimingCollector()
    const requestTimestamp = Date.now()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.HYBRID_DO.idFromName(`tenant-${tenantId}`)
    const stub = c.env.HYBRID_DO.get(doId)
    timing.end()

    timing.start('do_request')
    const response = await stub.fetch(
      new Request('https://internal/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: body.sql, requestId: timing.requestId }),
      })
    )
    timing.end()

    timing.start('parse_response')
    const data = await response.json() as Record<string, unknown>
    timing.end()

    const timings = timing.getTimings()
    const wasColdStart = data.coldStart as boolean
    const wasHybridRouted = data.wasHybridRouted as boolean
    const wasWarm = data.wasWarm as boolean
    const computeWorkerInfo = data.computeWorkerInfo as Record<string, unknown> | undefined
    const computeWorkerWarm = computeWorkerInfo ? !(computeWorkerInfo.wasColdStart as boolean) : undefined

    return c.json({
      success: true,
      architecture: 'hybrid',
      tenantId,
      ...data,
      multiTenantInfo: {
        wasColdStart,
        wasHybridRouted,
        wasWarm,
        computeWorkerWarm,
        totalMs: timings.totalMs,
        requestTimestamp: new Date(requestTimestamp).toISOString(),
      },
      routerTimings: {
        parseBodyMs: timing.getDuration('parse_body'),
        doLookupMs: timing.getDuration('do_lookup'),
        doRequestMs: timing.getDuration('do_request'),
        parseResponseMs: timing.getDuration('parse_response'),
        totalMs: timings.totalMs,
      },
    })
  })

  /**
   * Multi-tenant query via thin-state architecture
   * Each tenantId maps to a unique Thin State DO
   */
  app.post('/multi-tenant/thin-state/:tenantId/query', async (c) => {
    REQUEST_COUNT++
    const tenantId = c.req.param('tenantId')
    const timing = new TimingCollector()
    const requestTimestamp = Date.now()

    timing.start('parse_body')
    const body = await c.req.json() as { sql: string; params?: unknown[] }
    timing.end()

    if (!body.sql) {
      return c.json({ error: true, message: 'Missing sql parameter' }, 400)
    }

    timing.start('do_lookup')
    const doId = c.env.THIN_STATE_DO.idFromName(`tenant-${tenantId}`)
    const stub = c.env.THIN_STATE_DO.get(doId)
    timing.end()

    timing.start('do_request')
    const response = await stub.fetch(
      new Request('https://internal/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: body.sql, params: body.params, requestId: timing.requestId }),
      })
    )
    timing.end()

    timing.start('parse_response')
    const data = await response.json() as Record<string, unknown>
    timing.end()

    const timings = timing.getTimings()
    const wasColdStart = data.coldStart as boolean
    const computeWorkerInfo = data.computeWorkerInfo as Record<string, unknown> | undefined
    const computeWorkerWarm = computeWorkerInfo ? !(computeWorkerInfo.wasColdStart as boolean) : undefined

    return c.json({
      success: true,
      architecture: 'thin-state',
      tenantId,
      ...data,
      multiTenantInfo: {
        wasColdStart,
        computeWorkerWarm,
        totalMs: timings.totalMs,
        requestTimestamp: new Date(requestTimestamp).toISOString(),
      },
      routerTimings: {
        parseBodyMs: timing.getDuration('parse_body'),
        doLookupMs: timing.getDuration('do_lookup'),
        doRequestMs: timing.getDuration('do_request'),
        parseResponseMs: timing.getDuration('parse_response'),
        totalMs: timings.totalMs,
      },
    })
  })

  /**
   * Multi-tenant burst benchmark
   * Simulates N unique tenants all making requests in quick succession
   */
  app.post('/benchmark/multi-tenant/burst', async (c) => {
    REQUEST_COUNT++
    const body = await c.req.json() as {
      tenantCount?: number
      sql?: string
    }
    const tenantCount = Math.min(body.tenantCount || 50, 100) // Cap at 100
    const sql = body.sql || 'SELECT 1+1 as result'
    const burstId = `burst-${Date.now()}`

    const results = {
      new: [] as Array<{ tenantId: string; wasColdStart: boolean; computeWorkerWarm?: boolean; totalMs: number; success: boolean; error?: string }>,
      traditional: [] as Array<{ tenantId: string; wasColdStart: boolean; totalMs: number; success: boolean; error?: string }>,
    }

    // Test new architecture - all requests in parallel to simulate burst
    const newPromises = Array.from({ length: tenantCount }, async (_, i) => {
      const tenantId = `${burstId}-tenant-${i}`
      const start = performance.now()
      try {
        const doId = c.env.STATE_DO.idFromName(`tenant-${tenantId}`)
        const stub = c.env.STATE_DO.get(doId)
        const response = await stub.fetch(
          new Request('https://internal/timing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql }),
          })
        )
        const data = await response.json() as Record<string, unknown>
        const computeWorkerInfo = data.computeWorkerInfo as Record<string, unknown> | undefined
        return {
          tenantId,
          wasColdStart: data.coldStart as boolean,
          computeWorkerWarm: computeWorkerInfo ? !(computeWorkerInfo.wasColdStart as boolean) : undefined,
          totalMs: performance.now() - start,
          success: true,
        }
      } catch (error) {
        return {
          tenantId,
          wasColdStart: true,
          totalMs: performance.now() - start,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })

    results.new = await Promise.all(newPromises)

    // Wait a bit between architectures to avoid interference
    await new Promise(r => setTimeout(r, 100))

    // Test traditional architecture - all requests in parallel
    const tradPromises = Array.from({ length: tenantCount }, async (_, i) => {
      const tenantId = `${burstId}-tenant-${i}`
      const start = performance.now()
      try {
        const doId = c.env.TRADITIONAL_DO.idFromName(`tenant-${tenantId}`)
        const stub = c.env.TRADITIONAL_DO.get(doId)
        const response = await stub.fetch(
          new Request('https://internal/timing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql }),
          })
        )
        const data = await response.json() as Record<string, unknown>
        return {
          tenantId,
          wasColdStart: data.coldStart as boolean,
          totalMs: performance.now() - start,
          success: true,
        }
      } catch (error) {
        return {
          tenantId,
          wasColdStart: true,
          totalMs: performance.now() - start,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })

    results.traditional = await Promise.all(tradPromises)

    // Analyze results
    const newColdStarts = results.new.filter(r => r.wasColdStart).length
    const newComputeWarm = results.new.filter(r => r.computeWorkerWarm === true).length
    const tradColdStarts = results.traditional.filter(r => r.wasColdStart).length

    const newSuccessful = results.new.filter(r => r.success)
    const tradSuccessful = results.traditional.filter(r => r.success)

    const stats = (arr: number[]) => {
      if (arr.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0 }
      const sorted = [...arr].sort((a, b) => a - b)
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: arr.reduce((a, b) => a + b, 0) / arr.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
      }
    }

    const newStats = stats(newSuccessful.map(r => r.totalMs))
    const tradStats = stats(tradSuccessful.map(r => r.totalMs))

    return c.json({
      benchmark: 'multi-tenant-burst',
      tenantCount,
      burstId,
      sql,
      summary: {
        new: {
          coldStarts: newColdStarts,
          computeWorkerWarmHits: newComputeWarm,
          coldStartRate: `${((newColdStarts / tenantCount) * 100).toFixed(1)}%`,
          computeWorkerWarmRate: `${((newComputeWarm / tenantCount) * 100).toFixed(1)}%`,
          successCount: newSuccessful.length,
          timing: newStats,
        },
        traditional: {
          coldStarts: tradColdStarts,
          coldStartRate: `${((tradColdStarts / tenantCount) * 100).toFixed(1)}%`,
          successCount: tradSuccessful.length,
          timing: tradStats,
        },
      },
      analysis: {
        coldStartReduction: `${tradColdStarts - newColdStarts} fewer cold starts with new arch`,
        coldStartRateImprovement: `${(((tradColdStarts - newColdStarts) / tenantCount) * 100).toFixed(1)}% reduction`,
        avgLatencyDiff: `${(newStats.avg - tradStats.avg).toFixed(0)}ms overhead in new arch`,
        hypothesis: newColdStarts < tradColdStarts
          ? 'SUPPORTED: Shared compute worker pool reduces cold starts'
          : 'NOT SUPPORTED: Both architectures have similar cold start rates',
      },
      details: {
        new: results.new,
        traditional: results.traditional,
      },
    })
  })

  // ==========================================================================
  // DO ID vs NAME ROUTING BENCHMARK
  // Tests the latency difference between idFromName() and get(cachedId)
  // ==========================================================================

  /**
   * Benchmark: DO routing latency (idFromName vs cached ID)
   *
   * Tests three scenarios:
   * 1. idFromName() called every time (simulates typical usage)
   * 2. Cached ID reused (simulates caching the DurableObjectId)
   * 3. ID structure analysis (what's in the ID?)
   */
  app.post('/benchmark/do-routing', async (c) => {
    REQUEST_COUNT++
    const body = await c.req.json() as { iterations?: number }
    const iterations = Math.min(body.iterations || 100, 500) // Cap at 500

    const results = {
      idFromNameEveryTime: { times: [] as number[], totalMs: 0 },
      cachedIdReuse: { times: [] as number[], totalMs: 0 },
      idStructure: {} as Record<string, unknown>,
    }

    // =================================================================
    // TEST 1: idFromName() called every request (typical pattern)
    // =================================================================
    const nameBasedStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now()

      // This is what most code does: call idFromName() each time
      const id = c.env.STATE_DO.idFromName(`benchmark-tenant-${i % 10}`)
      const stub = c.env.STATE_DO.get(id)

      // Minimal operation - just get status
      await stub.fetch(new Request('https://internal/status'))

      results.idFromNameEveryTime.times.push(performance.now() - iterStart)
    }
    results.idFromNameEveryTime.totalMs = performance.now() - nameBasedStart

    // Small pause between tests
    await new Promise(r => setTimeout(r, 50))

    // =================================================================
    // TEST 2: Cache IDs upfront, then reuse (optimized pattern)
    // =================================================================
    // Pre-compute all IDs (this is what idFromName costs)
    const idCacheStart = performance.now()
    const cachedIds = Array.from({ length: 10 }, (_, i) =>
      c.env.STATE_DO.idFromName(`benchmark-tenant-${i}`)
    )
    const idCacheTime = performance.now() - idCacheStart

    // Now use cached IDs
    const cachedIdStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now()

      // Reuse cached ID - no idFromName() call
      const id = cachedIds[i % 10]
      const stub = c.env.STATE_DO.get(id)

      // Same minimal operation
      await stub.fetch(new Request('https://internal/status'))

      results.cachedIdReuse.times.push(performance.now() - iterStart)
    }
    results.cachedIdReuse.totalMs = performance.now() - cachedIdStart

    // =================================================================
    // TEST 3: Analyze ID structure
    // =================================================================
    const sampleId = c.env.STATE_DO.idFromName('analysis-test')
    const uniqueId = c.env.STATE_DO.newUniqueId()

    results.idStructure = {
      namedId: {
        string: sampleId.toString(),
        length: sampleId.toString().length,
        name: sampleId.name, // Should return the name for named IDs
        isHex: /^[0-9a-f]+$/i.test(sampleId.toString()),
      },
      uniqueId: {
        string: uniqueId.toString(),
        length: uniqueId.toString().length,
        name: uniqueId.name, // Should be undefined for unique IDs
        isHex: /^[0-9a-f]+$/i.test(uniqueId.toString()),
      },
      // Test if same name produces same ID (deterministic)
      deterministic: {
        id1: c.env.STATE_DO.idFromName('test-deterministic').toString(),
        id2: c.env.STATE_DO.idFromName('test-deterministic').toString(),
        areSame: c.env.STATE_DO.idFromName('test-deterministic').toString() ===
                 c.env.STATE_DO.idFromName('test-deterministic').toString(),
      },
    }

    // =================================================================
    // ANALYSIS
    // =================================================================
    const stats = (times: number[]) => {
      const sorted = [...times].sort((a, b) => a - b)
      return {
        min: sorted[0]?.toFixed(2),
        max: sorted[sorted.length - 1]?.toFixed(2),
        avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
        p50: sorted[Math.floor(sorted.length * 0.5)]?.toFixed(2),
        p95: sorted[Math.floor(sorted.length * 0.95)]?.toFixed(2),
        p99: sorted[Math.floor(sorted.length * 0.99)]?.toFixed(2),
      }
    }

    const nameBasedStats = stats(results.idFromNameEveryTime.times)
    const cachedIdStats = stats(results.cachedIdReuse.times)

    const avgDiff = parseFloat(nameBasedStats.avg) - parseFloat(cachedIdStats.avg)
    const totalOverhead = results.idFromNameEveryTime.totalMs - results.cachedIdReuse.totalMs

    return c.json({
      benchmark: 'do-routing-latency',
      iterations,
      idCacheTimeMs: idCacheTime.toFixed(3),

      results: {
        idFromNameEveryTime: {
          totalMs: results.idFromNameEveryTime.totalMs.toFixed(2),
          stats: nameBasedStats,
        },
        cachedIdReuse: {
          totalMs: results.cachedIdReuse.totalMs.toFixed(2),
          stats: cachedIdStats,
        },
      },

      idStructure: results.idStructure,

      analysis: {
        avgDifferenceMs: avgDiff.toFixed(3),
        totalOverheadMs: totalOverhead.toFixed(2),
        perRequestOverheadMs: (totalOverhead / iterations).toFixed(4),
        percentSlower: ((avgDiff / parseFloat(cachedIdStats.avg)) * 100).toFixed(2) + '%',

        conclusion: Math.abs(avgDiff) < 0.1
          ? 'idFromName() is a LOCAL HASH - no network overhead detected'
          : avgDiff > 0.5
            ? 'Unexpected overhead detected - may be first-access coordination'
            : 'Minimal difference - idFromName() appears to be local operation',

        recommendation: Math.abs(avgDiff) < 0.5
          ? 'Caching DO IDs provides negligible benefit - idFromName() is effectively free'
          : 'Consider caching DO IDs if this overhead is significant for your use case',
      },

      documentation: {
        whatIdFromNameDoes: 'Computes a deterministic hash from the name string - LOCAL operation, no network call',
        whatGetDoes: 'Creates a stub for the DO - returns immediately, no network call until stub is used',
        whereLatencyComes: 'Network latency only occurs when calling methods on the stub (fetch, RPC)',
        firstAccessNote: 'First access to a NEW name may have global coordination overhead (~few hundred ms)',
        cacheRecommendation: 'Caching IDs is unnecessary for performance - only useful if you need to store/serialize IDs',
      },
    })
  })

  /**
   * Benchmark: First access vs subsequent access latency
   * Tests the "round-the-world check" on first DO access
   */
  app.post('/benchmark/do-first-access', async (c) => {
    REQUEST_COUNT++
    const body = await c.req.json() as { uniqueNames?: number }
    const uniqueNames = Math.min(body.uniqueNames || 10, 50) // Cap at 50

    const results = {
      firstAccess: [] as Array<{ name: string; ms: number }>,
      subsequentAccess: [] as Array<{ name: string; ms: number }>,
    }

    // Generate unique names that have never been accessed
    const testNames = Array.from({ length: uniqueNames }, () =>
      `first-access-test-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    )

    // =================================================================
    // TEST 1: First access to brand new names (may trigger coordination)
    // =================================================================
    for (const name of testNames) {
      const start = performance.now()

      const id = c.env.STATE_DO.idFromName(name)
      const stub = c.env.STATE_DO.get(id)
      await stub.fetch(new Request('https://internal/status'))

      results.firstAccess.push({
        name,
        ms: performance.now() - start,
      })
    }

    // Small pause
    await new Promise(r => setTimeout(r, 100))

    // =================================================================
    // TEST 2: Subsequent access to the same names (should be cached)
    // =================================================================
    for (const name of testNames) {
      const start = performance.now()

      const id = c.env.STATE_DO.idFromName(name)
      const stub = c.env.STATE_DO.get(id)
      await stub.fetch(new Request('https://internal/status'))

      results.subsequentAccess.push({
        name,
        ms: performance.now() - start,
      })
    }

    // =================================================================
    // ANALYSIS
    // =================================================================
    const firstTimes = results.firstAccess.map(r => r.ms)
    const subTimes = results.subsequentAccess.map(r => r.ms)

    const stats = (times: number[]) => {
      const sorted = [...times].sort((a, b) => a - b)
      return {
        min: sorted[0]?.toFixed(2),
        max: sorted[sorted.length - 1]?.toFixed(2),
        avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
        p50: sorted[Math.floor(sorted.length * 0.5)]?.toFixed(2),
        p95: sorted[Math.floor(sorted.length * 0.95)]?.toFixed(2),
      }
    }

    const firstStats = stats(firstTimes)
    const subStats = stats(subTimes)
    const avgDiff = parseFloat(firstStats.avg) - parseFloat(subStats.avg)

    return c.json({
      benchmark: 'do-first-access-latency',
      uniqueNames,

      results: {
        firstAccess: {
          stats: firstStats,
          note: 'First access to brand new DO names',
        },
        subsequentAccess: {
          stats: subStats,
          note: 'Second access to same DO names',
        },
      },

      analysis: {
        avgDifferenceMs: avgDiff.toFixed(2),
        firstAccessOverhead: avgDiff > 50
          ? `${avgDiff.toFixed(0)}ms first-access overhead detected (global coordination)`
          : 'No significant first-access overhead detected',

        explanation: avgDiff > 100
          ? 'Large first-access overhead suggests global coordination ("round-the-world check")'
          : avgDiff > 20
            ? 'Moderate first-access overhead - may be DO instantiation cost'
            : 'First access is similar to subsequent - DO was already warm or coordination is fast',
      },

      details: {
        firstAccess: results.firstAccess.slice(0, 5), // First 5 for brevity
        subsequentAccess: results.subsequentAccess.slice(0, 5),
      },
    })
  })

  /**
   * Compute worker keep-warm endpoint
   * Triggers the compute worker to prevent cold starts
   */
  app.post('/compute/keep-warm', async (c) => {
    const start = performance.now()
    try {
      const response = await c.env.COMPUTE_WORKER.fetch('https://compute/keep-warm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'router' }),
      })
      const data = await response.json() as Record<string, unknown>
      return c.json({
        success: true,
        totalMs: performance.now() - start,
        computeWorkerResponse: data,
      })
    } catch (error) {
      return c.json({
        success: false,
        totalMs: performance.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 500)
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
