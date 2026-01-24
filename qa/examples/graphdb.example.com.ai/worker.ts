/**
 * graphdb.example.com.ai - Graph Database
 *
 * Demonstrates graph database operations with nodes and edges (in-memory demo mode)
 * Using plain Hono with in-memory store for demo
 */

import { Hono } from 'hono'

interface Env {
  API_NAME: string
}

interface Node {
  id: string
  labels: string[]
  properties: Record<string, any>
  created_at: string
  updated_at: string
}

interface Edge {
  id: string
  type: string
  from: string
  to: string
  properties: Record<string, any>
  created_at: string
}

// In-memory graph store for demo
const nodes: Map<string, Node> = new Map([
  ['person:alice', {
    id: 'person:alice',
    labels: ['Person', 'Employee'],
    properties: { name: 'Alice', age: 30, department: 'Engineering' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['person:bob', {
    id: 'person:bob',
    labels: ['Person', 'Employee'],
    properties: { name: 'Bob', age: 28, department: 'Engineering' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['person:charlie', {
    id: 'person:charlie',
    labels: ['Person', 'Manager'],
    properties: { name: 'Charlie', age: 35, department: 'Engineering' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['company:acme', {
    id: 'company:acme',
    labels: ['Company', 'Organization'],
    properties: { name: 'Acme Corp', industry: 'Technology', founded: 2020 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['project:api', {
    id: 'project:api',
    labels: ['Project'],
    properties: { name: 'API Platform', status: 'active', priority: 'high' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  ['skill:typescript', {
    id: 'skill:typescript',
    labels: ['Skill', 'Technology'],
    properties: { name: 'TypeScript', category: 'Programming Language' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
])

const edges: Map<string, Edge> = new Map([
  ['e1', {
    id: 'e1',
    type: 'WORKS_AT',
    from: 'person:alice',
    to: 'company:acme',
    properties: { since: '2022-01-01', role: 'Senior Engineer' },
    created_at: new Date().toISOString(),
  }],
  ['e2', {
    id: 'e2',
    type: 'WORKS_AT',
    from: 'person:bob',
    to: 'company:acme',
    properties: { since: '2023-06-01', role: 'Engineer' },
    created_at: new Date().toISOString(),
  }],
  ['e3', {
    id: 'e3',
    type: 'MANAGES',
    from: 'person:charlie',
    to: 'person:alice',
    properties: {},
    created_at: new Date().toISOString(),
  }],
  ['e4', {
    id: 'e4',
    type: 'MANAGES',
    from: 'person:charlie',
    to: 'person:bob',
    properties: {},
    created_at: new Date().toISOString(),
  }],
  ['e5', {
    id: 'e5',
    type: 'WORKS_ON',
    from: 'person:alice',
    to: 'project:api',
    properties: { role: 'Lead' },
    created_at: new Date().toISOString(),
  }],
  ['e6', {
    id: 'e6',
    type: 'WORKS_ON',
    from: 'person:bob',
    to: 'project:api',
    properties: { role: 'Contributor' },
    created_at: new Date().toISOString(),
  }],
  ['e7', {
    id: 'e7',
    type: 'HAS_SKILL',
    from: 'person:alice',
    to: 'skill:typescript',
    properties: { level: 'expert' },
    created_at: new Date().toISOString(),
  }],
  ['e8', {
    id: 'e8',
    type: 'HAS_SKILL',
    from: 'person:bob',
    to: 'skill:typescript',
    properties: { level: 'intermediate' },
    created_at: new Date().toISOString(),
  }],
])

const app = new Hono<{ Bindings: Env }>()

function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'graphdb.example.com.ai',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    database: 'graphdb (demo mode)',
    note: 'Using in-memory store - GraphDB Durable Objects pending',
    totalNodes: nodes.size,
    totalEdges: edges.size,
    timestamp: new Date().toISOString(),
  })
})

app.get('/', (c) => {
  return respond(c, {
    name: 'graphdb.example.com.ai',
    description: 'Cost-optimized graph database for Cloudflare Workers',
    version: '1.0.0',
    features: ['Labeled nodes', 'Typed edges', 'Neighbor traversal', 'Property graphs'],
  })
})

app.get('/nodes', (c) => {
  const label = c.req.query('label')
  const limit = parseInt(c.req.query('limit') || '100', 10)

  let nodeList = Array.from(nodes.values())

  if (label) {
    nodeList = nodeList.filter(n => n.labels.includes(label))
  }

  const result = nodeList.slice(0, limit).map(n => ({
    id: n.id,
    labels: n.labels,
    properties: n.properties,
    created_at: n.created_at,
  }))

  return respond(c, {
    nodes: result,
    total: nodeList.length,
    limit,
  })
})

app.post('/nodes', async (c) => {
  const body = await c.req.json()

  if (!body.id) {
    return respond(c, { error: 'id is required' }, 400)
  }

  if (nodes.has(body.id)) {
    return respond(c, { error: 'Node already exists' }, 409)
  }

  const now = new Date().toISOString()
  const node: Node = {
    id: body.id,
    labels: body.labels || [],
    properties: body.properties || {},
    created_at: now,
    updated_at: now,
  }

  nodes.set(body.id, node)
  return respond(c, node, 201)
})

app.get('/nodes/:id', (c) => {
  const id = c.req.param('id')
  const node = nodes.get(id)

  if (!node) {
    return respond(c, { error: 'Node not found' }, 404)
  }

  // Get edges connected to this node
  const outgoing = Array.from(edges.values()).filter(e => e.from === id)
  const incoming = Array.from(edges.values()).filter(e => e.to === id)

  return respond(c, {
    ...node,
    edges: {
      outgoing: outgoing.map(e => ({ id: e.id, type: e.type, to: e.to, properties: e.properties })),
      incoming: incoming.map(e => ({ id: e.id, type: e.type, from: e.from, properties: e.properties })),
    },
  })
})

app.post('/edges', async (c) => {
  const body = await c.req.json()

  if (!body.from || !body.to || !body.type) {
    return respond(c, { error: 'from, to, and type are required' }, 400)
  }

  if (!nodes.has(body.from)) {
    return respond(c, { error: 'Source node not found' }, 404)
  }

  if (!nodes.has(body.to)) {
    return respond(c, { error: 'Target node not found' }, 404)
  }

  const id = `e${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const edge: Edge = {
    id,
    type: body.type,
    from: body.from,
    to: body.to,
    properties: body.properties || {},
    created_at: new Date().toISOString(),
  }

  edges.set(id, edge)
  return respond(c, edge, 201)
})

app.get('/nodes/:id/neighbors', (c) => {
  const id = c.req.param('id')
  const edgeType = c.req.query('edge_type')
  const direction = c.req.query('direction') || 'both' // 'outgoing', 'incoming', 'both'

  const node = nodes.get(id)
  if (!node) {
    return respond(c, { error: 'Node not found' }, 404)
  }

  const neighbors: Array<{
    node: Node
    edge: { id: string; type: string; direction: string; properties: Record<string, any> }
  }> = []

  // Outgoing edges
  if (direction === 'outgoing' || direction === 'both') {
    let outgoing = Array.from(edges.values()).filter(e => e.from === id)
    if (edgeType) outgoing = outgoing.filter(e => e.type === edgeType)

    for (const edge of outgoing) {
      const neighbor = nodes.get(edge.to)
      if (neighbor) {
        neighbors.push({
          node: neighbor,
          edge: { id: edge.id, type: edge.type, direction: 'outgoing', properties: edge.properties },
        })
      }
    }
  }

  // Incoming edges
  if (direction === 'incoming' || direction === 'both') {
    let incoming = Array.from(edges.values()).filter(e => e.to === id)
    if (edgeType) incoming = incoming.filter(e => e.type === edgeType)

    for (const edge of incoming) {
      const neighbor = nodes.get(edge.from)
      if (neighbor) {
        neighbors.push({
          node: neighbor,
          edge: { id: edge.id, type: edge.type, direction: 'incoming', properties: edge.properties },
        })
      }
    }
  }

  return respond(c, {
    node: { id: node.id, labels: node.labels, properties: node.properties },
    neighbors,
    total: neighbors.length,
    filters: { edgeType: edgeType || 'all', direction },
  })
})

export default app
