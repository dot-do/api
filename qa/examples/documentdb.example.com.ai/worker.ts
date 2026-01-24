/**
 * documentdb.example.com.ai - DocumentDB MongoDB-compatible Example
 *
 * Demonstrates MongoDB-compatible operations via DocumentDB
 * Using plain Hono to avoid bundling issues
 */

import { Hono } from 'hono'

interface Env {
  API_NAME: string
  DOCUMENTDB_DEFAULT_DB: string
}

const app = new Hono<{ Bindings: Env }>()

// In-memory store for demo
const store: Record<string, any[]> = {
  products: [
    { _id: 'prod-1', name: 'Widget A', category: 'electronics', price: 29.99 },
    { _id: 'prod-2', name: 'Widget B', category: 'electronics', price: 49.99 },
    { _id: 'prod-3', name: 'T-Shirt', category: 'clothing', price: 19.99 },
  ],
}

// Simple response wrapper
function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'documentdb.example.com.ai',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

// Health check
app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    database: 'documentdb',
    note: 'Using in-memory store for demo - DocumentDB DO pending',
    timestamp: new Date().toISOString(),
  })
})

// Root
app.get('/', (c) => {
  return respond(c, {
    name: 'documentdb.example.com.ai',
    description: 'MongoDB-compatible API via DocumentDB',
    version: '1.0.0',
    collections: Object.keys(store),
  })
})

// List products
app.get('/products', (c) => {
  const category = c.req.query('category')
  let products = store.products

  if (category) {
    products = products.filter(p => p.category === category)
  }

  return respond(c, {
    products,
    total: products.length,
  })
})

// Get product by ID
app.get('/products/:id', (c) => {
  const id = c.req.param('id')
  const product = store.products.find(p => p._id === id)

  if (!product) {
    return respond(c, { error: 'Product not found' }, 404)
  }

  return respond(c, product)
})

// Create product
app.post('/products', async (c) => {
  const body = await c.req.json()
  const product = {
    _id: `prod-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
  }
  store.products.push(product)
  return respond(c, product, 201)
})

// Aggregate endpoint
app.get('/products/aggregate', (c) => {
  const byCategory = store.products.reduce((acc: Record<string, number>, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1
    return acc
  }, {})

  return respond(c, {
    totalProducts: store.products.length,
    byCategory,
    avgPrice: store.products.reduce((sum, p) => sum + p.price, 0) / store.products.length,
  })
})

export default app
