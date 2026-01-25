/**
 * ClickBench Worker
 *
 * Cloudflare Worker for ClickBench analytics dataset benchmarking.
 * Routes requests to the ClickBench Durable Object.
 */

import { Hono } from 'hono'
import { ClickBenchDO } from './clickbench-do'
import { CLICKBENCH_QUERIES, QUICK_QUERIES } from './queries'

export { ClickBenchDO }

/**
 * Environment interface
 */
export interface Env {
  CLICKBENCH_DO: DurableObjectNamespace
}

/**
 * Create Hono app
 */
function createApp() {
  const app = new Hono<{ Bindings: Env }>()

  /**
   * Get DO stub helper
   */
  function getDOStub(env: Env, name: string = 'clickbench'): DurableObjectStub {
    const doId = env.CLICKBENCH_DO.idFromName(name)
    return env.CLICKBENCH_DO.get(doId)
  }

  /**
   * Root endpoint - API info
   */
  app.get('/', (c) => {
    const baseUrl = new URL(c.req.url).origin
    return c.json({
      name: 'ClickBench API',
      version: '1.0.0',
      description: 'ClickBench analytics dataset benchmark API using PGLite in Cloudflare Workers',
      wasmStrategy: 'eager-but-non-blocking (starts loading in constructor)',
      autoSeeding: 'Database auto-seeds with 10K sample rows on first data request (one-time initialization)',
      dataset: {
        name: 'ClickBench',
        description: 'Web analytics data with 105 columns',
        source: 'https://github.com/ClickHouse/ClickBench',
        queries: 43,
        schema: 'hits table with WatchID, EventTime, EventDate, UserID, URL, etc.',
      },
      quickStart: [
        `1. Visit ${baseUrl}/stats to trigger auto-seeding (returns 202 Accepted on first request)`,
        `2. Check ${baseUrl}/seed/status to monitor seeding progress`,
        `3. Once seeding completes, visit ${baseUrl}/queries to see available benchmark queries`,
        `4. Run ${baseUrl}/benchmark/quick (POST) to execute a quick benchmark`,
      ],
      endpoints: {
        health: {
          description: 'Health check (instant, no WASM wait)',
          method: 'GET',
          url: `${baseUrl}/ping`,
        },
        debug: {
          description: 'DO lifecycle info (instant, no WASM wait)',
          method: 'GET',
          url: `${baseUrl}/debug`,
        },
        seed: {
          sample: {
            description: 'Seed with synthetic sample data (optional - auto-seeds on first use)',
            method: 'POST',
            url: `${baseUrl}/seed/sample`,
            body: { count: 10000 },
          },
          clickbench: {
            description: 'Seed from REAL ClickBench dataset (gzipped TSV from clickhouse.com)',
            method: 'POST',
            url: `${baseUrl}/seed/clickbench`,
            body: {
              maxRows: 100000,
              batchSize: 500,
              useFull: false,
            },
            note: 'Set useFull=true for full 100M row dataset (warning: very large)',
          },
          status: {
            description: 'Get seed progress',
            method: 'GET',
            url: `${baseUrl}/seed/status`,
          },
        },
        data: {
          hits: {
            description: 'List hits with pagination (auto-seeds if empty)',
            method: 'GET',
            url: `${baseUrl}/hits?limit=10&offset=0`,
          },
          stats: {
            description: 'Get basic statistics (auto-seeds if empty)',
            method: 'GET',
            url: `${baseUrl}/stats`,
          },
        },
        queries: {
          list: {
            description: 'List all available benchmark queries',
            method: 'GET',
            url: `${baseUrl}/queries`,
          },
          categories: {
            description: 'Get queries organized by category',
            method: 'GET',
            url: `${baseUrl}/queries/categories`,
          },
          single: {
            description: 'Run specific query by ID (0-42, auto-seeds if empty)',
            method: 'POST',
            url: `${baseUrl}/query/{id}`,
            example: `${baseUrl}/query/0`,
          },
        },
        benchmark: {
          full: {
            description: 'Run all 43 queries (auto-seeds if empty)',
            method: 'POST',
            url: `${baseUrl}/benchmark`,
          },
          quick: {
            description: 'Run 5 quick queries (auto-seeds if empty)',
            method: 'POST',
            url: `${baseUrl}/benchmark/quick`,
          },
        },
      },
      examples: [
        {
          name: 'Check health',
          curl: `curl ${baseUrl}/ping`,
          clickable: `${baseUrl}/ping`,
        },
        {
          name: 'Get statistics (triggers auto-seed if needed)',
          curl: `curl ${baseUrl}/stats`,
          clickable: `${baseUrl}/stats`,
        },
        {
          name: 'Check seed status',
          curl: `curl ${baseUrl}/seed/status`,
          clickable: `${baseUrl}/seed/status`,
        },
        {
          name: 'Seed real ClickBench data (100k rows)',
          curl: `curl -X POST ${baseUrl}/seed/clickbench -H "Content-Type: application/json" -d '{"maxRows": 100000}'`,
        },
        {
          name: 'Seed real ClickBench data (1M rows)',
          curl: `curl -X POST ${baseUrl}/seed/clickbench -H "Content-Type: application/json" -d '{"maxRows": 1000000}'`,
        },
        {
          name: 'List all queries',
          curl: `curl ${baseUrl}/queries`,
          clickable: `${baseUrl}/queries`,
        },
        {
          name: 'Run query Q0 (count all)',
          curl: `curl -X POST ${baseUrl}/query/0`,
        },
        {
          name: 'Run quick benchmark',
          curl: `curl -X POST ${baseUrl}/benchmark/quick`,
        },
      ],
      timestamp: new Date().toISOString(),
    })
  })

  /**
   * Health check (instant, no WASM wait)
   */
  app.get('/ping', async (c) => {
    const stub = getDOStub(c.env)
    const result = await stub.fetch('https://internal/ping')
    return Response.json(await result.json())
  })

  /**
   * Debug info (instant, no WASM wait)
   */
  app.get('/debug', async (c) => {
    const stub = getDOStub(c.env)
    const result = await stub.fetch('https://internal/debug')
    return Response.json(await result.json())
  })

  /**
   * Seed sample data (synthetic)
   */
  app.post('/seed/sample', async (c) => {
    const stub = getDOStub(c.env)
    const body = await c.req.json()
    const result = await stub.fetch('https://internal/seed/sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return Response.json(await result.json())
  })

  /**
   * Seed from real ClickBench dataset
   */
  app.post('/seed/clickbench', async (c) => {
    const stub = getDOStub(c.env)
    let body = {}
    try {
      body = await c.req.json()
    } catch {
      // Empty body is fine
    }
    const result = await stub.fetch('https://internal/seed/clickbench', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return Response.json(await result.json())
  })

  /**
   * Get seed status
   */
  app.get('/seed/status', async (c) => {
    const stub = getDOStub(c.env)
    const result = await stub.fetch('https://internal/seed/status')
    return Response.json(await result.json())
  })

  /**
   * List hits (with auto-seeding)
   */
  app.get('/hits', async (c) => {
    const stub = getDOStub(c.env)
    const limit = c.req.query('limit') || '10'
    const offset = c.req.query('offset') || '0'
    const result = await stub.fetch(`https://internal/hits?limit=${limit}&offset=${offset}`)
    const json = await result.json()

    // Check if we need to auto-seed
    if (result.status === 202) {
      return c.json(json, 202)
    }

    return Response.json(json)
  })

  /**
   * Get statistics (with auto-seeding)
   */
  app.get('/stats', async (c) => {
    const stub = getDOStub(c.env)
    const result = await stub.fetch('https://internal/stats')
    const json = await result.json()

    // Check if we need to auto-seed
    if (result.status === 202) {
      return c.json(json, 202)
    }

    return Response.json(json)
  })

  /**
   * List all queries
   */
  app.get('/queries', (c) => {
    return c.json({
      success: true,
      queries: CLICKBENCH_QUERIES.map((q) => ({
        id: q.id,
        name: q.name,
        description: q.description,
        category: q.category,
        endpoint: `/query/${q.id}`,
      })),
      total: CLICKBENCH_QUERIES.length,
    })
  })

  /**
   * Get queries by category
   */
  app.get('/queries/categories', (c) => {
    const categories = ['count', 'aggregation', 'groupby', 'filter', 'sort', 'string', 'complex'] as const
    const result = categories.map((category) => ({
      category,
      queries: CLICKBENCH_QUERIES.filter((q) => q.category === category).map((q) => ({
        id: q.id,
        name: q.name,
        description: q.description,
      })),
      count: CLICKBENCH_QUERIES.filter((q) => q.category === category).length,
    }))

    return c.json({
      success: true,
      categories: result,
      timestamp: new Date().toISOString(),
    })
  })

  /**
   * Run specific query (with auto-seeding)
   */
  app.post('/query/:id', async (c) => {
    const queryId = parseInt(c.req.param('id'))

    if (isNaN(queryId) || queryId < 0 || queryId >= CLICKBENCH_QUERIES.length) {
      return c.json(
        {
          success: false,
          error: `Invalid query ID: ${c.req.param('id')}. Must be 0-${CLICKBENCH_QUERIES.length - 1}`,
        },
        400
      )
    }

    const stub = getDOStub(c.env)
    const result = await stub.fetch(`https://internal/query/${queryId}`, {
      method: 'POST',
    })
    const json = await result.json()

    // Check if we need to auto-seed
    if (result.status === 202) {
      return c.json(json, 202)
    }

    return Response.json(json)
  })

  /**
   * Run full benchmark (with auto-seeding)
   */
  app.post('/benchmark', async (c) => {
    const stub = getDOStub(c.env)
    const result = await stub.fetch('https://internal/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quick: false }),
    })
    const json = await result.json()

    // Check if we need to auto-seed
    if (result.status === 202) {
      return c.json(json, 202)
    }

    return Response.json(json)
  })

  /**
   * Run quick benchmark (with auto-seeding)
   */
  app.post('/benchmark/quick', async (c) => {
    const stub = getDOStub(c.env)
    const result = await stub.fetch('https://internal/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quick: true }),
    })
    const json = await result.json()

    // Check if we need to auto-seed
    if (result.status === 202) {
      return c.json(json, 202)
    }

    return Response.json(json)
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

/**
 * Default export for Cloudflare Workers
 */
export default {
  fetch: app.fetch,
}
