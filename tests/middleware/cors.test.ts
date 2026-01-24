import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { corsMiddleware } from '../../src/middleware/cors'

describe('CORS Middleware', () => {
  // ============================================================================
  // RED Phase Tests
  // ============================================================================

  // Test 1: Default origin returns `*`
  describe('default origin', () => {
    it('should return * as default Access-Control-Allow-Origin', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  // Test 2: Custom origin from config is used
  describe('custom origin', () => {
    it('should use custom origin string from config', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware({ origin: 'https://example.com' }))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: { Origin: 'https://example.com' },
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
    })

    it('should support multiple origins as array', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware({ origin: ['https://example.com', 'https://other.com'] }))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: { Origin: 'https://other.com' },
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://other.com')
    })

    it('should support origin as a function', async () => {
      const app = new Hono()
      app.use(
        '*',
        corsMiddleware({
          origin: (origin) => (origin.endsWith('.example.com') ? origin : null),
        })
      )
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: { Origin: 'https://app.example.com' },
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com')
    })
  })

  // Test 3: Allowed methods header is set
  describe('allowed methods', () => {
    it('should set default allowed methods', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware())
      app.options('/test', (c) => c.text(''))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      })

      const allowMethods = res.headers.get('Access-Control-Allow-Methods')
      expect(allowMethods).toContain('GET')
      expect(allowMethods).toContain('POST')
      expect(allowMethods).toContain('PUT')
      expect(allowMethods).toContain('PATCH')
      expect(allowMethods).toContain('DELETE')
      expect(allowMethods).toContain('OPTIONS')
    })

    it('should use custom allowed methods from config', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware({ allowMethods: ['GET', 'POST'] }))
      app.options('/test', (c) => c.text(''))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      })

      const allowMethods = res.headers.get('Access-Control-Allow-Methods')
      expect(allowMethods).toContain('GET')
      expect(allowMethods).toContain('POST')
      expect(allowMethods).not.toContain('DELETE')
    })
  })

  // Test 4: Allowed headers include common headers
  describe('allowed headers', () => {
    it('should include common headers by default', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware())
      app.options('/test', (c) => c.text(''))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      })

      const allowHeaders = res.headers.get('Access-Control-Allow-Headers')
      expect(allowHeaders).toContain('Content-Type')
      expect(allowHeaders).toContain('Authorization')
      expect(allowHeaders).toContain('X-Request-Id')
    })

    it('should use custom allowed headers from config', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware({ allowHeaders: ['X-Custom-Header', 'X-API-Key'] }))
      app.options('/test', (c) => c.text(''))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'X-Custom-Header',
        },
      })

      const allowHeaders = res.headers.get('Access-Control-Allow-Headers')
      expect(allowHeaders).toContain('X-Custom-Header')
      expect(allowHeaders).toContain('X-API-Key')
    })
  })

  // Test 5: Preflight OPTIONS request returns 204
  describe('preflight OPTIONS request', () => {
    it('should return 204 for preflight OPTIONS request', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      })

      expect(res.status).toBe(204)
    })

    it('should include max-age header for preflight caching', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      })

      expect(res.headers.get('Access-Control-Max-Age')).toBe('86400')
    })

    it('should use custom max-age from config', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware({ maxAge: 3600 }))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      })

      expect(res.headers.get('Access-Control-Max-Age')).toBe('3600')
    })
  })

  // Test 6: Credentials header handling
  describe('credentials header', () => {
    it('should not include credentials header by default', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: { Origin: 'https://example.com' },
      })

      expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    })

    it('should include credentials header when enabled', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware({ credentials: true }))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: { Origin: 'https://example.com' },
      })

      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should not include credentials header when explicitly disabled', async () => {
      const app = new Hono()
      app.use('*', corsMiddleware({ credentials: false }))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: { Origin: 'https://example.com' },
      })

      expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    })
  })

  // ============================================================================
  // REFACTOR Phase - Edge Cases
  // ============================================================================
  describe('edge cases', () => {
    describe('null origin', () => {
      it('should handle null origin header gracefully', async () => {
        const app = new Hono()
        app.use('*', corsMiddleware())
        app.get('/test', (c) => c.json({ ok: true }))

        const res = await app.request('/test', {
          headers: { Origin: 'null' },
        })

        expect(res.status).toBe(200)
        // With default '*' origin, should still work
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
      })

      it('should handle missing origin header', async () => {
        const app = new Hono()
        app.use('*', corsMiddleware())
        app.get('/test', (c) => c.json({ ok: true }))

        const res = await app.request('/test')

        expect(res.status).toBe(200)
        // No origin header means same-origin request, CORS headers may still be set
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
      })
    })

    describe('invalid origin format', () => {
      it('should handle origin with unusual port', async () => {
        const app = new Hono()
        app.use(
          '*',
          corsMiddleware({
            origin: ['https://example.com:8080', 'http://localhost:3000'],
          })
        )
        app.get('/test', (c) => c.json({ ok: true }))

        const res = await app.request('/test', {
          headers: { Origin: 'https://example.com:8080' },
        })

        expect(res.status).toBe(200)
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com:8080')
      })

      it('should handle origin with IP address', async () => {
        const app = new Hono()
        app.use('*', corsMiddleware({ origin: ['http://192.168.1.1:3000'] }))
        app.get('/test', (c) => c.json({ ok: true }))

        const res = await app.request('/test', {
          headers: { Origin: 'http://192.168.1.1:3000' },
        })

        expect(res.status).toBe(200)
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://192.168.1.1:3000')
      })

      it('should reject non-matching origin when specific origins are configured', async () => {
        const app = new Hono()
        app.use('*', corsMiddleware({ origin: ['https://allowed.com'] }))
        app.get('/test', (c) => c.json({ ok: true }))

        const res = await app.request('/test', {
          headers: { Origin: 'https://evil.com' },
        })

        expect(res.status).toBe(200)
        // Origin header should not reflect the evil origin
        expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('https://evil.com')
      })

      it('should handle origin function returning null for invalid origin', async () => {
        const app = new Hono()
        app.use(
          '*',
          corsMiddleware({
            origin: (origin) => {
              if (origin.startsWith('https://')) {
                return origin
              }
              return null
            },
          })
        )
        app.get('/test', (c) => c.json({ ok: true }))

        const res = await app.request('/test', {
          headers: { Origin: 'http://insecure.com' },
        })

        expect(res.status).toBe(200)
        // Should not allow the insecure origin
        expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('http://insecure.com')
      })
    })

    describe('expose headers', () => {
      it('should set default expose headers', async () => {
        const app = new Hono()
        app.use('*', corsMiddleware())
        app.get('/test', (c) => c.json({ ok: true }))

        const res = await app.request('/test', {
          headers: { Origin: 'https://example.com' },
        })

        const exposeHeaders = res.headers.get('Access-Control-Expose-Headers')
        expect(exposeHeaders).toContain('X-Request-Id')
        expect(exposeHeaders).toContain('X-Total-Count')
      })

      it('should use custom expose headers from config', async () => {
        const app = new Hono()
        app.use('*', corsMiddleware({ exposeHeaders: ['X-Custom-Response'] }))
        app.get('/test', (c) => c.json({ ok: true }))

        const res = await app.request('/test', {
          headers: { Origin: 'https://example.com' },
        })

        const exposeHeaders = res.headers.get('Access-Control-Expose-Headers')
        expect(exposeHeaders).toContain('X-Custom-Response')
      })
    })

    describe('real-world scenarios', () => {
      it('should handle cross-origin POST request', async () => {
        const app = new Hono()
        app.use('*', corsMiddleware({ origin: 'https://frontend.com', credentials: true }))
        app.post('/api/data', (c) => c.json({ created: true }))

        const res = await app.request('/api/data', {
          method: 'POST',
          headers: {
            Origin: 'https://frontend.com',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key: 'value' }),
        })

        expect(res.status).toBe(200)
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://frontend.com')
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
      })

      it('should handle preflight for DELETE request', async () => {
        const app = new Hono()
        app.use('*', corsMiddleware())
        app.delete('/api/resource/:id', (c) => c.json({ deleted: true }))

        const res = await app.request('/api/resource/123', {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://example.com',
            'Access-Control-Request-Method': 'DELETE',
          },
        })

        expect(res.status).toBe(204)
        expect(res.headers.get('Access-Control-Allow-Methods')).toContain('DELETE')
      })
    })
  })
})
