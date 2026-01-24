/**
 * ducktail.workers.do - Log & Event Tailing Service Example
 *
 * Demonstrates real-time log tailing and event streaming (in-memory demo mode)
 * Using plain Hono with in-memory log buffer for demo
 */

import { Hono } from 'hono'

interface Env {
  API_NAME: string
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  source: string
  message: string
  metadata?: Record<string, any>
}

// In-memory log buffer for demo (circular buffer simulation)
const logs: LogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-01-24T10:00:00.000Z',
    level: 'info',
    source: 'api-gateway',
    message: 'Server started on port 8080',
    metadata: { port: 8080, env: 'production' },
  },
  {
    id: 'log-002',
    timestamp: '2026-01-24T10:00:01.123Z',
    level: 'debug',
    source: 'auth-service',
    message: 'Token validation successful',
    metadata: { user_id: 'user-1', method: 'jwt' },
  },
  {
    id: 'log-003',
    timestamp: '2026-01-24T10:00:02.456Z',
    level: 'info',
    source: 'api-gateway',
    message: 'GET /api/users - 200 OK',
    metadata: { duration_ms: 45, path: '/api/users' },
  },
  {
    id: 'log-004',
    timestamp: '2026-01-24T10:00:03.789Z',
    level: 'warn',
    source: 'rate-limiter',
    message: 'Rate limit approaching for IP',
    metadata: { ip: '192.168.1.100', current: 95, limit: 100 },
  },
  {
    id: 'log-005',
    timestamp: '2026-01-24T10:00:05.000Z',
    level: 'error',
    source: 'database',
    message: 'Connection pool exhausted',
    metadata: { pool_size: 10, waiting: 5 },
  },
  {
    id: 'log-006',
    timestamp: '2026-01-24T10:00:06.234Z',
    level: 'info',
    source: 'database',
    message: 'Connection pool recovered',
    metadata: { pool_size: 10, available: 8 },
  },
]

let logCounter = 6

const app = new Hono<{ Bindings: Env }>()

function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'ducktail.workers.do',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    service: 'ducktail (demo mode)',
    note: 'Using in-memory log buffer - persistent storage pending',
    totalLogs: logs.length,
    timestamp: new Date().toISOString(),
  })
})

app.get('/', (c) => {
  return respond(c, {
    name: 'ducktail.workers.do',
    description: 'Log & event tailing service example',
    version: '1.0.0',
    features: ['Real-time tailing', 'Log filtering', 'Source grouping', 'Level filtering'],
  })
})

// Get logs with optional filtering
app.get('/logs', (c) => {
  const level = c.req.query('level')
  const source = c.req.query('source')
  const since = c.req.query('since')
  const limit = parseInt(c.req.query('limit') || '50', 10)
  const tail = c.req.query('tail') === 'true'

  let filtered = [...logs]

  if (level) {
    filtered = filtered.filter(log => log.level === level)
  }

  if (source) {
    filtered = filtered.filter(log => log.source === source)
  }

  if (since) {
    filtered = filtered.filter(log => log.timestamp > since)
  }

  // Sort by timestamp
  filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  // If tail mode, get last N entries
  if (tail) {
    filtered = filtered.slice(-limit)
  } else {
    filtered = filtered.slice(0, limit)
  }

  return respond(c, {
    logs: filtered,
    count: filtered.length,
    total: logs.length,
    filters: { level, source, since },
  })
})

// Get unique sources
app.get('/sources', (c) => {
  const sources = new Map<string, { count: number; lastSeen: string }>()

  for (const log of logs) {
    const existing = sources.get(log.source)
    if (!existing || log.timestamp > existing.lastSeen) {
      sources.set(log.source, {
        count: (existing?.count || 0) + 1,
        lastSeen: log.timestamp,
      })
    } else {
      existing.count++
    }
  }

  const result = Array.from(sources.entries()).map(([name, data]) => ({
    name,
    ...data,
  }))

  return respond(c, { sources: result })
})

// Get log level summary
app.get('/levels', (c) => {
  const levels: Record<string, number> = {
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
  }

  for (const log of logs) {
    levels[log.level]++
  }

  return respond(c, { levels })
})

// Add a new log entry
app.post('/logs', async (c) => {
  const body = await c.req.json()

  logCounter++
  const entry: LogEntry = {
    id: `log-${String(logCounter).padStart(3, '0')}`,
    timestamp: body.timestamp || new Date().toISOString(),
    level: body.level || 'info',
    source: body.source || 'unknown',
    message: body.message,
    metadata: body.metadata,
  }

  logs.push(entry)

  // Keep buffer size reasonable
  if (logs.length > 1000) {
    logs.shift()
  }

  return respond(c, entry, 201)
})

// Get a specific log entry
app.get('/logs/:id', (c) => {
  const id = c.req.param('id')
  const log = logs.find(l => l.id === id)

  if (!log) {
    return respond(c, { error: 'Log entry not found' }, 404)
  }

  return respond(c, log)
})

export default app
