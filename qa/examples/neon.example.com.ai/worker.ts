/**
 * neon.example.com.ai - Neon PostgreSQL Example
 *
 * Demonstrates serverless PostgreSQL with Neon/postgres.do
 * Using plain Hono to avoid bundling issues
 */

import { Hono } from 'hono'

interface Env {
  DATABASE_URL: string
  API_NAME: string
}

const app = new Hono<{ Bindings: Env }>()

// Simple response wrapper
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
    database: 'neon/postgres.do',
    note: 'postgres.do package needs dist files published',
    timestamp: new Date().toISOString(),
  })
})

// Root
app.get('/', (c) => {
  return respond(c, {
    name: 'neon.example.com.ai',
    description: 'Neon PostgreSQL example (pending postgres.do dist)',
    version: '1.0.0',
    status: 'pending',
    reason: 'postgres.do npm package missing dist files',
  })
})

// Users endpoint (placeholder)
app.get('/users', (c) => {
  return respond(c, {
    message: 'Users endpoint - requires postgres.do package to be complete',
    users: [],
  })
})

export default app
