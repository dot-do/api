/**
 * sdb.example.com.ai - Simple Document/Graph Database
 *
 * Demonstrates document storage with graph relationships (in-memory demo mode)
 * Using plain Hono with in-memory store for demo
 */

import { Hono } from 'hono'

interface Env {
  API_NAME: string
}

interface Document {
  id: string
  type: string
  data: Record<string, any>
  edges: Edge[]
  created_at: string
  updated_at: string
}

interface Edge {
  type: string
  target: string
  properties?: Record<string, any>
}

// In-memory document store for demo
const store: Map<string, Document> = new Map([
  ['user:alice', {
    id: 'user:alice',
    type: 'user',
    data: { name: 'Alice', email: 'alice@example.com', role: 'admin' },
    edges: [
      { type: 'OWNS', target: 'project:web-app' },
      { type: 'MEMBER_OF', target: 'team:engineering' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['user:bob', {
    id: 'user:bob',
    type: 'user',
    data: { name: 'Bob', email: 'bob@example.com', role: 'developer' },
    edges: [
      { type: 'CONTRIBUTES_TO', target: 'project:web-app' },
      { type: 'MEMBER_OF', target: 'team:engineering' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['project:web-app', {
    id: 'project:web-app',
    type: 'project',
    data: { name: 'Web App', status: 'active', priority: 'high' },
    edges: [
      { type: 'USES', target: 'tech:typescript' },
      { type: 'USES', target: 'tech:cloudflare' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['team:engineering', {
    id: 'team:engineering',
    type: 'team',
    data: { name: 'Engineering', department: 'Product' },
    edges: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['tech:typescript', {
    id: 'tech:typescript',
    type: 'technology',
    data: { name: 'TypeScript', category: 'language' },
    edges: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['tech:cloudflare', {
    id: 'tech:cloudflare',
    type: 'technology',
    data: { name: 'Cloudflare Workers', category: 'platform' },
    edges: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
])

const app = new Hono<{ Bindings: Env }>()

function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'sdb.example.com.ai',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    database: 'sdb (demo mode)',
    note: 'Using in-memory store - SDB Durable Objects pending',
    totalDocuments: store.size,
    timestamp: new Date().toISOString(),
  })
})

app.get('/', (c) => {
  return respond(c, {
    name: 'sdb.example.com.ai',
    description: 'Simple Document/Graph Database for Durable Objects',
    version: '1.0.0',
    features: ['Document storage', 'Graph relationships', 'Type-based queries', 'Edge traversal'],
  })
})

app.get('/documents', (c) => {
  const type = c.req.query('type')
  const limit = parseInt(c.req.query('limit') || '100', 10)

  let docs = Array.from(store.values())

  if (type) {
    docs = docs.filter(d => d.type === type)
  }

  const result = docs.slice(0, limit).map(d => ({
    id: d.id,
    type: d.type,
    data: d.data,
    edgeCount: d.edges.length,
    created_at: d.created_at,
  }))

  return respond(c, {
    documents: result,
    total: docs.length,
    limit,
  })
})

app.post('/documents', async (c) => {
  const body = await c.req.json()

  if (!body.id || !body.type) {
    return respond(c, { error: 'id and type are required' }, 400)
  }

  if (store.has(body.id)) {
    return respond(c, { error: 'Document already exists' }, 409)
  }

  const now = new Date().toISOString()
  const doc: Document = {
    id: body.id,
    type: body.type,
    data: body.data || {},
    edges: body.edges || [],
    created_at: now,
    updated_at: now,
  }

  store.set(body.id, doc)
  return respond(c, doc, 201)
})

app.get('/documents/:id', (c) => {
  const id = c.req.param('id')
  const doc = store.get(id)

  if (!doc) {
    return respond(c, { error: 'Document not found' }, 404)
  }

  return respond(c, doc)
})

app.get('/graph/traverse/:from', (c) => {
  const fromId = c.req.param('from')
  const edgeType = c.req.query('edge_type')
  const depth = parseInt(c.req.query('depth') || '1', 10)
  const maxDepth = Math.min(depth, 3) // Limit depth for demo

  const startDoc = store.get(fromId)
  if (!startDoc) {
    return respond(c, { error: 'Starting document not found' }, 404)
  }

  const visited = new Set<string>()
  const result: Array<{
    id: string
    type: string
    data: any
    path: string[]
    depth: number
  }> = []

  function traverse(docId: string, currentDepth: number, path: string[]) {
    if (currentDepth > maxDepth || visited.has(docId)) return
    visited.add(docId)

    const doc = store.get(docId)
    if (!doc) return

    if (docId !== fromId) {
      result.push({
        id: doc.id,
        type: doc.type,
        data: doc.data,
        path,
        depth: currentDepth,
      })
    }

    let edges = doc.edges
    if (edgeType) {
      edges = edges.filter(e => e.type === edgeType)
    }

    for (const edge of edges) {
      traverse(edge.target, currentDepth + 1, [...path, `--[${edge.type}]-->`])
    }
  }

  traverse(fromId, 0, [fromId])

  return respond(c, {
    from: { id: startDoc.id, type: startDoc.type, data: startDoc.data },
    traversal: result,
    depth: maxDepth,
    edgeType: edgeType || 'all',
  })
})

export default app
