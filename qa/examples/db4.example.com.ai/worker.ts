/**
 * db4.example.com.ai - DB4 Key-Value Store Example
 *
 * Demonstrates DB4 key-value store operations (in-memory demo mode)
 * Using plain Hono with in-memory store for demo
 */

import { Hono } from 'hono'

interface Env {
  API_NAME: string
}

interface KeyValue {
  key: string
  value: any
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  ttl?: number
}

// In-memory key-value store for demo
const store: Map<string, KeyValue> = new Map([
  ['config:app', {
    key: 'config:app',
    value: { theme: 'dark', version: '1.0.0' },
    metadata: { type: 'json' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['user:1', {
    key: 'user:1',
    value: { name: 'Alice', email: 'alice@example.com' },
    metadata: { type: 'json' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['counter:visits', {
    key: 'counter:visits',
    value: 42,
    metadata: { type: 'number' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
])

const app = new Hono<{ Bindings: Env }>()

function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'db4.example.com.ai',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    database: 'db4 (demo mode)',
    note: 'Using in-memory store - DB4 Durable Objects pending',
    totalKeys: store.size,
    timestamp: new Date().toISOString(),
  })
})

app.get('/', (c) => {
  return respond(c, {
    name: 'db4.example.com.ai',
    description: 'DB4 key-value store example',
    version: '1.0.0',
    features: ['Key-value storage', 'JSON values', 'TTL support', 'Metadata'],
  })
})

app.get('/keys', (c) => {
  const prefix = c.req.query('prefix')
  const limit = parseInt(c.req.query('limit') || '100', 10)

  let keys = Array.from(store.keys())

  if (prefix) {
    keys = keys.filter(k => k.startsWith(prefix))
  }

  const entries = keys.slice(0, limit).map(k => {
    const entry = store.get(k)!
    return {
      key: entry.key,
      metadata: entry.metadata,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    }
  })

  return respond(c, {
    keys: entries,
    total: keys.length,
    limit,
  })
})

app.get('/keys/:key', (c) => {
  const key = c.req.param('key')
  const entry = store.get(key)

  if (!entry) {
    return respond(c, { error: 'Key not found' }, 404)
  }

  return respond(c, entry)
})

app.put('/keys/:key', async (c) => {
  const key = c.req.param('key')
  const body = await c.req.json()

  const existing = store.get(key)
  const now = new Date().toISOString()

  const entry: KeyValue = {
    key,
    value: body.value,
    metadata: body.metadata || existing?.metadata,
    created_at: existing?.created_at || now,
    updated_at: now,
    ttl: body.ttl,
  }

  store.set(key, entry)

  return respond(c, entry, existing ? 200 : 201)
})

app.delete('/keys/:key', (c) => {
  const key = c.req.param('key')

  if (!store.has(key)) {
    return respond(c, { error: 'Key not found' }, 404)
  }

  store.delete(key)
  return respond(c, { deleted: true, key })
})

export default app
