/**
 * duckdb.workers.do - DuckDB Analytics Database Example
 *
 * Demonstrates DuckDB-style analytics operations (in-memory demo mode)
 * Using plain Hono with in-memory columnar store for demo
 */

import { Hono } from 'hono'

interface Env {
  API_NAME: string
}

interface Table {
  name: string
  columns: { name: string; type: string }[]
  rows: any[][]
  created_at: string
}

// In-memory columnar store for demo
const tables: Map<string, Table> = new Map([
  ['events', {
    name: 'events',
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'event_type', type: 'VARCHAR' },
      { name: 'user_id', type: 'VARCHAR' },
      { name: 'timestamp', type: 'TIMESTAMP' },
      { name: 'value', type: 'DOUBLE' },
    ],
    rows: [
      [1, 'page_view', 'user-1', '2026-01-24T10:00:00Z', 1.0],
      [2, 'click', 'user-1', '2026-01-24T10:01:00Z', 1.0],
      [3, 'page_view', 'user-2', '2026-01-24T10:02:00Z', 1.0],
      [4, 'purchase', 'user-1', '2026-01-24T10:05:00Z', 99.99],
      [5, 'page_view', 'user-3', '2026-01-24T10:10:00Z', 1.0],
    ],
    created_at: new Date().toISOString(),
  }],
  ['users', {
    name: 'users',
    columns: [
      { name: 'id', type: 'VARCHAR' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'country', type: 'VARCHAR' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
    rows: [
      ['user-1', 'Alice', 'US', '2026-01-01T00:00:00Z'],
      ['user-2', 'Bob', 'UK', '2026-01-02T00:00:00Z'],
      ['user-3', 'Charlie', 'US', '2026-01-03T00:00:00Z'],
    ],
    created_at: new Date().toISOString(),
  }],
])

const app = new Hono<{ Bindings: Env }>()

function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'duckdb.workers.do',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    database: 'duckdb (demo mode)',
    note: 'Using in-memory columnar store - DuckDB WASM pending',
    totalTables: tables.size,
    timestamp: new Date().toISOString(),
  })
})

app.get('/', (c) => {
  return respond(c, {
    name: 'duckdb.workers.do',
    description: 'DuckDB analytics database example',
    version: '1.0.0',
    features: ['Columnar storage', 'Analytics queries', 'Aggregations', 'SQL support'],
  })
})

app.get('/tables', (c) => {
  const tableList = Array.from(tables.values()).map(t => ({
    name: t.name,
    columns: t.columns,
    rowCount: t.rows.length,
    created_at: t.created_at,
  }))

  return respond(c, { tables: tableList })
})

app.get('/tables/:name', (c) => {
  const name = c.req.param('name')
  const table = tables.get(name)

  if (!table) {
    return respond(c, { error: 'Table not found' }, 404)
  }

  return respond(c, {
    name: table.name,
    columns: table.columns,
    rowCount: table.rows.length,
    created_at: table.created_at,
  })
})

app.get('/tables/:name/data', (c) => {
  const name = c.req.param('name')
  const table = tables.get(name)
  const limit = parseInt(c.req.query('limit') || '100', 10)
  const offset = parseInt(c.req.query('offset') || '0', 10)

  if (!table) {
    return respond(c, { error: 'Table not found' }, 404)
  }

  const rows = table.rows.slice(offset, offset + limit).map(row => {
    const obj: Record<string, any> = {}
    table.columns.forEach((col, i) => {
      obj[col.name] = row[i]
    })
    return obj
  })

  return respond(c, {
    columns: table.columns,
    rows,
    total: table.rows.length,
    limit,
    offset,
  })
})

// Simple aggregation endpoint
app.get('/query/aggregate', (c) => {
  const tableName = c.req.query('table') || 'events'
  const groupBy = c.req.query('group_by')
  const agg = c.req.query('agg') || 'count'
  const column = c.req.query('column')

  const table = tables.get(tableName)
  if (!table) {
    return respond(c, { error: 'Table not found' }, 404)
  }

  const colIndex = groupBy ? table.columns.findIndex(col => col.name === groupBy) : -1
  const valueIndex = column ? table.columns.findIndex(col => col.name === column) : -1

  if (groupBy && colIndex === -1) {
    return respond(c, { error: `Column ${groupBy} not found` }, 400)
  }

  const groups: Map<string, number[]> = new Map()

  for (const row of table.rows) {
    const key = groupBy ? String(row[colIndex]) : '_all'
    const value = valueIndex >= 0 ? row[valueIndex] : 1

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(typeof value === 'number' ? value : 1)
  }

  const result: Record<string, any>[] = []
  for (const [key, values] of groups) {
    let aggValue: number
    switch (agg) {
      case 'sum':
        aggValue = values.reduce((a, b) => a + b, 0)
        break
      case 'avg':
        aggValue = values.reduce((a, b) => a + b, 0) / values.length
        break
      case 'min':
        aggValue = Math.min(...values)
        break
      case 'max':
        aggValue = Math.max(...values)
        break
      default:
        aggValue = values.length
    }

    result.push({
      [groupBy || 'group']: key,
      [agg]: aggValue,
    })
  }

  return respond(c, {
    table: tableName,
    aggregation: agg,
    groupBy,
    results: result,
  })
})

export default app
