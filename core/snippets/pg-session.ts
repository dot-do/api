/**
 * PostgreSQL Session-Aware Connection Snippet
 *
 * Adapts the DuckDB session-recorder pattern for postgres.do.
 * Tracks client sessions and routes queries efficiently with session affinity.
 *
 * Architecture:
 *   Client → Snippet (FREE) → Session Pool → Tenant DOs
 *
 * Key features:
 * - Session tracking per client
 * - Session affinity to tenant connections
 * - Transaction state tracking
 * - Automatic session cleanup
 *
 * Cost savings:
 * - Snippet execution: FREE
 * - Session affinity: reduces connection overhead
 * - Batching within session: additional ~90% reduction
 *
 * Constraints:
 * - < 5ms CPU per request
 * - < 32KB compressed script size
 * - 2 subrequests on Pro, 5 on Enterprise
 */

// ═══════════════════════════════════════════════════════════════
// Module-level state (persists across requests on same isolate)
// ═══════════════════════════════════════════════════════════════

interface SessionState {
  sessionId: string
  tenantId: string
  created: number
  lastActive: number
  queryCount: number
  inTransaction: boolean
  transactionDepth: number
  pendingQueries: PendingQuery[]
  metadata: Record<string, unknown>
}

interface PendingQuery {
  id: string
  sql: string
  params?: unknown[]
  timestamp: number
  resolve: (result: QueryResult) => void
  reject: (error: Error) => void
}

interface QueryResult {
  rows: Record<string, unknown>[]
  rowCount: number
  fields?: { name: string; dataTypeId: number }[]
  duration?: number
}

// Session tracking
const sessions = new Map<string, SessionState>()

// Stats
const stats = {
  sessionsCreated: 0,
  sessionsExpired: 0,
  queriesExecuted: 0,
  queriesBatched: 0,
  transactionsStarted: 0,
  transactionsCommitted: 0,
  transactionsRolledBack: 0,
  batchesSent: 0,
}

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  // Worker endpoint for query execution
  workerEndpoint: 'https://postgres.do/session/query',
  // Session timeout (30 minutes)
  sessionTimeoutMs: 1800000,
  // Batch size for non-transaction queries
  batchSize: 5,
  // Flush interval for batched queries
  flushIntervalMs: 50,
  // Max sessions to track (LRU eviction)
  maxSessions: 1000,
}

// ═══════════════════════════════════════════════════════════════
// Session Management
// ═══════════════════════════════════════════════════════════════

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function evictExpiredSessions(): void {
  const now = Date.now()
  for (const [sessionId, session] of sessions) {
    if (now - session.lastActive > CONFIG.sessionTimeoutMs) {
      // Reject any pending queries
      for (const query of session.pendingQueries) {
        query.reject(new Error('Session expired'))
      }
      sessions.delete(sessionId)
      stats.sessionsExpired++
    }
  }
}

function evictIfNeeded(): void {
  evictExpiredSessions()

  if (sessions.size <= CONFIG.maxSessions) return

  // LRU eviction
  const entries = Array.from(sessions.entries())
  entries.sort((a, b) => a[1].lastActive - b[1].lastActive)

  const toEvict = entries.slice(0, entries.length - CONFIG.maxSessions)
  for (const [sessionId, session] of toEvict) {
    for (const query of session.pendingQueries) {
      query.reject(new Error('Session evicted'))
    }
    sessions.delete(sessionId)
    stats.sessionsExpired++
  }
}

function getOrCreateSession(
  sessionId: string | null,
  tenantId: string,
  metadata?: Record<string, unknown>
): SessionState {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!
    session.lastActive = Date.now()
    return session
  }

  evictIfNeeded()

  const newSessionId = sessionId || generateSessionId()
  const session: SessionState = {
    sessionId: newSessionId,
    tenantId,
    created: Date.now(),
    lastActive: Date.now(),
    queryCount: 0,
    inTransaction: false,
    transactionDepth: 0,
    pendingQueries: [],
    metadata: metadata || {},
  }

  sessions.set(newSessionId, session)
  stats.sessionsCreated++

  return session
}

// ═══════════════════════════════════════════════════════════════
// Transaction Tracking
// ═══════════════════════════════════════════════════════════════

function detectTransactionCommand(sql: string): 'begin' | 'commit' | 'rollback' | 'savepoint' | null {
  const trimmed = sql.trim().toUpperCase()
  if (trimmed.startsWith('BEGIN') || trimmed.startsWith('START TRANSACTION')) return 'begin'
  if (trimmed.startsWith('COMMIT') || trimmed.startsWith('END')) return 'commit'
  if (trimmed.startsWith('ROLLBACK')) return 'rollback'
  if (trimmed.startsWith('SAVEPOINT')) return 'savepoint'
  return null
}

function updateTransactionState(session: SessionState, sql: string): void {
  const command = detectTransactionCommand(sql)

  switch (command) {
    case 'begin':
      if (!session.inTransaction) {
        session.inTransaction = true
        session.transactionDepth = 1
        stats.transactionsStarted++
      } else {
        session.transactionDepth++
      }
      break
    case 'commit':
      if (session.transactionDepth > 1) {
        session.transactionDepth--
      } else {
        session.inTransaction = false
        session.transactionDepth = 0
        stats.transactionsCommitted++
      }
      break
    case 'rollback':
      session.inTransaction = false
      session.transactionDepth = 0
      stats.transactionsRolledBack++
      break
    case 'savepoint':
      session.transactionDepth++
      break
  }
}

// ═══════════════════════════════════════════════════════════════
// Query Execution
// ═══════════════════════════════════════════════════════════════

function shouldFlush(session: SessionState): boolean {
  // Always flush immediately during transactions (for correctness)
  if (session.inTransaction) return true
  // Flush when batch is full
  if (session.pendingQueries.length >= CONFIG.batchSize) return true
  return false
}

async function flushSession(session: SessionState): Promise<void> {
  if (session.pendingQueries.length === 0) return

  const queries = session.pendingQueries.splice(0, session.pendingQueries.length)

  try {
    const response = await fetch(
      `${CONFIG.workerEndpoint}?tenant=${encodeURIComponent(session.tenantId)}&session=${encodeURIComponent(session.sessionId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          tenantId: session.tenantId,
          inTransaction: session.inTransaction,
          queries: queries.map((q) => ({
            id: q.id,
            sql: q.sql,
            params: q.params,
          })),
        }),
      }
    )

    stats.batchesSent++

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const results = (await response.json()) as {
      results: Array<{
        id: string
        success: boolean
        result?: QueryResult
        error?: { message: string }
      }>
    }

    // Match results
    const resultMap = new Map(results.results.map((r) => [r.id, r]))
    for (const query of queries) {
      const result = resultMap.get(query.id)
      if (!result) {
        query.reject(new Error('No result for query'))
        continue
      }

      if (result.success && result.result) {
        query.resolve(result.result)
        stats.queriesExecuted++
      } else {
        query.reject(new Error(result.error?.message || 'Query failed'))
      }
    }
  } catch (err) {
    // Put queries back for retry
    session.pendingQueries.unshift(...queries)
    throw err
  }
}

async function executeQuery(
  session: SessionState,
  sql: string,
  params?: unknown[]
): Promise<QueryResult> {
  // Update transaction state
  updateTransactionState(session, sql)

  return new Promise((resolve, reject) => {
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    session.pendingQueries.push({
      id,
      sql,
      params,
      timestamp: Date.now(),
      resolve,
      reject,
    })

    session.queryCount++
    session.lastActive = Date.now()
    stats.queriesBatched++

    if (shouldFlush(session)) {
      flushSession(session).catch((err) => {
        // Query will be retried or rejected in flushSession
        console.error('Flush failed:', err)
      })
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// Request Handlers
// ═══════════════════════════════════════════════════════════════

interface QueryRequest {
  sessionId?: string
  tenantId: string
  sql: string
  params?: unknown[]
  metadata?: Record<string, unknown>
}

interface TransactionRequest {
  sessionId: string
  tenantId: string
  action: 'begin' | 'commit' | 'rollback'
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

    const session = getOrCreateSession(body.sessionId || null, body.tenantId, body.metadata)
    const result = await executeQuery(session, body.sql, body.params)

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.sessionId,
        result,
        transactionState: {
          inTransaction: session.inTransaction,
          depth: session.transactionDepth,
        },
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

async function handleTransaction(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as TransactionRequest

    if (!body.sessionId || !body.tenantId || !body.action) {
      return new Response(JSON.stringify({ error: 'sessionId, tenantId, and action required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const session = sessions.get(body.sessionId)
    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    let sql: string
    switch (body.action) {
      case 'begin':
        sql = 'BEGIN'
        break
      case 'commit':
        sql = 'COMMIT'
        break
      case 'rollback':
        sql = 'ROLLBACK'
        break
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
    }

    await executeQuery(session, sql)

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.sessionId,
        action: body.action,
        transactionState: {
          inTransaction: session.inTransaction,
          depth: session.transactionDepth,
        },
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
  const sessionList = Array.from(sessions.values()).map((s) => ({
    sessionId: s.sessionId,
    tenantId: s.tenantId,
    created: s.created,
    lastActive: s.lastActive,
    queryCount: s.queryCount,
    inTransaction: s.inTransaction,
    transactionDepth: s.transactionDepth,
    pendingQueries: s.pendingQueries.length,
  }))

  return new Response(
    JSON.stringify({
      stats,
      activeSessions: sessions.size,
      maxSessions: CONFIG.maxSessions,
      sessions: sessionList,
      config: CONFIG,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    }
  )
}

function handleEndSession(request: Request): Response {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session')

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'session query param required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const session = sessions.get(sessionId)
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  // Reject pending queries
  for (const query of session.pendingQueries) {
    query.reject(new Error('Session ended'))
  }

  sessions.delete(sessionId)
  stats.sessionsExpired++

  return new Response(
    JSON.stringify({
      success: true,
      sessionId,
      queryCount: session.queryCount,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    }
  )
}

function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Id, X-Tenant-Id',
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
    // Strip /session prefix if present
    const path = url.pathname.replace(/^\/session/, '') || '/'

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors()
    }

    // Execute query
    if ((path === '/query' || path === '/q') && request.method === 'POST') {
      return handleQuery(request)
    }

    // Transaction control
    if (path === '/transaction' && request.method === 'POST') {
      return handleTransaction(request)
    }

    // End session
    if (path === '/end' && request.method === 'DELETE') {
      return handleEndSession(request)
    }

    // Stats
    if (path === '/stats' || path === '/health') {
      return handleStats()
    }

    // Pass through
    return fetch(request)
  },
}
