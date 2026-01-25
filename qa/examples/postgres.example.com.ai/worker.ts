/**
 * postgres.example.com.ai - PostgreSQL at the Edge
 *
 * Uses AutoRouter for clean JSON responses.
 * PGLite WASM with DO SQLite for persistence.
 * Uses DO RPC for direct method calls (not fetch anti-pattern).
 * Includes detailed latency metrics for all operations.
 */

import { AutoRouter } from 'itty-router'
import { DurableObject } from 'cloudflare:workers'
import { PGliteLocal } from './src/pglite-local'

// Static WASM imports - Wrangler pre-compiles these
// @ts-ignore
import pgliteWasm from './src/pglite-assets/pglite.wasm'
// @ts-ignore
import pgliteData from './src/pglite-assets/pglite.data'

// =============================================================================
// Types
// =============================================================================

interface Env {
  POSTGRES: DurableObjectNamespace<Postgres>
}

interface Post {
  id: number
  title: string
  content: string | null
  published: boolean
  created_at: string
}

interface Timing {
  /** Cloudflare colo where the Worker is running */
  workerColo: string
  /** Cloudflare colo where the Durable Object is running */
  doColo: string
  /** Time spent executing the PostgreSQL query (ms) */
  queryMs: number
  /** Round-trip time from Worker to DO via RPC (ms) */
  rpcMs: number
  /** Total request latency (ms) */
  totalMs: number
}

interface QueryResult<T = Record<string, unknown>> {
  data: T
  queryMs: number
  doColo: string
}

// Helper to escape SQL strings
const esc = (s: string | null | undefined): string => {
  if (s === null || s === undefined) return 'NULL'
  return `'${String(s).replace(/'/g, "''")}'`
}

// =============================================================================
// Postgres Durable Object with RPC Methods
// =============================================================================

export class Postgres extends DurableObject {
  private pglite: PGliteLocal | null = null
  private initPromise: Promise<void> | null = null
  private sqlStorage: SqlStorage
  private colo: string = 'unknown'

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sqlStorage = ctx.storage.sql
    // Get colo from ctx.id location hint or fallback
    this.colo = (ctx as unknown as { colo?: string }).colo || 'unknown'
  }

  private async init(): Promise<void> {
    if (this.pglite) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      // DO SQLite for persistence
      this.sqlStorage.exec(`
        CREATE TABLE IF NOT EXISTS __posts (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          published INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)

      // PGLite with static WASM imports
      this.pglite = await PGliteLocal.create({
        wasmModule: pgliteWasm,
        fsBundle: pgliteData,
      })

      await this.pglite.exec(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          published BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)

      // Restore from DO SQLite
      const rows = [...this.sqlStorage.exec('SELECT * FROM __posts ORDER BY id')]
      for (const row of rows) {
        const ts = new Date(row.created_at as string).toISOString()
        await this.pglite.exec(`
          INSERT INTO posts (id, title, content, published, created_at)
          VALUES (${row.id}, ${esc(row.title as string)}, ${esc(row.content as string)}, ${row.published === 1}, '${ts}'::timestamptz)
          ON CONFLICT (id) DO NOTHING
        `)
      }
      if (rows.length > 0) {
        const maxId = Math.max(...rows.map(r => r.id as number))
        await this.pglite.exec(`SELECT setval('posts_id_seq', ${maxId})`)
      }

      // Seed if empty
      if (rows.length === 0) {
        await this._createPost('Welcome to PostgreSQL at the Edge', 'PGLite WASM in a Durable Object with persistence!', true)
        await this._createPost('How It Works', 'DO SQLite persists data, PGLite provides PostgreSQL features.', true)
        await this._createPost('Draft Post', 'This is unpublished.', false)
      }
    })()

    return this.initPromise
  }

  private async _createPost(title: string, content: string | null, published: boolean): Promise<Post> {
    const result = await this.pglite!.query<Post>(`
      INSERT INTO posts (title, content, published)
      VALUES (${esc(title)}, ${esc(content)}, ${published})
      RETURNING *
    `)
    const post = result.rows[0]
    const createdAt = post.created_at instanceof Date ? post.created_at.toISOString() : String(post.created_at)
    this.sqlStorage.exec(
      `INSERT OR REPLACE INTO __posts (id, title, content, published, created_at) VALUES (?, ?, ?, ?, ?)`,
      post.id, post.title, post.content, post.published ? 1 : 0, createdAt
    )
    return post
  }

  // ============================================================================
  // RPC Methods - Called directly from Worker
  // ============================================================================

  /** Execute raw SQL query */
  async query(sql: string): Promise<QueryResult> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query(sql)
    return {
      data: { rows: result.rows, rowCount: result.rows.length },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Get all posts with optional filter */
  async getPosts(published?: 'true' | 'false'): Promise<QueryResult<{ posts: Post[] }>> {
    await this.init()
    let query = 'SELECT * FROM posts'
    if (published === 'true') query += ' WHERE published = true'
    if (published === 'false') query += ' WHERE published = false'
    query += ' ORDER BY created_at DESC'
    const start = performance.now()
    const result = await this.pglite!.query<Post>(query)
    return {
      data: { posts: result.rows },
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Get a single post by ID */
  async getPost(id: number): Promise<QueryResult<Post | { error: string }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<Post>(`SELECT * FROM posts WHERE id = ${id}`)
    const queryMs = Math.round((performance.now() - start) * 100) / 100
    if (result.rows.length === 0) {
      return { data: { error: 'Not found' }, queryMs, doColo: this.colo }
    }
    return { data: result.rows[0], queryMs, doColo: this.colo }
  }

  /** Create a new post */
  async createPost(title: string, content: string | null, published: boolean): Promise<QueryResult<Post | { error: string }>> {
    await this.init()
    if (!title) {
      return { data: { error: 'Title required' }, queryMs: 0, doColo: this.colo }
    }
    const start = performance.now()
    const post = await this._createPost(title, content, published)
    return {
      data: post,
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Update a post */
  async updatePost(id: number, updates: Partial<Post>): Promise<QueryResult<Post | { error: string }>> {
    await this.init()
    const sets: string[] = []
    if (updates.title !== undefined) sets.push(`title = ${esc(updates.title)}`)
    if (updates.content !== undefined) sets.push(`content = ${esc(updates.content)}`)
    if (updates.published !== undefined) sets.push(`published = ${updates.published}`)
    if (sets.length === 0) {
      return { data: { error: 'No updates' }, queryMs: 0, doColo: this.colo }
    }
    const start = performance.now()
    const result = await this.pglite!.query<Post>(`UPDATE posts SET ${sets.join(', ')} WHERE id = ${id} RETURNING *`)
    const queryMs = Math.round((performance.now() - start) * 100) / 100
    if (result.rows.length === 0) {
      return { data: { error: 'Not found' }, queryMs, doColo: this.colo }
    }
    const post = result.rows[0]
    this.sqlStorage.exec(`UPDATE __posts SET title = ?, content = ?, published = ? WHERE id = ?`, post.title, post.content, post.published ? 1 : 0, post.id)
    return { data: post, queryMs, doColo: this.colo }
  }

  /** Delete a post */
  async deletePost(id: number): Promise<QueryResult<{ deleted: boolean; post: Post } | { error: string }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<Post>(`DELETE FROM posts WHERE id = ${id} RETURNING *`)
    const queryMs = Math.round((performance.now() - start) * 100) / 100
    if (result.rows.length === 0) {
      return { data: { error: 'Not found' }, queryMs, doColo: this.colo }
    }
    this.sqlStorage.exec('DELETE FROM __posts WHERE id = ?', id)
    return { data: { deleted: true, post: result.rows[0] }, queryMs, doColo: this.colo }
  }

  /** Get statistics */
  async getStats(): Promise<QueryResult<{ total: number; published: number; drafts: number }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<{ total: number; published: number; drafts: number }>(`
      SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE published)::int as published, COUNT(*) FILTER (WHERE NOT published)::int as drafts FROM posts
    `)
    return {
      data: result.rows[0],
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Get PostgreSQL version */
  async getVersion(): Promise<QueryResult<{ version: string }>> {
    await this.init()
    const start = performance.now()
    const result = await this.pglite!.query<{ version: string }>('SELECT version()')
    return {
      data: result.rows[0],
      queryMs: Math.round((performance.now() - start) * 100) / 100,
      doColo: this.colo,
    }
  }

  /** Get DO colo for diagnostics */
  getColo(): string {
    return this.colo
  }
}

// =============================================================================
// Router with RPC Calls
// =============================================================================

const router = AutoRouter()

const db = (env: Env) => env.POSTGRES.get(env.POSTGRES.idFromName('default'))

/** Wrap RPC result with full timing */
const withTiming = <T>(
  workerColo: string,
  result: QueryResult<T>,
  rpcMs: number,
  totalMs: number,
  status = 200
): Response => {
  const timing: Timing = {
    workerColo,
    doColo: result.doColo,
    queryMs: result.queryMs,
    rpcMs: Math.round(rpcMs * 100) / 100,
    totalMs: Math.round(totalMs * 100) / 100,
  }
  const body = {
    ...result.data as object,
    timing,
  }
  return Response.json(body, { status })
}

/** Get worker colo from request */
const getColo = (req: Request): string => {
  const cf = (req as unknown as { cf?: { colo?: string } }).cf
  return cf?.colo || 'unknown'
}

router.get('/', (req) => {
  const base = new URL(req.url).origin
  const workerColo = getColo(req)

  return {
    name: 'postgres.example.com.ai',
    description: 'PostgreSQL at the Edge - PGLite WASM + Durable Objects',
    workerColo,
    links: {
      'List Posts': `${base}/posts`,
      'Published Only': `${base}/posts?published=true`,
      'Drafts Only': `${base}/posts?published=false`,
      'Statistics': `${base}/stats`,
      'PostgreSQL Version': `${base}/version`,
      'Raw Query': `${base}/query (POST with {"sql": "SELECT ..."})`
    },
    timing: {
      note: 'All endpoints return detailed timing info via DO RPC',
      fields: {
        workerColo: 'Cloudflare datacenter running the Worker',
        doColo: 'Cloudflare datacenter running the Durable Object',
        queryMs: 'PostgreSQL query execution time (ms)',
        rpcMs: 'Worker to DO RPC call time (ms)',
        totalMs: 'Total request latency (ms)',
      },
    },
  }
})

router.get('/posts', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const url = new URL(req.url)
  const published = url.searchParams.get('published') as 'true' | 'false' | null

  const rpcStart = performance.now()
  const result = await db(env).getPosts(published || undefined)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.post('/posts', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const { title, content, published } = await req.json() as { title: string; content?: string; published?: boolean }

  const rpcStart = performance.now()
  const result = await db(env).createPost(title, content || null, published || false)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  const hasError = 'error' in result.data
  return withTiming(workerColo, result, rpcMs, totalMs, hasError ? 400 : 201)
})

router.get('/posts/:id', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const id = parseInt(req.params.id)

  const rpcStart = performance.now()
  const result = await db(env).getPost(id)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  const hasError = 'error' in result.data
  return withTiming(workerColo, result, rpcMs, totalMs, hasError ? 404 : 200)
})

router.patch('/posts/:id', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const id = parseInt(req.params.id)
  const updates = await req.json() as Partial<Post>

  const rpcStart = performance.now()
  const result = await db(env).updatePost(id, updates)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  const data = result.data as { error?: string }
  const status = data.error === 'No updates' ? 400 : data.error === 'Not found' ? 404 : 200
  return withTiming(workerColo, result, rpcMs, totalMs, status)
})

router.delete('/posts/:id', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const id = parseInt(req.params.id)

  const rpcStart = performance.now()
  const result = await db(env).deletePost(id)
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  const hasError = 'error' in result.data
  return withTiming(workerColo, result, rpcMs, totalMs, hasError ? 404 : 200)
})

router.get('/stats', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).getStats()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.get('/version', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)

  const rpcStart = performance.now()
  const result = await db(env).getVersion()
  const rpcMs = performance.now() - rpcStart
  const totalMs = performance.now() - requestStart

  return withTiming(workerColo, result, rpcMs, totalMs)
})

router.post('/query', async (req, env: Env) => {
  const requestStart = performance.now()
  const workerColo = getColo(req)
  const { sql } = await req.json() as { sql: string }

  try {
    const rpcStart = performance.now()
    const result = await db(env).query(sql)
    const rpcMs = performance.now() - rpcStart
    const totalMs = performance.now() - requestStart

    return withTiming(workerColo, result, rpcMs, totalMs)
  } catch (error) {
    const totalMs = performance.now() - requestStart
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: {
        workerColo,
        doColo: 'unknown',
        queryMs: 0,
        rpcMs: 0,
        totalMs: Math.round(totalMs * 100) / 100,
      },
    }, { status: 500 })
  }
})

export default router
