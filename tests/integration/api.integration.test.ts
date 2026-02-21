import { describe, it, expect } from 'vitest'
import { SELF } from 'cloudflare:test'

/**
 * Integration tests for @dotdo/api running in real workerd runtime
 * via @cloudflare/vitest-pool-workers.
 *
 * SELF is the test worker defined in tests/test-worker.ts.
 * All requests go through full Cloudflare Worker request handling.
 */

describe('API integration (workerd)', () => {
  describe('root endpoint', () => {
    it('returns API info envelope', async () => {
      const res = await SELF.fetch('http://test.do/')
      expect(res.status).toBe(200)

      const body = (await res.json()) as Record<string, unknown>
      const api = body.api as Record<string, unknown>
      expect(api.name).toBe('test.do')
      expect(api.description).toBe('Integration test API for @dotdo/api')
      expect(api.version).toBe('0.0.1')
      // New envelope shape: no success field
      expect(body.success).toBeUndefined()
    })

    it('includes links.self pointing to the request URL', async () => {
      const res = await SELF.fetch('http://test.do/')
      const body = (await res.json()) as Record<string, unknown>
      const links = body.links as Record<string, unknown>
      expect(links.self).toBe('http://test.do/')
    })
  })

  describe('CORS', () => {
    it('returns CORS headers on preflight', async () => {
      const res = await SELF.fetch('http://test.do/', {
        method: 'OPTIONS',
        headers: { Origin: 'http://example.com' },
      })
      expect(res.headers.get('access-control-allow-origin')).toBe('*')
    })
  })

  describe('request context', () => {
    it('includes X-Request-Id header', async () => {
      const res = await SELF.fetch('http://test.do/')
      expect(res.headers.get('x-request-id')).toBeTruthy()
    })

    it('generates unique request IDs per request', async () => {
      const res1 = await SELF.fetch('http://test.do/')
      const res2 = await SELF.fetch('http://test.do/')
      const id1 = res1.headers.get('x-request-id')
      const id2 = res2.headers.get('x-request-id')
      expect(id1).not.toBe(id2)
    })
  })

  describe('custom routes', () => {
    it('GET /health returns ok', async () => {
      const res = await SELF.fetch('http://test.do/health')
      expect(res.status).toBe(200)

      const body = (await res.json()) as Record<string, unknown>
      expect((body.data as Record<string, unknown>).status).toBe('ok')
    })

    it('GET /echo reflects request details', async () => {
      const res = await SELF.fetch('http://test.do/echo?foo=bar')
      expect(res.status).toBe(200)

      const body = (await res.json()) as Record<string, unknown>
      const data = body.data as Record<string, unknown>
      expect(data.method).toBe('GET')
      expect(data.path).toBe('/echo')
      expect((data.query as Record<string, unknown>).foo).toBe('bar')
    })

    it('POST /echo returns 201 with received body', async () => {
      const res = await SELF.fetch('http://test.do/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ greeting: 'hello' }),
      })
      expect(res.status).toBe(201)

      const body = (await res.json()) as Record<string, unknown>
      const data = body.data as Record<string, unknown>
      expect((data.received as Record<string, unknown>).greeting).toBe('hello')
    })
  })

  describe('error handling', () => {
    it('GET /error returns error envelope', async () => {
      const res = await SELF.fetch('http://test.do/error')
      expect(res.status).toBe(500)

      const body = (await res.json()) as Record<string, unknown>
      expect(body.success).toBeUndefined()
      const error = body.error as Record<string, unknown>
      expect(error.code).toBe('TEST_ERROR')
      expect(error.message).toBe('Intentional test error')
    })

    it('returns 404 envelope for unknown routes', async () => {
      const res = await SELF.fetch('http://test.do/nonexistent')
      expect(res.status).toBe(404)

      const body = (await res.json()) as Record<string, unknown>
      expect(body.success).toBeUndefined()
      const error = body.error as Record<string, unknown>
      expect(error.code).toBe('NOT_FOUND')
    })
  })

  describe('response envelope features', () => {
    it('supports custom payload key', async () => {
      const res = await SELF.fetch('http://test.do/custom-key')
      expect(res.status).toBe(200)

      const body = (await res.json()) as Record<string, unknown>
      expect(body.widgets).toBeDefined()
      expect(Array.isArray(body.widgets)).toBe(true)
      expect(body.data).toBeUndefined()
    })

    it('includes custom links', async () => {
      const res = await SELF.fetch('http://test.do/with-links')
      expect(res.status).toBe(200)

      const body = (await res.json()) as Record<string, unknown>
      const links = body.links as Record<string, unknown>
      expect(links.self).toBeDefined()
      expect(links.docs).toBe('https://test.do/docs')
      expect(links.collection).toBe('https://test.do/items')
    })

    it('includes actions', async () => {
      const res = await SELF.fetch('http://test.do/with-actions')
      expect(res.status).toBe(200)

      const body = (await res.json()) as Record<string, unknown>
      const actions = body.actions as Record<string, unknown>
      expect(actions.edit).toBe('https://test.do/items/1/edit')
      expect(actions.delete).toBe('https://test.do/items/1')
    })
  })
})
