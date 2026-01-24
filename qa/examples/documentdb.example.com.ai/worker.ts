/**
 * documentdb.example.com.ai - DocumentDB MongoDB-compatible Example
 *
 * Demonstrates MongoDB-compatible operations
 * Uses in-memory storage for demo (DocumentDB + PGLite integration pending)
 */

import { Hono } from 'hono'

interface Env {
  API_NAME: string
  DOCUMENTDB_DEFAULT_DB: string
}

interface Document {
  _id: string
  [key: string]: unknown
}

// In-memory collections store
const collections: Map<string, Document[]> = new Map([
  ['products', [
    { _id: 'prod-1', name: 'Widget A', category: 'electronics', price: 29.99, createdAt: new Date().toISOString() },
    { _id: 'prod-2', name: 'Widget B', category: 'electronics', price: 49.99, createdAt: new Date().toISOString() },
    { _id: 'prod-3', name: 'T-Shirt', category: 'clothing', price: 19.99, createdAt: new Date().toISOString() },
  ]],
])

const app = new Hono<{ Bindings: Env }>()

function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'documentdb.example.com.ai',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

function getCollection(name: string): Document[] {
  if (!collections.has(name)) {
    collections.set(name, [])
  }
  return collections.get(name)!
}

// Health check
app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    database: 'documentdb (in-memory demo)',
    note: '@dotdo/documentdb + PGLite integration pending',
    collections: Array.from(collections.keys()),
    timestamp: new Date().toISOString(),
  })
})

// Root
app.get('/', (c) => {
  return respond(c, {
    name: 'documentdb.example.com.ai',
    description: 'MongoDB-compatible API (in-memory demo)',
    version: '1.0.0',
    note: 'Full @dotdo/documentdb integration pending',
    endpoints: ['/health', '/products', '/products/:id', '/products/aggregate'],
  })
})

// List products
app.get('/products', (c) => {
  const category = c.req.query('category')
  const limit = parseInt(c.req.query('limit') || '10', 10)

  let products = getCollection('products')

  if (category) {
    products = products.filter(p => p.category === category)
  }

  return respond(c, {
    products: products.slice(0, limit),
    total: products.length,
  })
})

// Get product by ID
app.get('/products/:id', (c) => {
  const id = c.req.param('id')
  const products = getCollection('products')
  const product = products.find(p => p._id === id)

  if (!product) {
    return respond(c, { error: 'Product not found' }, 404)
  }

  return respond(c, product)
})

// Create product
app.post('/products', async (c) => {
  const body = await c.req.json()

  if (!body.name) {
    return respond(c, { error: 'Name is required' }, 400)
  }

  const doc: Document = {
    _id: `prod-${Date.now()}`,
    name: body.name,
    category: body.category || 'uncategorized',
    price: body.price || 0,
    createdAt: new Date().toISOString(),
  }

  getCollection('products').push(doc)
  return respond(c, doc, 201)
})

// Update product
app.patch('/products/:id', async (c) => {
  const id = c.req.param('id')
  const products = getCollection('products')
  const index = products.findIndex(p => p._id === id)

  if (index === -1) {
    return respond(c, { error: 'Product not found' }, 404)
  }

  const body = await c.req.json()
  const product = products[index]

  // MongoDB-style $set update
  if (body.name !== undefined) product.name = body.name
  if (body.category !== undefined) product.category = body.category
  if (body.price !== undefined) product.price = body.price
  product.updatedAt = new Date().toISOString()

  return respond(c, { updated: true, id, product })
})

// Delete product
app.delete('/products/:id', (c) => {
  const id = c.req.param('id')
  const products = getCollection('products')
  const index = products.findIndex(p => p._id === id)

  if (index === -1) {
    return respond(c, { error: 'Product not found' }, 404)
  }

  products.splice(index, 1)
  return respond(c, { deleted: true, id })
})

// Aggregate endpoint
app.get('/products/aggregate', (c) => {
  const products = getCollection('products')

  // Group by category
  const byCategory: Record<string, { count: number; totalPrice: number }> = {}

  for (const product of products) {
    const cat = String(product.category || 'uncategorized')
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, totalPrice: 0 }
    }
    byCategory[cat].count++
    byCategory[cat].totalPrice += Number(product.price) || 0
  }

  const aggregation = Object.entries(byCategory).map(([category, data]) => ({
    _id: category,
    count: data.count,
    avgPrice: data.totalPrice / data.count,
  }))

  return respond(c, {
    totalProducts: products.length,
    aggregation,
  })
})

// MongoDB-style command endpoint
app.post('/command', async (c) => {
  const body = await c.req.json()

  // Handle find command
  if (body.find) {
    const collection = getCollection(body.find)
    let docs = [...collection]

    if (body.filter) {
      docs = docs.filter(doc => {
        for (const [key, value] of Object.entries(body.filter)) {
          if (doc[key] !== value) return false
        }
        return true
      })
    }

    if (body.limit) {
      docs = docs.slice(0, body.limit)
    }

    return respond(c, {
      ok: 1,
      cursor: {
        firstBatch: docs,
        id: 0,
        ns: `default.${body.find}`,
      },
    })
  }

  // Handle insert command
  if (body.insert && body.documents) {
    const collection = getCollection(body.insert)
    const inserted: string[] = []

    for (const doc of body.documents) {
      const newDoc = {
        _id: doc._id || `${body.insert}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...doc,
      }
      collection.push(newDoc)
      inserted.push(newDoc._id)
    }

    return respond(c, {
      ok: 1,
      n: inserted.length,
      insertedIds: inserted,
    })
  }

  return respond(c, { ok: 0, error: 'Unknown command' }, 400)
})

export default app
