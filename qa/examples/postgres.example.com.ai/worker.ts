/**
 * postgres.example.com.ai - PGLite PostgreSQL Example
 *
 * Demonstrates real PostgreSQL operations using PGLite WASM
 * running in Cloudflare Workers with Durable Objects for persistence.
 *
 * This example uses @dotdo/pglite with EM_JS trampolines for
 * Cloudflare Workers compatibility (no runtime WASM compilation).
 */

import { Hono } from 'hono'
import { PGliteLocal } from './src/pglite-local'

// Static imports for WASM and data files (pre-patched from @dotdo/pglite)
// Copy using: node <path-to-pglite>/bin/copy-assets.js ./src/pglite-assets
// @ts-ignore - WASM module import
import pgliteWasm from './src/pglite-assets/pglite.wasm'
// @ts-ignore - Data file import
import pgliteData from './src/pglite-assets/pglite.data'

interface Env {
  API_NAME: string
  NOTES_DO: DurableObjectNamespace
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

// =============================================================================
// DURABLE OBJECT: NotesDO
// =============================================================================

/**
 * Durable Object that manages a PGLite PostgreSQL instance
 * Each DO gets its own isolated PostgreSQL database
 */
export class NotesDO implements DurableObject {
  private db: PGliteLocal | null = null
  private initPromise: Promise<void> | null = null
  private initialized = false

  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  /**
   * Initialize PGLite with PostgreSQL database
   */
  private async init(): Promise<void> {
    if (this.initialized && this.db) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      console.log('[NotesDO] Initializing PGLite...')

      // Initialize PGLite (in-memory PostgreSQL)
      this.db = await PGliteLocal.create({
        wasmModule: pgliteWasm,
        fsBundle: pgliteData,
        debug: false,
      })

      // Create the notes table with PostgreSQL features
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          tags TEXT[] DEFAULT '{}',
          archived BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)

      // Create indexes for common queries
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(archived);
        CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
      `)

      // Insert a welcome note if the table is empty
      const { rows } = await this.db.query<{ count: number }>('SELECT COUNT(*)::int as count FROM notes')
      if (rows[0].count === 0) {
        await this.db.exec(`
          INSERT INTO notes (id, title, content, tags, archived)
          VALUES (
            'note-welcome',
            'Welcome to PGLite',
            'This is a real PostgreSQL database running in WebAssembly!',
            ARRAY['welcome', 'demo'],
            false
          )
        `)
      }

      this.initialized = true
      console.log('[NotesDO] PGLite initialized successfully')
    })()

    return this.initPromise
  }

  /**
   * Create a note in PGLite
   */
  private async createNoteInternal(data: { id: string; title: string; content?: string | null; tags?: string[]; archived?: boolean }): Promise<Note> {
    const tags = data.tags || []
    const tagsArray = tags.length > 0
      ? `ARRAY[${tags.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`
      : "'{}'::text[]"

    await this.db!.exec(`
      INSERT INTO notes (id, title, content, tags, archived)
      VALUES (
        '${data.id}',
        '${(data.title || '').replace(/'/g, "''")}',
        ${data.content ? `'${data.content.replace(/'/g, "''")}'` : 'NULL'},
        ${tagsArray},
        ${data.archived || false}
      )
    `)

    const { rows } = await this.db!.query<Note>(`SELECT * FROM notes WHERE id = '${data.id}'`)
    return rows[0]
  }

  /**
   * Handle HTTP requests to the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    try {
      await this.init()

      const url = new URL(request.url)
      const path = url.pathname

      // Route requests
      if (path === '/query' && request.method === 'POST') {
        return this.handleQuery(request)
      }

      if (path === '/notes' && request.method === 'GET') {
        return this.handleListNotes(url)
      }

      if (path === '/notes' && request.method === 'POST') {
        return this.handleCreateNote(request)
      }

      if (path.startsWith('/notes/') && request.method === 'GET') {
        const id = path.replace('/notes/', '')
        return this.handleGetNote(id)
      }

      if (path.startsWith('/notes/') && request.method === 'PATCH') {
        const id = path.replace('/notes/', '')
        return this.handleUpdateNote(id, request)
      }

      if (path.startsWith('/notes/') && request.method === 'DELETE') {
        const id = path.replace('/notes/', '')
        return this.handleDeleteNote(id)
      }

      if (path === '/stats' && request.method === 'GET') {
        return this.handleStats()
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('[NotesDO] Error:', error)
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  private async handleQuery(request: Request): Promise<Response> {
    const body = await request.json() as { sql: string }
    if (!body.sql) {
      return new Response(JSON.stringify({ error: 'Missing sql' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await this.db!.query(body.sql)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleListNotes(url: URL): Promise<Response> {
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const archived = url.searchParams.get('archived')

    let sql = 'SELECT * FROM notes'
    const conditions: string[] = []

    if (archived !== null) {
      conditions.push(`archived = ${archived === 'true'}`)
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    sql += ' ORDER BY created_at DESC'
    sql += ` LIMIT ${limit} OFFSET ${offset}`

    const { rows } = await this.db!.query<Note>(sql)

    // Get total count
    let countSql = 'SELECT COUNT(*)::int as total FROM notes'
    if (conditions.length > 0) {
      countSql += ' WHERE ' + conditions.join(' AND ')
    }
    const countResult = await this.db!.query<{ total: number }>(countSql)
    const total = countResult.rows[0].total

    return new Response(JSON.stringify({ notes: rows, total, limit, offset }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleCreateNote(request: Request): Promise<Response> {
    const body = await request.json() as { title?: string; content?: string; tags?: string[] }

    if (!body.title) {
      return new Response(JSON.stringify({ error: 'Title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const id = `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const note = await this.createNoteInternal({
      id,
      title: body.title,
      content: body.content,
      tags: body.tags,
      archived: false,
    })

    return new Response(JSON.stringify(note), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleGetNote(id: string): Promise<Response> {
    const { rows } = await this.db!.query<Note>(`SELECT * FROM notes WHERE id = '${id.replace(/'/g, "''")}'`)

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(rows[0]), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleUpdateNote(id: string, request: Request): Promise<Response> {
    const safeId = id.replace(/'/g, "''")

    // Check if note exists
    const { rows: existing } = await this.db!.query<Note>(`SELECT * FROM notes WHERE id = '${safeId}'`)
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json() as Partial<{ title: string; content: string; tags: string[]; archived: boolean }>

    const updates: string[] = []
    if (body.title !== undefined) {
      updates.push(`title = '${body.title.replace(/'/g, "''")}'`)
    }
    if (body.content !== undefined) {
      updates.push(`content = ${body.content === null ? 'NULL' : `'${body.content.replace(/'/g, "''")}'`}`)
    }
    if (body.tags !== undefined) {
      const tagsArray = `ARRAY[${body.tags.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`
      updates.push(`tags = ${body.tags.length > 0 ? tagsArray : "'{}'"}`)
    }
    if (body.archived !== undefined) {
      updates.push(`archived = ${body.archived}`)
    }
    updates.push('updated_at = NOW()')

    await this.db!.exec(`UPDATE notes SET ${updates.join(', ')} WHERE id = '${safeId}'`)

    const { rows } = await this.db!.query<Note>(`SELECT * FROM notes WHERE id = '${safeId}'`)

    return new Response(JSON.stringify(rows[0]), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleDeleteNote(id: string): Promise<Response> {
    const safeId = id.replace(/'/g, "''")

    const { rows: existing } = await this.db!.query<Note>(`SELECT * FROM notes WHERE id = '${safeId}'`)
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await this.db!.exec(`DELETE FROM notes WHERE id = '${safeId}'`)

    return new Response(JSON.stringify({ deleted: true, id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleStats(): Promise<Response> {
    const { rows: countRows } = await this.db!.query<{ total: number; archived: number }>(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE archived)::int as archived
      FROM notes
    `)

    const { rows: tagRows } = await this.db!.query<{ tag: string; count: number }>(`
      SELECT unnest(tags) as tag, COUNT(*)::int as count
      FROM notes
      GROUP BY tag
      ORDER BY count DESC
    `)

    const tagCounts: Record<string, number> = {}
    for (const row of tagRows) {
      tagCounts[row.tag] = row.count
    }

    return new Response(JSON.stringify({
      totalNotes: countRows[0].total,
      activeNotes: countRows[0].total - countRows[0].archived,
      archivedNotes: countRows[0].archived,
      tagCounts,
      database: 'PGLite (real PostgreSQL)',
      timestamp: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// WORKER: HTTP ROUTING
// =============================================================================

const app = new Hono<{ Bindings: Env }>()

function respond(c: { env: Env; req: { url: string }; json: (data: unknown, status?: number) => Response }, data: unknown, status = 200) {
  return c.json({
    api: {
      name: c.env.API_NAME || 'postgres.example.com.ai',
      url: new URL(c.req.url).origin,
    },
    data,
  }, status)
}

/**
 * Get the NotesDO stub for requests
 */
function getNotesDO(env: Env): DurableObjectStub {
  const id = env.NOTES_DO.idFromName('notes')
  return env.NOTES_DO.get(id)
}

app.get('/', (c) => {
  const baseUrl = new URL(c.req.url).origin
  return respond(c, {
    name: 'postgres.example.com.ai',
    description: 'PGLite PostgreSQL example with real PostgreSQL in WebAssembly',
    version: '2.0.0',
    features: [
      'Real PostgreSQL via PGLite WASM',
      'Durable Objects for persistence',
      'PostgreSQL arrays and full SQL support',
      'Raw SQL query execution',
    ],
    links: {
      'Health Check': `${baseUrl}/health`,
      'List Notes': `${baseUrl}/notes`,
      'Database Stats': `${baseUrl}/stats`,
      'List Notes (limit 5)': `${baseUrl}/notes?limit=5`,
      'List Archived Notes': `${baseUrl}/notes?archived=true`,
    },
    api: {
      notes: {
        list: { method: 'GET', url: `${baseUrl}/notes` },
        create: { method: 'POST', url: `${baseUrl}/notes`, body: { title: 'string', content: 'string', tags: 'string[]' } },
        get: { method: 'GET', url: `${baseUrl}/notes/:id` },
        update: { method: 'PATCH', url: `${baseUrl}/notes/:id` },
        delete: { method: 'DELETE', url: `${baseUrl}/notes/:id` },
      },
      query: {
        method: 'POST',
        url: `${baseUrl}/query`,
        body: { sql: 'SELECT version()' },
      },
    },
  })
})

app.get('/health', async (c) => {
  try {
    const stub = getNotesDO(c.env)
    const response = await stub.fetch(new Request('http://internal/stats'))
    const stats = await response.json() as { totalNotes: number }

    return respond(c, {
      status: 'ok',
      database: 'PGLite (real PostgreSQL)',
      totalNotes: stats.totalNotes,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return respond(c, {
      status: 'error',
      database: 'PGLite (initializing)',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, 503)
  }
})

app.get('/notes', async (c) => {
  const stub = getNotesDO(c.env)
  const url = new URL(c.req.url)
  const response = await stub.fetch(new Request(`http://internal/notes${url.search}`))
  const data = await response.json()
  return respond(c, data)
})

app.post('/notes', async (c) => {
  const stub = getNotesDO(c.env)
  const body = await c.req.text()
  const response = await stub.fetch(new Request('http://internal/notes', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  }))
  const data = await response.json()
  return respond(c, data, response.status)
})

app.get('/notes/:id', async (c) => {
  const stub = getNotesDO(c.env)
  const id = c.req.param('id')
  const response = await stub.fetch(new Request(`http://internal/notes/${id}`))
  const data = await response.json()
  return respond(c, data, response.status)
})

app.patch('/notes/:id', async (c) => {
  const stub = getNotesDO(c.env)
  const id = c.req.param('id')
  const body = await c.req.text()
  const response = await stub.fetch(new Request(`http://internal/notes/${id}`, {
    method: 'PATCH',
    body,
    headers: { 'Content-Type': 'application/json' },
  }))
  const data = await response.json()
  return respond(c, data, response.status)
})

app.delete('/notes/:id', async (c) => {
  const stub = getNotesDO(c.env)
  const id = c.req.param('id')
  const response = await stub.fetch(new Request(`http://internal/notes/${id}`, {
    method: 'DELETE',
  }))
  const data = await response.json()
  return respond(c, data, response.status)
})

app.get('/stats', async (c) => {
  const stub = getNotesDO(c.env)
  const response = await stub.fetch(new Request('http://internal/stats'))
  const data = await response.json()
  return respond(c, data)
})

/**
 * Advanced: Raw SQL query endpoint
 * POST /query with { "sql": "SELECT ..." }
 */
app.post('/query', async (c) => {
  const stub = getNotesDO(c.env)
  const body = await c.req.text()
  const response = await stub.fetch(new Request('http://internal/query', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  }))
  const data = await response.json()
  return respond(c, data, response.status)
})

export default app
