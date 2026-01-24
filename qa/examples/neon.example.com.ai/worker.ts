/**
 * neon.example.com.ai - Neon PostgreSQL Example
 *
 * Demonstrates serverless PostgreSQL API patterns
 * Uses in-memory storage for demo (postgres.do integration requires deployed backend)
 */

import { Hono } from 'hono'

interface Env {
  DATABASE_URL: string
  API_NAME: string
}

interface User {
  id: number
  name: string
  email: string
  created_at: string
}

// In-memory users store (simulates PostgreSQL)
let nextId = 4
const users: User[] = [
  { id: 1, name: 'Alice Smith', email: 'alice@example.com', created_at: new Date().toISOString() },
  { id: 2, name: 'Bob Jones', email: 'bob@example.com', created_at: new Date().toISOString() },
  { id: 3, name: 'Carol White', email: 'carol@example.com', created_at: new Date().toISOString() },
]

const app = new Hono<{ Bindings: Env }>()

function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'neon.example.com.ai',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

// Health check
app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    database: 'postgres (in-memory demo)',
    note: 'postgres.do@0.1.1 requires deployed backend at db.postgres.do',
    userCount: users.length,
    timestamp: new Date().toISOString(),
  })
})

// Root
app.get('/', (c) => {
  return respond(c, {
    name: 'neon.example.com.ai',
    description: 'Serverless PostgreSQL API (in-memory demo)',
    version: '1.0.0',
    note: 'Full postgres.do integration requires deployed backend',
    database: 'postgres.do@0.1.1 (demo mode)',
    endpoints: ['/health', '/users', '/users/:id', '/init', '/query'],
  })
})

// Initialize users table (no-op in demo mode)
app.post('/init', (c) => {
  return respond(c, {
    initialized: true,
    table: 'users',
    note: 'Demo mode - table is pre-initialized in memory'
  })
})

// List users
app.get('/users', (c) => {
  const limit = parseInt(c.req.query('limit') || '10', 10)
  const offset = parseInt(c.req.query('offset') || '0', 10)

  const paged = users.slice(offset, offset + limit)

  return respond(c, {
    users: paged,
    total: users.length,
    limit,
    offset
  })
})

// Create user
app.post('/users', async (c) => {
  const body = await c.req.json()

  if (!body.name || !body.email) {
    return respond(c, { error: 'Name and email are required' }, 400)
  }

  // Check for duplicate email
  if (users.find(u => u.email === body.email)) {
    return respond(c, { error: 'Email already exists' }, 400)
  }

  const user: User = {
    id: nextId++,
    name: body.name,
    email: body.email,
    created_at: new Date().toISOString(),
  }

  users.push(user)
  return respond(c, user, 201)
})

// Get user by ID
app.get('/users/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const user = users.find(u => u.id === id)

  if (!user) {
    return respond(c, { error: 'User not found' }, 404)
  }

  return respond(c, user)
})

// Delete user
app.delete('/users/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const index = users.findIndex(u => u.id === id)

  if (index === -1) {
    return respond(c, { error: 'User not found' }, 404)
  }

  users.splice(index, 1)
  return respond(c, { deleted: true, id })
})

// Raw query endpoint (simulated for demo)
app.post('/query', async (c) => {
  const body = await c.req.json()

  if (!body.sql) {
    return respond(c, { error: 'SQL query is required' }, 400)
  }

  // Only allow SELECT for safety
  if (!body.sql.trim().toLowerCase().startsWith('select')) {
    return respond(c, { error: 'Only SELECT queries allowed' }, 400)
  }

  // Simple query simulation
  const sql = body.sql.toLowerCase()
  let rows: any[] = []

  if (sql.includes('from users')) {
    rows = users
    if (sql.includes('count(*)')) {
      rows = [{ count: users.length }]
    }
  } else if (sql.includes('select 1')) {
    rows = [{ ok: 1, timestamp: new Date().toISOString() }]
  }

  return respond(c, {
    rows,
    count: rows.length,
    note: 'Simulated query execution - demo mode'
  })
})

export default app
