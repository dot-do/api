/**
 * neon.example.com.ai - Neon PostgreSQL Example
 *
 * Demonstrates serverless PostgreSQL with postgres.do client
 */

import { Hono } from 'hono'
import postgres from 'postgres.do'

interface Env {
  DATABASE_URL: string
  API_NAME: string
}

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

// Create SQL client from context
// Pass fetch explicitly to avoid "Illegal invocation" in Workers
function getSql(c: any) {
  return postgres(c.env.DATABASE_URL, {
    fetch: fetch.bind(globalThis),
    queryTimeout: 30000
  })
}

// Health check
app.get('/health', async (c) => {
  try {
    const sql = getSql(c)
    const result = await sql`SELECT 1 as ok, NOW() as timestamp`
    return respond(c, {
      status: 'ok',
      database: 'postgres.do',
      result: result[0],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return respond(c, {
      status: 'error',
      database: 'postgres.do',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    }, 500)
  }
})

// Root
app.get('/', (c) => {
  return respond(c, {
    name: 'neon.example.com.ai',
    description: 'Serverless PostgreSQL via postgres.do',
    version: '1.0.0',
    database: 'postgres.do@0.1.1',
    endpoints: ['/health', '/users', '/query'],
  })
})

// Initialize users table
app.post('/init', async (c) => {
  try {
    const sql = getSql(c)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    return respond(c, { initialized: true, table: 'users' })
  } catch (error) {
    return respond(c, { error: (error as Error).message }, 500)
  }
})

// List users
app.get('/users', async (c) => {
  try {
    const sql = getSql(c)
    const limit = parseInt(c.req.query('limit') || '10', 10)
    const offset = parseInt(c.req.query('offset') || '0', 10)

    const users = await sql`
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`SELECT COUNT(*) as total FROM users`
    const total = parseInt(countResult[0].total, 10)

    return respond(c, { users, total, limit, offset })
  } catch (error) {
    return respond(c, { error: (error as Error).message }, 500)
  }
})

// Create user
app.post('/users', async (c) => {
  try {
    const sql = getSql(c)
    const body = await c.req.json()

    if (!body.name || !body.email) {
      return respond(c, { error: 'Name and email are required' }, 400)
    }

    const result = await sql`
      INSERT INTO users (name, email)
      VALUES (${body.name}, ${body.email})
      RETURNING *
    `

    return respond(c, result[0], 201)
  } catch (error) {
    return respond(c, { error: (error as Error).message }, 500)
  }
})

// Get user by ID
app.get('/users/:id', async (c) => {
  try {
    const sql = getSql(c)
    const id = parseInt(c.req.param('id'), 10)

    const result = await sql`SELECT * FROM users WHERE id = ${id}`

    if (result.length === 0) {
      return respond(c, { error: 'User not found' }, 404)
    }

    return respond(c, result[0])
  } catch (error) {
    return respond(c, { error: (error as Error).message }, 500)
  }
})

// Delete user
app.delete('/users/:id', async (c) => {
  try {
    const sql = getSql(c)
    const id = parseInt(c.req.param('id'), 10)

    const result = await sql`
      DELETE FROM users WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return respond(c, { error: 'User not found' }, 404)
    }

    return respond(c, { deleted: true, id })
  } catch (error) {
    return respond(c, { error: (error as Error).message }, 500)
  }
})

// Raw query endpoint (for testing)
app.post('/query', async (c) => {
  try {
    const sql = getSql(c)
    const body = await c.req.json()

    if (!body.sql) {
      return respond(c, { error: 'SQL query is required' }, 400)
    }

    // Only allow SELECT for safety
    if (!body.sql.trim().toLowerCase().startsWith('select')) {
      return respond(c, { error: 'Only SELECT queries allowed' }, 400)
    }

    const result = await sql.unsafe(body.sql, body.params || [])
    return respond(c, { rows: result, count: result.length })
  } catch (error) {
    return respond(c, { error: (error as Error).message }, 500)
  }
})

export default app
