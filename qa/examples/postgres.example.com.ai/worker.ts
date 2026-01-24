/**
 * postgres.example.com.ai - PGLite WASM PostgreSQL in Durable Object
 *
 * Demonstrates PGLite (WASM PostgreSQL) running inside a Durable Object with:
 * - Full PostgreSQL features (JSON, full-text search via tsvector)
 * - MCP tools for notes management
 * - Embedded tests in tool definitions
 * - Custom routes for health and full-text search
 */

import { API } from 'api.do'
import { DurableObject } from 'cloudflare:workers'
import { PGlite } from '@electric-sql/pglite'

// Environment bindings
interface Env {
  NOTES_DO: DurableObjectNamespace<NotesDO>
}

/**
 * NotesDO - Durable Object that runs PGLite WASM PostgreSQL
 */
export class NotesDO extends DurableObject<Env> {
  private db: PGlite | null = null
  private initialized = false

  private async ensureInitialized(): Promise<PGlite> {
    if (this.initialized && this.db) {
      return this.db
    }

    this.db = new PGlite()
    await this.db.waitReady

    // Create notes table with full-text search support
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        tags JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        archived BOOLEAN DEFAULT false,
        search_vector tsvector GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(content, '')), 'B')
        ) STORED,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS notes_search_idx ON notes USING GIN(search_vector);
      CREATE INDEX IF NOT EXISTS notes_tags_idx ON notes USING GIN(tags);
      CREATE INDEX IF NOT EXISTS notes_archived_idx ON notes(archived);
    `)

    this.initialized = true
    return this.db
  }

  // Generate a simple ID
  private generateId(): string {
    return `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  // RPC method: Create a note
  async createNote(input: { title: string; content?: string; tags?: string[]; metadata?: Record<string, unknown> }) {
    const db = await this.ensureInitialized()
    const { title, content, tags, metadata } = input

    if (!title || title.length === 0) {
      throw Object.assign(new Error('Title is required'), { code: 'VALIDATION_ERROR' })
    }

    const id = this.generateId()

    const result = await db.query<{
      id: string
      title: string
      content: string | null
      tags: string[]
      metadata: Record<string, unknown>
      archived: boolean
      created_at: Date
      updated_at: Date
    }>(
      `INSERT INTO notes (id, title, content, tags, metadata)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       RETURNING id, title, content, tags, metadata, archived, created_at, updated_at`,
      [id, title, content || null, JSON.stringify(tags || []), JSON.stringify(metadata || {})]
    )

    const note = result.rows[0]
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      metadata: note.metadata,
      archived: note.archived,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    }
  }

  // RPC method: Get a note by ID
  async getNote(input: { id: string }) {
    const db = await this.ensureInitialized()
    const { id } = input

    const result = await db.query<{
      id: string
      title: string
      content: string | null
      tags: string[]
      metadata: Record<string, unknown>
      archived: boolean
      created_at: Date
      updated_at: Date
    }>('SELECT * FROM notes WHERE id = $1', [id])

    if (result.rows.length === 0) {
      throw Object.assign(new Error('Note not found'), { code: 'NOT_FOUND' })
    }

    const note = result.rows[0]
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      metadata: note.metadata,
      archived: note.archived,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    }
  }

  // RPC method: List notes
  async listNotes(input: { archived?: boolean; tag?: string; limit?: number; offset?: number }) {
    const db = await this.ensureInitialized()
    const { archived, tag, limit = 10, offset = 0 } = input

    // Build query with filters
    let whereClause = 'WHERE 1=1'
    const params: (boolean | string | number)[] = []
    let paramIndex = 1

    if (archived !== undefined) {
      whereClause += ` AND archived = $${paramIndex++}`
      params.push(archived)
    }

    if (tag) {
      whereClause += ` AND tags ? $${paramIndex++}`
      params.push(tag)
    }

    // Get total count
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM notes ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].count, 10)

    // Get paginated results
    const listParams = [...params, limit, offset]
    const result = await db.query<{
      id: string
      title: string
      tags: string[]
      archived: boolean
      created_at: Date
    }>(
      `SELECT id, title, tags, archived, created_at
       FROM notes ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      listParams
    )

    return {
      notes: result.rows.map((note) => ({
        id: note.id,
        title: note.title,
        tags: note.tags,
        archived: note.archived,
        createdAt: note.created_at,
      })),
      total,
      limit,
      offset,
    }
  }

  // RPC method: Full-text search
  async searchNotes(input: { query: string; limit?: number }) {
    const db = await this.ensureInitialized()
    const { query, limit = 10 } = input

    if (!query || query.length === 0) {
      throw Object.assign(new Error('Search query is required'), { code: 'VALIDATION_ERROR' })
    }

    const result = await db.query<{
      id: string
      title: string
      content: string | null
      rank: number
      headline: string
    }>(
      `SELECT
         id,
         title,
         content,
         ts_rank(search_vector, plainto_tsquery('english', $1)) as rank,
         ts_headline('english', coalesce(content, ''), plainto_tsquery('english', $1),
           'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25') as headline
       FROM notes
       WHERE search_vector @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT $2`,
      [query, limit]
    )

    return {
      results: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        rank: row.rank,
        headline: row.headline,
      })),
      query,
      total: result.rows.length,
    }
  }

  // RPC method: Archive/unarchive a note
  async archiveNote(input: { id: string; archived: boolean }) {
    const db = await this.ensureInitialized()
    const { id, archived } = input

    const result = await db.query<{
      id: string
      archived: boolean
      updated_at: Date
    }>(
      `UPDATE notes
       SET archived = $2, updated_at = now()
       WHERE id = $1
       RETURNING id, archived, updated_at`,
      [id, archived]
    )

    if (result.rows.length === 0) {
      throw Object.assign(new Error('Note not found'), { code: 'NOT_FOUND' })
    }

    return {
      id: result.rows[0].id,
      archived: result.rows[0].archived,
      updatedAt: result.rows[0].updated_at,
    }
  }

  // RPC method: Get database stats
  async getStats() {
    const db = await this.ensureInitialized()

    const [totalResult, archivedResult, tagStats, versionResult] = await Promise.all([
      db.query<{ count: string }>('SELECT COUNT(*) as count FROM notes'),
      db.query<{ count: string }>('SELECT COUNT(*) as count FROM notes WHERE archived = true'),
      db.query<{ tag: string; count: string }>(
        `SELECT tag, COUNT(*) as count
         FROM notes, jsonb_array_elements_text(tags) as tag
         GROUP BY tag
         ORDER BY count DESC
         LIMIT 10`
      ),
      db.query<{ version: string }>('SELECT version()'),
    ])

    return {
      totalNotes: parseInt(totalResult.rows[0].count, 10),
      archivedNotes: parseInt(archivedResult.rows[0].count, 10),
      topTags: tagStats.rows.map((r) => ({ tag: r.tag, count: parseInt(r.count, 10) })),
      postgresVersion: versionResult.rows[0]?.version || 'unknown',
      timestamp: new Date().toISOString(),
    }
  }

  // RPC method: Health check
  async health() {
    const db = await this.ensureInitialized()
    const result = await db.query<{ version: string }>('SELECT version()')

    return {
      status: 'ok',
      database: 'pglite',
      version: result.rows[0]?.version || 'unknown',
      timestamp: new Date().toISOString(),
    }
  }
}

// Helper to get DO stub
function getNotesStub(env: Env): DurableObjectStub<NotesDO> {
  const id = env.NOTES_DO.idFromName('default')
  return env.NOTES_DO.get(id)
}

export default API({
  name: 'postgres.example.com.ai',
  description: 'PGLite WASM PostgreSQL in Durable Object with full-text search and JSON support',
  version: '1.0.0',

  auth: { mode: 'optional' },

  // MCP tools with embedded tests - delegates to DO RPC methods
  mcp: {
    name: 'pglite-notes-mcp',
    version: '1.0.0',
    tools: [
      {
        name: 'notes.create',
        description: 'Create a new note with optional tags and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, description: 'Note title (required)' },
            content: { type: 'string', description: 'Note content/body' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tags for categorization',
            },
            metadata: {
              type: 'object',
              description: 'Arbitrary JSON metadata',
            },
          },
          required: ['title'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            archived: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        examples: [
          {
            name: 'create simple note',
            input: { title: 'My First Note', content: 'Hello world!' },
            output: { id: 'note-1', title: 'My First Note', content: 'Hello world!' },
          },
          {
            name: 'create tagged note',
            input: { title: 'Meeting Notes', content: 'Discussed roadmap', tags: ['work', 'meetings'] },
            output: { id: 'note-2', title: 'Meeting Notes', tags: ['work', 'meetings'] },
          },
        ],
        tests: [
          {
            name: 'creates note with valid title',
            tags: ['smoke', 'crud'],
            input: { title: 'Test Note', content: 'Test content' },
            expect: {
              status: 'success',
              output: {
                title: 'Test Note',
                content: 'Test content',
                archived: false,
              },
              match: 'partial',
            },
          },
          {
            name: 'creates note with tags as JSON array',
            tags: ['crud', 'json'],
            input: { title: 'Tagged Note', tags: ['important', 'todo'] },
            expect: {
              status: 'success',
              output: {
                title: 'Tagged Note',
                tags: ['important', 'todo'],
              },
              match: 'partial',
            },
          },
          {
            name: 'creates note with metadata as JSONB',
            tags: ['crud', 'json'],
            input: { title: 'Note with Meta', metadata: { priority: 'high', color: 'red' } },
            expect: {
              status: 'success',
              output: {
                title: 'Note with Meta',
                'metadata.priority': 'high',
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects empty title',
            tags: ['validation', 'negative'],
            input: { title: '', content: 'Content without title' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects missing title',
            tags: ['validation', 'negative'],
            input: { content: 'Content only' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const stub = getNotesStub(c.env as Env)
          return stub.createNote(input as { title: string; content?: string; tags?: string[]; metadata?: Record<string, unknown> })
        },
      },
      {
        name: 'notes.get',
        description: 'Get a note by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Note ID' },
          },
          required: ['id'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            archived: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        tests: [
          {
            name: 'returns 404 for non-existent note',
            tags: ['negative'],
            input: { id: 'non-existent-id' },
            expect: {
              status: 'error',
              error: { code: 'NOT_FOUND' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const stub = getNotesStub(c.env as Env)
          return stub.getNote(input as { id: string })
        },
      },
      {
        name: 'notes.list',
        description: 'List notes with optional filtering by archived status and tags',
        inputSchema: {
          type: 'object',
          properties: {
            archived: { type: 'boolean', description: 'Filter by archived status' },
            tag: { type: 'string', description: 'Filter by tag' },
            limit: { type: 'number', default: 10, minimum: 1, maximum: 100 },
            offset: { type: 'number', default: 0, minimum: 0 },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            notes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  archived: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
        tests: [
          {
            name: 'returns empty array when no notes',
            tags: ['smoke'],
            input: {},
            expect: {
              status: 'success',
              output: {
                'notes': { type: 'array' },
                'total': { type: 'number', gte: 0 },
              },
              match: 'partial',
            },
          },
          {
            name: 'respects limit parameter',
            tags: ['pagination'],
            input: { limit: 5 },
            expect: {
              status: 'success',
              output: {
                limit: 5,
              },
              match: 'partial',
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const stub = getNotesStub(c.env as Env)
          return stub.listNotes(input as { archived?: boolean; tag?: string; limit?: number; offset?: number })
        },
      },
      {
        name: 'notes.search',
        description: 'Full-text search notes using PostgreSQL tsvector',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 1, description: 'Search query' },
            limit: { type: 'number', default: 10, minimum: 1, maximum: 100 },
          },
          required: ['query'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  content: { type: 'string' },
                  rank: { type: 'number' },
                  headline: { type: 'string' },
                },
              },
            },
            query: { type: 'string' },
            total: { type: 'number' },
          },
        },
        tests: [
          {
            name: 'returns results for valid query',
            tags: ['smoke', 'search'],
            input: { query: 'test' },
            expect: {
              status: 'success',
              output: {
                'query': 'test',
                'results': { type: 'array' },
                'total': { type: 'number', gte: 0 },
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects empty query',
            tags: ['validation', 'negative'],
            input: { query: '' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const stub = getNotesStub(c.env as Env)
          return stub.searchNotes(input as { query: string; limit?: number })
        },
      },
      {
        name: 'notes.archive',
        description: 'Archive or unarchive a note',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Note ID' },
            archived: { type: 'boolean', description: 'Archive status' },
          },
          required: ['id', 'archived'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            archived: { type: 'boolean' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        tests: [
          {
            name: 'returns 404 for non-existent note',
            tags: ['negative'],
            input: { id: 'does-not-exist', archived: true },
            expect: {
              status: 'error',
              error: { code: 'NOT_FOUND' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const stub = getNotesStub(c.env as Env)
          return stub.archiveNote(input as { id: string; archived: boolean })
        },
      },
    ],
  },

  // Testing configuration
  testing: {
    enabled: true,
    endpoint: '/qa',
    tags: ['example', 'pglite', 'postgres', 'do'],
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        tests: [
          {
            name: 'health check returns ok status',
            tags: ['smoke', 'health'],
            expect: {
              status: 200,
              body: {
                'data.status': 'ok',
                'data.database': 'pglite',
              },
            },
          },
        ],
      },
      {
        path: '/',
        method: 'GET',
        tests: [
          {
            name: 'root returns API info',
            tags: ['smoke'],
            expect: {
              status: 200,
              body: {
                'api.name': 'postgres.example.com.ai',
              },
            },
          },
        ],
      },
    ],
  },

  // Custom routes
  routes: (app) => {
    // Health check with database status
    app.get('/health', async (c) => {
      const stub = getNotesStub(c.env as Env)
      const health = await stub.health()

      return c.var.respond({
        data: health,
      })
    })

    // Full-text search endpoint (alternative to MCP tool)
    app.get('/notes/fulltext', async (c) => {
      const query = c.req.query('q')
      const limit = parseInt(c.req.query('limit') || '10', 10)

      if (!query) {
        return c.var.respond({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameter "q" is required',
          },
        }, 400)
      }

      const stub = getNotesStub(c.env as Env)
      const results = await stub.searchNotes({ query, limit })

      return c.var.respond({
        data: results,
        links: {
          self: `${new URL(c.req.url).origin}/notes/fulltext?q=${encodeURIComponent(query)}&limit=${limit}`,
        },
      })
    })

    // Database statistics
    app.get('/stats', async (c) => {
      const stub = getNotesStub(c.env as Env)
      const stats = await stub.getStats()

      return c.var.respond({
        data: stats,
      })
    })

    // Examples documentation
    app.get('/examples', (c) => {
      const url = new URL(c.req.url)
      return c.var.respond({
        data: [
          {
            name: 'MCP Tools',
            description: 'JSON-RPC tools for notes management with PGLite in DO',
            path: '/mcp',
            methods: ['notes.create', 'notes.get', 'notes.list', 'notes.search', 'notes.archive'],
          },
          {
            name: 'Full-Text Search',
            description: 'PostgreSQL full-text search via tsvector',
            path: '/notes/fulltext?q=your+search+query',
            example: `${url.origin}/notes/fulltext?q=meeting`,
          },
          {
            name: 'Database Stats',
            description: 'View database statistics and tag counts',
            path: '/stats',
          },
          {
            name: 'Health Check',
            description: 'Check PGLite status and PostgreSQL version',
            path: '/health',
          },
        ],
        links: {
          self: `${url.origin}/examples`,
          health: `${url.origin}/health`,
          mcp: `${url.origin}/mcp`,
          qa: `${url.origin}/qa`,
        },
      })
    })
  },
})
