/**
 * evodb.example.com.ai - Distributed Lakehouse
 *
 * Demonstrates lakehouse operations with tables and partitions (in-memory demo mode)
 * Using plain Hono with in-memory store for demo
 */

import { Hono } from 'hono'

interface Env {
  API_NAME: string
}

interface Partition {
  id: string
  key: Record<string, any>
  rowCount: number
  sizeBytes: number
  created_at: string
}

interface Table {
  name: string
  schema: Record<string, string>
  partitionKeys: string[]
  partitions: Partition[]
  created_at: string
  updated_at: string
}

interface Row {
  [key: string]: any
}

// In-memory lakehouse store for demo
const tables: Map<string, Table> = new Map([
  ['events', {
    name: 'events',
    schema: {
      id: 'string',
      event_type: 'string',
      user_id: 'string',
      timestamp: 'timestamp',
      properties: 'json',
    },
    partitionKeys: ['event_type'],
    partitions: [
      { id: 'p1', key: { event_type: 'pageview' }, rowCount: 1000, sizeBytes: 102400, created_at: new Date().toISOString() },
      { id: 'p2', key: { event_type: 'click' }, rowCount: 500, sizeBytes: 51200, created_at: new Date().toISOString() },
      { id: 'p3', key: { event_type: 'purchase' }, rowCount: 100, sizeBytes: 20480, created_at: new Date().toISOString() },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['users', {
    name: 'users',
    schema: {
      id: 'string',
      email: 'string',
      name: 'string',
      plan: 'string',
      created_at: 'timestamp',
    },
    partitionKeys: ['plan'],
    partitions: [
      { id: 'p1', key: { plan: 'free' }, rowCount: 5000, sizeBytes: 512000, created_at: new Date().toISOString() },
      { id: 'p2', key: { plan: 'pro' }, rowCount: 1000, sizeBytes: 102400, created_at: new Date().toISOString() },
      { id: 'p3', key: { plan: 'enterprise' }, rowCount: 50, sizeBytes: 5120, created_at: new Date().toISOString() },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
])

// Sample data for queries
const sampleData: Map<string, Row[]> = new Map([
  ['events', [
    { id: 'e1', event_type: 'pageview', user_id: 'u1', timestamp: '2026-01-24T10:00:00Z', properties: { page: '/home' } },
    { id: 'e2', event_type: 'click', user_id: 'u1', timestamp: '2026-01-24T10:01:00Z', properties: { button: 'signup' } },
    { id: 'e3', event_type: 'pageview', user_id: 'u2', timestamp: '2026-01-24T10:02:00Z', properties: { page: '/pricing' } },
    { id: 'e4', event_type: 'purchase', user_id: 'u2', timestamp: '2026-01-24T10:05:00Z', properties: { plan: 'pro', amount: 99 } },
    { id: 'e5', event_type: 'pageview', user_id: 'u3', timestamp: '2026-01-24T10:10:00Z', properties: { page: '/docs' } },
  ]],
  ['users', [
    { id: 'u1', email: 'alice@example.com', name: 'Alice', plan: 'free', created_at: '2026-01-01T00:00:00Z' },
    { id: 'u2', email: 'bob@example.com', name: 'Bob', plan: 'pro', created_at: '2026-01-10T00:00:00Z' },
    { id: 'u3', email: 'charlie@example.com', name: 'Charlie', plan: 'enterprise', created_at: '2026-01-15T00:00:00Z' },
  ]],
])

const app = new Hono<{ Bindings: Env }>()

function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'evodb.example.com.ai',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    database: 'evodb (demo mode)',
    note: 'Using in-memory store - EvoDB Durable Objects pending',
    totalTables: tables.size,
    timestamp: new Date().toISOString(),
  })
})

app.get('/', (c) => {
  return respond(c, {
    name: 'evodb.example.com.ai',
    description: 'Distributed Lakehouse for Cloudflare Workers',
    version: '1.0.0',
    features: ['Columnar storage', 'Partitioned tables', 'SQL-like queries', 'Time travel'],
  })
})

app.get('/tables', (c) => {
  const tableList = Array.from(tables.values()).map(t => ({
    name: t.name,
    schema: t.schema,
    partitionKeys: t.partitionKeys,
    partitionCount: t.partitions.length,
    totalRows: t.partitions.reduce((sum, p) => sum + p.rowCount, 0),
    totalSizeBytes: t.partitions.reduce((sum, p) => sum + p.sizeBytes, 0),
    created_at: t.created_at,
  }))

  return respond(c, {
    tables: tableList,
    total: tables.size,
  })
})

app.get('/tables/:name', (c) => {
  const name = c.req.param('name')
  const table = tables.get(name)

  if (!table) {
    return respond(c, { error: 'Table not found' }, 404)
  }

  return respond(c, {
    name: table.name,
    schema: table.schema,
    partitionKeys: table.partitionKeys,
    partitions: table.partitions,
    statistics: {
      totalRows: table.partitions.reduce((sum, p) => sum + p.rowCount, 0),
      totalSizeBytes: table.partitions.reduce((sum, p) => sum + p.sizeBytes, 0),
      partitionCount: table.partitions.length,
    },
    created_at: table.created_at,
    updated_at: table.updated_at,
  })
})

app.post('/tables/:name/query', async (c) => {
  const name = c.req.param('name')
  const table = tables.get(name)

  if (!table) {
    return respond(c, { error: 'Table not found' }, 404)
  }

  const body = await c.req.json()
  const { select, where, limit = 100, offset = 0 } = body

  let data = sampleData.get(name) || []

  // Apply simple where filters
  if (where && typeof where === 'object') {
    data = data.filter(row => {
      for (const [key, value] of Object.entries(where)) {
        if (row[key] !== value) return false
      }
      return true
    })
  }

  // Apply select projection
  if (select && Array.isArray(select)) {
    data = data.map(row => {
      const projected: Row = {}
      for (const col of select) {
        if (col in row) projected[col] = row[col]
      }
      return projected
    })
  }

  // Apply pagination
  const total = data.length
  data = data.slice(offset, offset + limit)

  return respond(c, {
    table: name,
    query: { select, where, limit, offset },
    results: data,
    total,
    returned: data.length,
    executionTime: `${Math.random() * 10 + 1}ms`,
  })
})

export default app
