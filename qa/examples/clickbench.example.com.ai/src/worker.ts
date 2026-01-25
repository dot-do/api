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
    return c.json({
      name: 'ClickBench API',
      version: '1.0.0',
      description: 'ClickBench analytics dataset benchmark API using PGLite in Cloudflare Workers',
      wasmStrategy: 'eager-but-non-blocking (starts loading in constructor)',
      dataset: {
        name: 'ClickBench',
        description: 'Web analytics data with 105 columns',
        source: 'https://github.com/ClickHouse/ClickBench',
        queries: 43,
        schema: 'hits table with WatchID, EventTime, EventDate, UserID, URL, etc.',
      },
      endpoints: {
        health: 'GET /ping - Health check',
        debug: 'GET /debug - DO lifecycle info',
        seed: {
          sample: 'POST /seed/sample - Seed sample data (body: { count: 10000 })',
          status: 'GET /seed/status - Get seed progress',
        },
        data: {
          hits: 'GET /hits?limit=10&offset=0 - List hits with pagination',
          stats: 'GET /stats - Get basic statistics',
        },
        queries: {
          single: 'POST /query/:id - Run specific query (0-42)',
          list: 'GET /queries - List all queries',
          categories: 'GET /queries/categories - Get queries by category',
        },
        benchmark: {
          full: 'POST /benchmark - Run all 43 queries',
          quick: 'POST /benchmark/quick - Run 5 quick queries',
        },
      },
      examples: [
        {
          name: 'Seed 10K sample rows',
          curl: 'curl -X POST https://clickbench.example.com.ai/seed/sample -H "Content-Type: application/json" -d \'{"count": 10000}\'',
        },
        {
          name: 'Get statistics',
          curl: 'curl https://clickbench.example.com.ai/stats',
        },
        {
          name: 'Run query Q0 (count all)',
          curl: 'curl -X POST https://clickbench.example.com.ai/query/0',
        },
        {
          name: 'Run quick benchmark',
          curl: 'curl -X POST https://clickbench.example.com.ai/benchmark/quick',
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
   * Seed sample data
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
   * Get seed status
   */
  app.get('/seed/status', async (c) => {
    const stub = getDOStub(c.env)
    const result = await stub.fetch('https://internal/seed/status')
    return Response.json(await result.json())
  })

  /**
   * List hits
   */
  app.get('/hits', async (c) => {
    const stub = getDOStub(c.env)
    const limit = c.req.query('limit') || '10'
    const offset = c.req.query('offset') || '0'
    const result = await stub.fetch(`https://internal/hits?limit=${limit}&offset=${offset}`)
    return Response.json(await result.json())
  })

  /**
   * Get statistics
   */
  app.get('/stats', async (c) => {
    const stub = getDOStub(c.env)
    const result = await stub.fetch('https://internal/stats')
    return Response.json(await result.json())
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
   * Run specific query
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
    return Response.json(await result.json())
  })

  /**
   * Run full benchmark
   */
  app.post('/benchmark', async (c) => {
    const stub = getDOStub(c.env)
    const result = await stub.fetch('https://internal/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quick: false }),
    })
    return Response.json(await result.json())
  })

  /**
   * Run quick benchmark
   */
  app.post('/benchmark/quick', async (c) => {
    const stub = getDOStub(c.env)
    const result = await stub.fetch('https://internal/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quick: true }),
    })
    return Response.json(await result.json())
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
