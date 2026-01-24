/**
 * ducklytics.workers.do - Analytics Platform Example
 *
 * Demonstrates analytics tracking and reporting (in-memory demo mode)
 * Using plain Hono with in-memory analytics store for demo
 */

import { Hono } from 'hono'

interface Env {
  API_NAME: string
}

interface Event {
  id: string
  name: string
  timestamp: string
  session_id: string
  user_id?: string
  properties: Record<string, any>
}

interface Metric {
  name: string
  value: number
  timestamp: string
  tags: Record<string, string>
}

// In-memory analytics store for demo
const events: Event[] = [
  {
    id: 'evt-001',
    name: 'page_view',
    timestamp: '2026-01-24T10:00:00Z',
    session_id: 'sess-1',
    user_id: 'user-1',
    properties: { path: '/', referrer: 'https://google.com' },
  },
  {
    id: 'evt-002',
    name: 'page_view',
    timestamp: '2026-01-24T10:00:30Z',
    session_id: 'sess-1',
    user_id: 'user-1',
    properties: { path: '/products', referrer: '/' },
  },
  {
    id: 'evt-003',
    name: 'button_click',
    timestamp: '2026-01-24T10:01:00Z',
    session_id: 'sess-1',
    user_id: 'user-1',
    properties: { button_id: 'add-to-cart', product_id: 'prod-1' },
  },
  {
    id: 'evt-004',
    name: 'page_view',
    timestamp: '2026-01-24T10:05:00Z',
    session_id: 'sess-2',
    properties: { path: '/', referrer: 'https://twitter.com' },
  },
  {
    id: 'evt-005',
    name: 'purchase',
    timestamp: '2026-01-24T10:10:00Z',
    session_id: 'sess-1',
    user_id: 'user-1',
    properties: { product_id: 'prod-1', amount: 49.99, currency: 'USD' },
  },
]

const metrics: Metric[] = [
  { name: 'api_latency_ms', value: 45, timestamp: '2026-01-24T10:00:00Z', tags: { endpoint: '/api/users', method: 'GET' } },
  { name: 'api_latency_ms', value: 120, timestamp: '2026-01-24T10:01:00Z', tags: { endpoint: '/api/products', method: 'GET' } },
  { name: 'api_latency_ms', value: 230, timestamp: '2026-01-24T10:02:00Z', tags: { endpoint: '/api/orders', method: 'POST' } },
  { name: 'active_users', value: 150, timestamp: '2026-01-24T10:00:00Z', tags: { region: 'us-east' } },
  { name: 'active_users', value: 80, timestamp: '2026-01-24T10:00:00Z', tags: { region: 'eu-west' } },
]

let eventCounter = 5

const app = new Hono<{ Bindings: Env }>()

function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'ducklytics.workers.do',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    service: 'ducklytics (demo mode)',
    note: 'Using in-memory store - ClickHouse/DuckDB pending',
    totalEvents: events.length,
    totalMetrics: metrics.length,
    timestamp: new Date().toISOString(),
  })
})

app.get('/', (c) => {
  return respond(c, {
    name: 'ducklytics.workers.do',
    description: 'Analytics platform example',
    version: '1.0.0',
    features: ['Event tracking', 'Metrics collection', 'Aggregations', 'Funnels'],
  })
})

// Track an event
app.post('/events', async (c) => {
  const body = await c.req.json()

  eventCounter++
  const event: Event = {
    id: `evt-${String(eventCounter).padStart(3, '0')}`,
    name: body.name,
    timestamp: body.timestamp || new Date().toISOString(),
    session_id: body.session_id || `sess-${Date.now()}`,
    user_id: body.user_id,
    properties: body.properties || {},
  }

  events.push(event)

  return respond(c, event, 201)
})

// Get events with filtering
app.get('/events', (c) => {
  const name = c.req.query('name')
  const userId = c.req.query('user_id')
  const sessionId = c.req.query('session_id')
  const limit = parseInt(c.req.query('limit') || '50', 10)

  let filtered = [...events]

  if (name) {
    filtered = filtered.filter(e => e.name === name)
  }

  if (userId) {
    filtered = filtered.filter(e => e.user_id === userId)
  }

  if (sessionId) {
    filtered = filtered.filter(e => e.session_id === sessionId)
  }

  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  filtered = filtered.slice(0, limit)

  return respond(c, {
    events: filtered,
    count: filtered.length,
    total: events.length,
  })
})

// Get event counts by name
app.get('/events/counts', (c) => {
  const counts: Record<string, number> = {}

  for (const event of events) {
    counts[event.name] = (counts[event.name] || 0) + 1
  }

  const result = Object.entries(counts).map(([name, count]) => ({ name, count }))
  result.sort((a, b) => b.count - a.count)

  return respond(c, { counts: result })
})

// Record a metric
app.post('/metrics', async (c) => {
  const body = await c.req.json()

  const metric: Metric = {
    name: body.name,
    value: body.value,
    timestamp: body.timestamp || new Date().toISOString(),
    tags: body.tags || {},
  }

  metrics.push(metric)

  return respond(c, metric, 201)
})

// Get metrics with aggregation
app.get('/metrics', (c) => {
  const name = c.req.query('name')
  const agg = c.req.query('agg') || 'avg'
  const groupBy = c.req.query('group_by')

  if (!name) {
    // Return unique metric names
    const names = [...new Set(metrics.map(m => m.name))]
    return respond(c, { names })
  }

  const filtered = metrics.filter(m => m.name === name)

  if (groupBy) {
    const groups: Map<string, number[]> = new Map()

    for (const metric of filtered) {
      const key = metric.tags[groupBy] || '_unknown'
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(metric.value)
    }

    const result: Record<string, any>[] = []
    for (const [key, values] of groups) {
      let aggValue: number
      switch (agg) {
        case 'sum':
          aggValue = values.reduce((a, b) => a + b, 0)
          break
        case 'min':
          aggValue = Math.min(...values)
          break
        case 'max':
          aggValue = Math.max(...values)
          break
        case 'count':
          aggValue = values.length
          break
        default:
          aggValue = values.reduce((a, b) => a + b, 0) / values.length
      }

      result.push({ [groupBy]: key, [agg]: aggValue })
    }

    return respond(c, { name, aggregation: agg, groupBy, results: result })
  }

  // No grouping, just aggregate all
  const values = filtered.map(m => m.value)
  let aggValue: number
  switch (agg) {
    case 'sum':
      aggValue = values.reduce((a, b) => a + b, 0)
      break
    case 'min':
      aggValue = Math.min(...values)
      break
    case 'max':
      aggValue = Math.max(...values)
      break
    case 'count':
      aggValue = values.length
      break
    default:
      aggValue = values.reduce((a, b) => a + b, 0) / values.length
  }

  return respond(c, { name, aggregation: agg, value: aggValue })
})

// Get funnel analysis
app.get('/funnels', (c) => {
  const steps = c.req.query('steps')?.split(',') || ['page_view', 'button_click', 'purchase']

  const userProgress: Map<string, Set<string>> = new Map()

  for (const event of events) {
    const userId = event.user_id || event.session_id
    if (!userProgress.has(userId)) {
      userProgress.set(userId, new Set())
    }
    userProgress.get(userId)!.add(event.name)
  }

  const funnel = steps.map((step, index) => {
    let count = 0
    for (const [_, completedSteps] of userProgress) {
      // User must have completed all previous steps
      const hasCompletedPrevious = steps.slice(0, index).every(s => completedSteps.has(s))
      if (hasCompletedPrevious && completedSteps.has(step)) {
        count++
      }
    }
    return { step, count }
  })

  return respond(c, {
    funnel,
    conversionRate: funnel.length > 1
      ? ((funnel[funnel.length - 1].count / funnel[0].count) * 100).toFixed(2) + '%'
      : 'N/A',
  })
})

export default app
