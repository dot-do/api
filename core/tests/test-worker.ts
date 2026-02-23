import { API } from '../src'
import { DatabaseDO } from '../src/conventions/database/do'

// Re-export DatabaseDO so wrangler can find it
export { DatabaseDO }

/**
 * Test worker that exercises API() with all major conventions enabled.
 * Used by @cloudflare/vitest-pool-workers integration tests.
 */
export default API({
  name: 'test.do',
  description: 'Integration test API for @dotdo/api',
  version: '0.0.1',

  // Auth in optional mode — integration tests can test both authed/unauthed
  auth: { mode: 'optional' },

  // Custom routes for integration-level assertions
  routes: (app) => {
    app.get('/health', (c) => c.var.respond({ data: { status: 'ok' } }))

    app.get('/echo', (c) => {
      const url = new URL(c.req.url)
      return c.var.respond({
        data: {
          method: c.req.method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
          headers: Object.fromEntries(c.req.raw.headers),
        },
      })
    })

    app.post('/echo', async (c) => {
      const body = await c.req.json()
      return c.var.respond({ data: { received: body }, status: 201 })
    })

    app.get('/error', (c) => {
      return c.var.respond({
        error: { message: 'Intentional test error', code: 'TEST_ERROR', status: 500 },
        status: 500,
      })
    })

    app.get('/custom-key', (c) => {
      return c.var.respond({
        data: [{ id: 1, name: 'Widget' }],
        key: 'widgets',
        total: 1,
        limit: 25,
        page: 1,
      })
    })

    app.get('/with-links', (c) => {
      return c.var.respond({
        data: { id: 1 },
        links: {
          docs: 'https://test.do/docs',
          collection: 'https://test.do/items',
        },
      })
    })

    app.get('/with-actions', (c) => {
      return c.var.respond({
        data: { id: 1 },
        actions: {
          edit: 'https://test.do/items/1/edit',
          delete: 'https://test.do/items/1',
        },
      })
    })
  },
})
