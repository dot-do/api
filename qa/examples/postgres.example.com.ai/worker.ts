/**
 * postgres.example.com.ai - PGLite PostgreSQL Example
 *
 * Demonstrates PostgreSQL-like operations (in-memory demo mode)
 * PGLite WASM is bundled but requires full runtime support
 * Using plain Hono with in-memory store for demo
 */

import { Hono } from 'hono'

interface Env {
  API_NAME: string
}

interface Note {
  id: string
  title: string
  content: string | null
  tags: string[]
  archived: boolean
  created_at: string
  updated_at: string
}

// In-memory store for demo
const store: { notes: Note[] } = {
  notes: [
    {
      id: 'note-1',
      title: 'Welcome to PGLite',
      content: 'This is a demo of PostgreSQL-like features',
      tags: ['welcome', 'demo'],
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
}

const app = new Hono<{ Bindings: Env }>()

function respond(c: any, data: any, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'postgres.example.com.ai',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

app.get('/health', (c) => {
  return respond(c, {
    status: 'ok',
    database: 'pglite (demo mode)',
    note: 'Using in-memory store - PGLite WASM requires full runtime support',
    totalNotes: store.notes.length,
    timestamp: new Date().toISOString(),
  })
})

app.get('/', (c) => {
  return respond(c, {
    name: 'postgres.example.com.ai',
    description: 'PGLite PostgreSQL example (in-memory demo)',
    version: '1.0.0',
    features: ['JSONB-like tags', 'Full-text ready', 'PostgreSQL semantics'],
  })
})

app.get('/notes', (c) => {
  const limit = parseInt(c.req.query('limit') || '10', 10)
  const offset = parseInt(c.req.query('offset') || '0', 10)
  const archived = c.req.query('archived')

  let notes = store.notes

  if (archived !== undefined) {
    notes = notes.filter(n => n.archived === (archived === 'true'))
  }

  const total = notes.length
  const paginated = notes.slice(offset, offset + limit)

  return respond(c, { notes: paginated, total, limit, offset })
})

app.post('/notes', async (c) => {
  const body = await c.req.json()

  if (!body.title) {
    return respond(c, { error: 'Title is required' }, 400)
  }

  const note: Note = {
    id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    title: body.title,
    content: body.content || null,
    tags: body.tags || [],
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  store.notes.unshift(note)
  return respond(c, note, 201)
})

app.get('/notes/:id', (c) => {
  const id = c.req.param('id')
  const note = store.notes.find(n => n.id === id)

  if (!note) {
    return respond(c, { error: 'Note not found' }, 404)
  }

  return respond(c, note)
})

app.patch('/notes/:id', async (c) => {
  const id = c.req.param('id')
  const note = store.notes.find(n => n.id === id)

  if (!note) {
    return respond(c, { error: 'Note not found' }, 404)
  }

  const body = await c.req.json()

  if (body.title !== undefined) note.title = body.title
  if (body.content !== undefined) note.content = body.content
  if (body.tags !== undefined) note.tags = body.tags
  if (body.archived !== undefined) note.archived = body.archived
  note.updated_at = new Date().toISOString()

  return respond(c, note)
})

app.delete('/notes/:id', (c) => {
  const id = c.req.param('id')
  const index = store.notes.findIndex(n => n.id === id)

  if (index === -1) {
    return respond(c, { error: 'Note not found' }, 404)
  }

  store.notes.splice(index, 1)
  return respond(c, { deleted: true, id })
})

app.get('/stats', (c) => {
  const total = store.notes.length
  const archived = store.notes.filter(n => n.archived).length
  const active = total - archived
  const tagCounts = store.notes.reduce((acc, note) => {
    note.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  return respond(c, {
    totalNotes: total,
    activeNotes: active,
    archivedNotes: archived,
    tagCounts,
    database: 'pglite (demo mode)',
    timestamp: new Date().toISOString(),
  })
})

export default app
