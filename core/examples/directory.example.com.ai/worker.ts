import { API } from '../../dist'

export default API({
  name: 'directory.example.com.ai',
  description: 'API Directory - Discover and explore available APIs',
  version: '1.0.0',
  auth: { mode: 'optional' },
  crud: {
    db: 'DB',
    table: 'apis',
    searchable: ['name', 'description', 'domain', 'category'],
    sortable: ['name', 'category', 'created_at'],
    pageSize: 50,
  },
  analytics: { binding: 'ANALYTICS' },
  routes: (app) => {
    app.get('/categories', async (c) => {
      const db = (c.env as Record<string, unknown>).DB as D1Database
      const results = await db.prepare('SELECT DISTINCT category, COUNT(*) as count FROM apis GROUP BY category ORDER BY count DESC').all()
      return c.var.respond({
        data: results.results,
        key: 'categories',
      })
    })

    app.get('/featured', async (c) => {
      const db = (c.env as Record<string, unknown>).DB as D1Database
      const results = await db.prepare('SELECT * FROM apis WHERE featured = 1 ORDER BY name').all()
      return c.var.respond({
        data: results.results,
        key: 'apis',
        actions: {
          browse: { method: 'GET', href: '/apis' },
          search: { method: 'GET', href: '/apis?q=' },
        },
      })
    })

    app.get('/health', (c) => c.var.respond({ data: { status: 'ok', timestamp: new Date().toISOString() } }))
  },
})

interface D1Database {
  prepare(query: string): { all(): Promise<{ results: unknown[] }>; bind(...values: unknown[]): { all(): Promise<{ results: unknown[] }> } }
}
