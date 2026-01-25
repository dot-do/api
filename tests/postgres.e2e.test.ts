import { describe, it, expect } from 'vitest'

const POSTGRES_URL = 'https://postgres.example.com.ai'

interface Timing {
  workerColo: string
  doColo: string
  queryMs: number
  rpcMs: number
  totalMs: number
}

interface Post {
  id: number
  title: string
  content: string | null
  published: boolean
  created_at: string
}

interface Stats {
  total: number
  published: number
  drafts: number
}

interface WithTiming<T> extends Record<string, unknown> {
  timing: Timing
}

describe('E2E: postgres.example.com.ai', () => {
  describe('Root endpoint', () => {
    it('returns API info with links and worker colo', async () => {
      const res = await fetch(POSTGRES_URL)
      expect(res.ok).toBe(true)

      const body = await res.json() as Record<string, unknown>
      expect(body.name).toBe('postgres.example.com.ai')
      expect(body.description).toContain('PostgreSQL')
      expect(body.workerColo).toBeDefined()
      expect(typeof body.workerColo).toBe('string')
      expect(body.links).toBeDefined()

      const links = body.links as Record<string, string>
      expect(links['List Posts']).toContain('/posts')
      expect(links['Statistics']).toContain('/stats')
      expect(links['PostgreSQL Version']).toContain('/version')

      // Timing documentation
      const timing = body.timing as Record<string, unknown>
      expect(timing.note).toContain('timing')
      expect(timing.fields).toBeDefined()
    })
  })

  describe('Timing metrics', () => {
    it('returns timing info on all endpoints', async () => {
      const res = await fetch(`${POSTGRES_URL}/stats`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<Stats>
      expect(body.timing).toBeDefined()
      expect(body.timing.workerColo).toBeDefined()
      expect(body.timing.doColo).toBeDefined()
      expect(typeof body.timing.queryMs).toBe('number')
      expect(typeof body.timing.rpcMs).toBe('number')
      expect(typeof body.timing.totalMs).toBe('number')

      // Query time should be less than total time
      expect(body.timing.queryMs).toBeLessThanOrEqual(body.timing.totalMs)
      expect(body.timing.rpcMs).toBeLessThanOrEqual(body.timing.totalMs)
    })

    it('tracks query execution time accurately', async () => {
      // Simple query should be fast
      const simpleRes = await fetch(`${POSTGRES_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT 1' }),
      })
      const simple = await simpleRes.json() as WithTiming<{ rows: unknown[] }>
      expect(simple.timing.queryMs).toBeLessThan(100) // Should be < 100ms

      // Query timing is tracked (may be 0 for very fast queries)
      const complexRes = await fetch(`${POSTGRES_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: "SELECT generate_series(1, 1000) as n",
        }),
      })
      const complex = await complexRes.json() as WithTiming<{ rows: unknown[] }>
      expect(typeof complex.timing.queryMs).toBe('number')
      expect(complex.timing.queryMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('PostgreSQL version', () => {
    it('returns PostgreSQL version info with timing', async () => {
      const res = await fetch(`${POSTGRES_URL}/version`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ version: string }>
      expect(body.version).toContain('PostgreSQL')
      expect(body.timing).toBeDefined()
    })
  })

  describe('Posts CRUD', () => {
    it('lists all posts with timing', async () => {
      const res = await fetch(`${POSTGRES_URL}/posts`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ posts: Post[] }>
      expect(Array.isArray(body.posts)).toBe(true)
      expect(body.posts.length).toBeGreaterThan(0)
      expect(body.timing).toBeDefined()
      expect(body.timing.queryMs).toBeGreaterThanOrEqual(0)
    })

    it('lists only published posts', async () => {
      const res = await fetch(`${POSTGRES_URL}/posts?published=true`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ posts: Post[] }>
      expect(body.posts.every(p => p.published === true)).toBe(true)
      expect(body.timing).toBeDefined()
    })

    it('lists only draft posts', async () => {
      const res = await fetch(`${POSTGRES_URL}/posts?published=false`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ posts: Post[] }>
      expect(body.posts.every(p => p.published === false)).toBe(true)
      expect(body.timing).toBeDefined()
    })

    it('creates, reads, updates, and deletes a post', async () => {
      // CREATE
      const createRes = await fetch(`${POSTGRES_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `E2E CRUD Test ${Date.now()}`,
          content: 'Test post for CRUD operations',
          published: false,
        }),
      })
      expect(createRes.status).toBe(201)
      const created = await createRes.json() as WithTiming<Post>
      expect(created.id).toBeGreaterThan(0)
      expect(created.timing).toBeDefined()
      const postId = created.id

      // READ
      const getRes = await fetch(`${POSTGRES_URL}/posts/${postId}`)
      expect(getRes.ok).toBe(true)
      const gotten = await getRes.json() as WithTiming<Post>
      expect(gotten.id).toBe(postId)
      expect(gotten.timing).toBeDefined()

      // UPDATE
      const updateRes = await fetch(`${POSTGRES_URL}/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated CRUD Test', published: true }),
      })
      expect(updateRes.ok).toBe(true)
      const updated = await updateRes.json() as WithTiming<Post>
      expect(updated.title).toBe('Updated CRUD Test')
      expect(updated.published).toBe(true)
      expect(updated.timing).toBeDefined()

      // DELETE
      const deleteRes = await fetch(`${POSTGRES_URL}/posts/${postId}`, {
        method: 'DELETE',
      })
      expect(deleteRes.ok).toBe(true)
      const deleted = await deleteRes.json() as WithTiming<{ deleted: boolean; post: Post }>
      expect(deleted.deleted).toBe(true)
      expect(deleted.timing).toBeDefined()

      // CONFIRM DELETION
      const confirmRes = await fetch(`${POSTGRES_URL}/posts/${postId}`)
      expect(confirmRes.status).toBe(404)
    })

    it('returns 404 for non-existent post', async () => {
      const res = await fetch(`${POSTGRES_URL}/posts/999999`)
      expect(res.status).toBe(404)

      const body = await res.json() as WithTiming<{ error: string }>
      expect(body.error).toBe('Not found')
      expect(body.timing).toBeDefined()
    })
  })

  describe('Statistics', () => {
    it('returns correct statistics with timing', async () => {
      const res = await fetch(`${POSTGRES_URL}/stats`)
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<Stats>
      expect(typeof body.total).toBe('number')
      expect(typeof body.published).toBe('number')
      expect(typeof body.drafts).toBe('number')
      expect(body.total).toBe(body.published + body.drafts)
      expect(body.timing).toBeDefined()
    })
  })

  describe('Raw SQL query', () => {
    it('executes raw SQL queries with timing', async () => {
      const res = await fetch(`${POSTGRES_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT 1 + 1 as result' }),
      })
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ rows: Array<{ result: number }>; rowCount: number }>
      expect(body.rowCount).toBe(1)
      expect(body.rows[0].result).toBe(2)
      expect(body.timing).toBeDefined()
      expect(body.timing.queryMs).toBeGreaterThanOrEqual(0)
    })

    it('executes PostgreSQL-specific functions', async () => {
      const res = await fetch(`${POSTGRES_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: "SELECT array_agg(x) as arr FROM generate_series(1, 3) x",
        }),
      })
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ rows: Array<{ arr: string | number[] }> }>
      // PGLite returns arrays as Postgres array strings like "{1,2,3}"
      const arr = body.rows[0].arr
      if (typeof arr === 'string') {
        expect(arr).toBe('{1,2,3}')
      } else {
        expect(arr).toEqual([1, 2, 3])
      }
      expect(body.timing).toBeDefined()
    })
  })

  describe('Persistence verification', () => {
    let persistenceTestId: number
    const uniqueTitle = `Persistence Test ${Date.now()}`

    it('creates a post for persistence testing', async () => {
      const res = await fetch(`${POSTGRES_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uniqueTitle,
          content: 'This post tests that data persists across DO evictions',
          published: true,
        }),
      })
      expect(res.status).toBe(201)

      const body = await res.json() as WithTiming<Post>
      persistenceTestId = body.id as number
      expect(body.timing).toBeDefined()
    })

    it('verifies the post exists in PostgreSQL', async () => {
      const res = await fetch(`${POSTGRES_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `SELECT * FROM posts WHERE id = ${persistenceTestId}`,
        }),
      })
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ rows: Post[] }>
      expect(body.rows.length).toBe(1)
      expect(body.rows[0].title).toBe(uniqueTitle)
      expect(body.timing).toBeDefined()
    })

    it('verifies count is consistent between endpoints', async () => {
      const [postsRes, statsRes] = await Promise.all([
        fetch(`${POSTGRES_URL}/posts`),
        fetch(`${POSTGRES_URL}/stats`),
      ])

      const posts = await postsRes.json() as WithTiming<{ posts: Post[] }>
      const stats = await statsRes.json() as WithTiming<Stats>

      expect(posts.posts.length).toBe(stats.total)
      // Both should have timing
      expect(posts.timing).toBeDefined()
      expect(stats.timing).toBeDefined()
    })

    it('cleans up persistence test post', async () => {
      const res = await fetch(`${POSTGRES_URL}/posts/${persistenceTestId}`, {
        method: 'DELETE',
      })
      expect(res.ok).toBe(true)

      const body = await res.json() as WithTiming<{ deleted: boolean }>
      expect(body.timing).toBeDefined()
    })
  })

  describe('Edge location awareness', () => {
    it('reports worker and DO colocations', async () => {
      const res = await fetch(`${POSTGRES_URL}/stats`)
      const body = await res.json() as WithTiming<Stats>

      // Worker colo should be 3-letter IATA airport code
      expect(body.timing.workerColo).toMatch(/^[A-Z]{3}$/)
      // DO colo may be "unknown" when using RPC (no Request object in DO)
      expect(body.timing.doColo).toBeDefined()
      expect(typeof body.timing.doColo).toBe('string')

      // Worker and DO may or may not be colocated
      console.log(`Worker colo: ${body.timing.workerColo}, DO colo: ${body.timing.doColo}`)
    })
  })

  describe('Error handling', () => {
    it('returns 400 for POST without title with timing', async () => {
      const res = await fetch(`${POSTGRES_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'No title' }),
      })
      expect(res.status).toBe(400)

      const body = await res.json() as WithTiming<{ error: string }>
      expect(body.error).toContain('Title')
      expect(body.timing).toBeDefined()
    })

    it('returns 400 for PATCH with no updates', async () => {
      const postsRes = await fetch(`${POSTGRES_URL}/posts`)
      const posts = await postsRes.json() as WithTiming<{ posts: Post[] }>
      const firstPostId = posts.posts[0]?.id

      if (firstPostId) {
        const res = await fetch(`${POSTGRES_URL}/posts/${firstPostId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        expect(res.status).toBe(400)

        const body = await res.json() as WithTiming<{ error: string }>
        expect(body.error).toContain('No updates')
        expect(body.timing).toBeDefined()
      }
    })

    it('returns 404 for unknown routes', async () => {
      const res = await fetch(`${POSTGRES_URL}/nonexistent`)
      expect(res.status).toBe(404)
    })

    it('returns 500 for invalid SQL with timing', async () => {
      const res = await fetch(`${POSTGRES_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT * FROM nonexistent_table_xyz' }),
      })
      expect(res.status).toBe(500)

      const body = await res.json() as WithTiming<{ error: string }>
      expect(body.error).toBeDefined()
      expect(body.timing).toBeDefined()
    })
  })

  describe('WebSocket hibernation (95% cost savings)', () => {
    it('connects via WebSocket and executes RPC calls', async () => {
      const wsUrl = POSTGRES_URL.replace(/^https/, 'wss') + '/ws'

      // Use a promise to handle the async WebSocket flow
      const result = await new Promise<{ connected: boolean; responses: unknown[] }>((resolve, reject) => {
        const ws = new WebSocket(wsUrl)
        const responses: unknown[] = []

        const timeout = setTimeout(() => {
          ws.close()
          reject(new Error('WebSocket timeout'))
        }, 10000)

        ws.addEventListener('open', () => {
          // Test getPosts
          ws.send(JSON.stringify({ id: 1, path: 'getPosts' }))
        })

        ws.addEventListener('message', (event) => {
          const data = JSON.parse(event.data as string)
          responses.push(data)

          if (data.id === 1) {
            // After getPosts, test getStats
            ws.send(JSON.stringify({ id: 2, path: 'getStats' }))
          } else if (data.id === 2) {
            // Done, close connection
            clearTimeout(timeout)
            ws.close()
            resolve({ connected: true, responses })
          }
        })

        ws.addEventListener('error', (err) => {
          clearTimeout(timeout)
          reject(new Error('WebSocket error'))
        })
      })

      expect(result.connected).toBe(true)
      expect(result.responses.length).toBe(2)

      // Check first response (getPosts)
      const postsResponse = result.responses[0] as { id: number; result: { data: { posts: Post[] }; doColo: string } }
      expect(postsResponse.id).toBe(1)
      expect(postsResponse.result.data.posts).toBeDefined()
      expect(Array.isArray(postsResponse.result.data.posts)).toBe(true)

      // Check second response (getStats)
      const statsResponse = result.responses[1] as { id: number; result: { data: Stats; doColo: string } }
      expect(statsResponse.id).toBe(2)
      expect(typeof statsResponse.result.data.total).toBe('number')
      expect(typeof statsResponse.result.data.published).toBe('number')
      expect(typeof statsResponse.result.data.drafts).toBe('number')
    })
  })
})
