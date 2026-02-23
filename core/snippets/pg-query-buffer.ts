/**
 * PostgreSQL Query Buffer Snippet
 *
 * Adapts the proven DuckDB analytics-buffer pattern (94% cost savings)
 * for postgres.do query batching. Key differences from analytics:
 *
 * - Multi-tenant routing: Queries go to tenant-specific DOs
 * - Lower latency: 100ms flush (vs 5s for analytics) for OLTP
 * - Request-response: Track pending queries with promises
 *
 * Architecture:
 *   Client → Snippet (FREE) → HTTP batch → Worker → Tenant DO
 *
 * Cost savings:
 * - Snippet execution: FREE
 * - Batching: 10 queries per Worker request = 90% reduction
 * - Combined with DO hibernation: ~95% total savings
 *
 * Constraints:
 * - < 5ms CPU per request
 * - < 32KB compressed script size
 * - 2 subrequests on Pro, 5 on Enterprise
 */

// ═══════════════════════════════════════════════════════════════
// Module-level state (persists across requests on same isolate)
// ═══════════════════════════════════════════════════════════════

interface PendingQuery {
  id: string
  tenantId: string
  sql: string
  params?: unknown[]
  timestamp: number
  // Promise resolve/reject stored for response matching
  resolve: (result: QueryResult) => void
  reject: (error: Error) => void
}

interface QueryResult {
  rows: Record<string, unknown>[]
  rowCount: number
  fields?: { name: string; dataTypeId: number }[]
  duration?: number
}

interface QueryBatch {
  queries: PendingQuery[]
  lastFlush: number
  flushInProgress: boolean
}

// Per-tenant query buffers
const tenantBuffers = new Map<string, QueryBatch>()

// Stats for monitoring
const stats = {
  queriesReceived: 0,
  queriesBatched: 0,
  queriesFlushed: 0,
  batchesSent: 0,
  httpRequests: 0,
  errors: 0,
  avgBatchSize: 0,
}

let connectionId = Math.random().toString(36).slice(2, 11)

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  // Worker endpoint for query execution
  workerEndpoint: 'https://postgres.do/query/batch',
  // Batch size before flush (lower than analytics for latency)
  batchSize: 10,
  // Flush interval (100ms for OLTP latency requirements)
  flushIntervalMs: 100,
  // Timeout for waiting on responses
  responseTimeoutMs: 30000,
  // Max pending queries per tenant before force flush
  maxPendingPerTenant: 50,
}

let CONFIG = { ...DEFAULT_CONFIG }

// ═══════════════════════════════════════════════════════════════
// Buffer Management
// ═══════════════════════════════════════════════════════════════

function getOrCreateBuffer(tenantId: string): QueryBatch {
  let buffer = tenantBuffers.get(tenantId)
  if (!buffer) {
    buffer = {
      queries: [],
      lastFlush: Date.now(),
      flushInProgress: false,
    }
    tenantBuffers.set(tenantId, buffer)
  }
  return buffer
}

function shouldFlush(buffer: QueryBatch): boolean {
  if (buffer.queries.length >= CONFIG.batchSize) return true
  if (buffer.queries.length >= CONFIG.maxPendingPerTenant) return true
  if (Date.now() - buffer.lastFlush >= CONFIG.flushIntervalMs && buffer.queries.length > 0) return true
  return false
}

/**
 * Queue a query for batching
 * Returns a promise that resolves when the query completes
 */
function queueQuery(
  tenantId: string,
  sql: string,
  params?: unknown[]
): Promise<QueryResult> {
  return new Promise((resolve, reject) => {
    const id = `${connectionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const buffer = getOrCreateBuffer(tenantId)

    const query: PendingQuery = {
      id,
      tenantId,
      sql,
      params,
      timestamp: Date.now(),
      resolve,
      reject,
    }

    buffer.queries.push(query)
    stats.queriesReceived++
    stats.queriesBatched++

    // Check if we should flush
    if (shouldFlush(buffer)) {
      flushBuffer(tenantId).catch((err) => {
        stats.errors++
        // Reject all pending queries in this batch
        const queries = buffer.queries.splice(0, buffer.queries.length)
        for (const q of queries) {
          q.reject(err)
        }
      })
    }
  })
}

/**
 * Flush all pending queries for a tenant
 */
async function flushBuffer(tenantId: string): Promise<void> {
  const buffer = tenantBuffers.get(tenantId)
  if (!buffer || buffer.queries.length === 0) return
  if (buffer.flushInProgress) return

  buffer.flushInProgress = true
  const queries = buffer.queries.splice(0, buffer.queries.length)
  buffer.lastFlush = Date.now()

  try {
    const response = await fetch(`${CONFIG.workerEndpoint}?tenant=${encodeURIComponent(tenantId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: queries.map((q) => ({
          id: q.id,
          sql: q.sql,
          params: q.params,
        })),
      }),
    })

    stats.batchesSent++
    stats.httpRequests++

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const results = (await response.json()) as {
      results: Array<{
        id: string
        success: boolean
        result?: QueryResult
        error?: { message: string; code?: string }
      }>
    }

    // Match results to pending queries
    const resultMap = new Map(results.results.map((r) => [r.id, r]))

    for (const query of queries) {
      const result = resultMap.get(query.id)
      if (!result) {
        query.reject(new Error('No result received for query'))
        stats.errors++
        continue
      }

      if (result.success && result.result) {
        query.resolve(result.result)
        stats.queriesFlushed++
      } else {
        query.reject(new Error(result.error?.message || 'Query failed'))
        stats.errors++
      }
    }

    // Update average batch size
    stats.avgBatchSize =
      (stats.avgBatchSize * (stats.batchesSent - 1) + queries.length) / stats.batchesSent
  } catch (err) {
    stats.errors++
    // Re-add queries to buffer for retry
    buffer.queries.unshift(...queries)
    throw err
  } finally {
    buffer.flushInProgress = false
  }
}

/**
 * Flush all tenant buffers
 */
async function flushAllBuffers(): Promise<number> {
  let totalFlushed = 0
  const promises: Promise<void>[] = []

  for (const [tenantId] of tenantBuffers) {
    promises.push(
      flushBuffer(tenantId).then(() => {
        totalFlushed++
      })
    )
  }

  await Promise.allSettled(promises)
  return totalFlushed
}

// ═══════════════════════════════════════════════════════════════
// Request Handlers
// ═══════════════════════════════════════════════════════════════

interface QueryRequest {
  tenantId: string
  sql: string
  params?: unknown[]
}

interface BatchQueryRequest {
  tenantId: string
  queries: Array<{ sql: string; params?: unknown[] }>
}

async function handleQuery(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as QueryRequest

    if (!body.tenantId) {
      return new Response(JSON.stringify({ error: 'tenantId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    if (!body.sql) {
      return new Response(JSON.stringify({ error: 'sql required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const result = await queueQuery(body.tenantId, body.sql, body.params)

    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    )
  }
}

async function handleBatchQuery(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as BatchQueryRequest

    if (!body.tenantId) {
      return new Response(JSON.stringify({ error: 'tenantId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    if (!body.queries || !Array.isArray(body.queries)) {
      return new Response(JSON.stringify({ error: 'queries array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Queue all queries
    const promises = body.queries.map((q) => queueQuery(body.tenantId, q.sql, q.params))

    // Wait for all results
    const results = await Promise.allSettled(promises)

    return new Response(
      JSON.stringify({
        success: true,
        results: results.map((r, i) => ({
          index: i,
          success: r.status === 'fulfilled',
          result: r.status === 'fulfilled' ? r.value : undefined,
          error: r.status === 'rejected' ? { message: r.reason?.message } : undefined,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    )
  }
}

function handleStats(): Response {
  const tenantStats = Array.from(tenantBuffers.entries()).map(([id, buffer]) => ({
    tenantId: id,
    pending: buffer.queries.length,
    flushInProgress: buffer.flushInProgress,
    lastFlush: buffer.lastFlush,
  }))

  return new Response(
    JSON.stringify({
      connectionId,
      stats,
      activeTenants: tenantBuffers.size,
      tenants: tenantStats,
      config: CONFIG,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    }
  )
}

async function handleFlush(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const tenantId = url.searchParams.get('tenant')

  if (tenantId) {
    await flushBuffer(tenantId)
    const buffer = tenantBuffers.get(tenantId)
    return new Response(
      JSON.stringify({
        flushed: true,
        tenantId,
        remaining: buffer?.queries.length || 0,
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    )
  }

  const count = await flushAllBuffers()
  return new Response(
    JSON.stringify({
      flushed: true,
      tenantsFlushed: count,
    }),
    {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    }
  )
}

function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// ═══════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    // Strip /pg prefix if present
    const path = url.pathname.replace(/^\/pg/, '') || '/'

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors()
    }

    // Single query
    if ((path === '/query' || path === '/q') && request.method === 'POST') {
      return handleQuery(request)
    }

    // Batch queries
    if ((path === '/batch' || path === '/b') && request.method === 'POST') {
      return handleBatchQuery(request)
    }

    // Stats
    if (path === '/stats' || path === '/health') {
      return handleStats()
    }

    // Manual flush
    if (path === '/flush' && request.method === 'POST') {
      return handleFlush(request)
    }

    // Config endpoint (for testing)
    if (path === '/config') {
      if (request.method === 'POST') {
        const body = (await request.json()) as Partial<typeof CONFIG>
        if (body.batchSize) CONFIG.batchSize = body.batchSize
        if (body.flushIntervalMs) CONFIG.flushIntervalMs = body.flushIntervalMs
        if (body.workerEndpoint) CONFIG.workerEndpoint = body.workerEndpoint
      }
      return new Response(
        JSON.stringify({
          config: CONFIG,
          defaults: DEFAULT_CONFIG,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    // Pass through to origin
    return fetch(request)
  },
}
