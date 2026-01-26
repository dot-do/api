import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { API } from '../../src/index'
import { createMockRateLimiter } from '../mocks/rateLimiter'

describe('Rate Limit Middleware', () => {
  let originalConsoleWarn: typeof console.warn

  beforeEach(() => {
    originalConsoleWarn = console.warn
    console.warn = vi.fn()
    vi.resetModules()
  })

  afterEach(() => {
    console.warn = originalConsoleWarn
  })

  // ============================================================================
  // Basic rate limiting behavior
  // ============================================================================
  describe('Basic rate limiting', () => {
    it('should pass through when binding exists and limit not exceeded', async () => {
      const mockRateLimiter = createMockRateLimiter()

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.message).toBe('success')
      expect(mockRateLimiter.limit).toHaveBeenCalledTimes(1)
    })

    it('should return 429 when rate limit exceeded', async () => {
      const mockRateLimiter = createMockRateLimiter({ shouldLimit: true })

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('RATE_LIMITED')
      expect(body.error.message).toBe('Rate limit exceeded')
      expect(body.error.status).toBe(429)
    })

    it('should silently pass through when binding does not exist', async () => {
      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      // No RATE_LIMITER binding provided in env
      const res = await app.request('/endpoint', {}, {})

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.message).toBe('success')
    })
  })

  // ============================================================================
  // Key derivation
  // ============================================================================
  describe('Key derivation', () => {
    it('should use user ID when authenticated', async () => {
      const limitCalls: Array<{ key: string }> = []
      const mockRateLimiter = createMockRateLimiter({ limitCalls })

      const app = API({
        name: 'rate-limited-api',
        auth: { mode: 'optional', trustUnverified: true },
        rateLimit: { binding: 'RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      // Create a fake JWT with user ID
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'user-123', email: 'test@example.com' }
      const fakeToken = `${btoa(JSON.stringify(header)).replace(/=/g, '')}.${btoa(JSON.stringify(payload)).replace(/=/g, '')}.fake_signature`

      const res = await app.request(
        '/endpoint',
        { headers: { Authorization: `Bearer ${fakeToken}` } },
        { RATE_LIMITER: mockRateLimiter }
      )

      expect(res.status).toBe(200)
      expect(limitCalls).toHaveLength(1)
      expect(limitCalls[0].key).toBe('user-123')
    })

    it('should use CF-Connecting-IP when not authenticated', async () => {
      const limitCalls: Array<{ key: string }> = []
      const mockRateLimiter = createMockRateLimiter({ limitCalls })

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      const res = await app.request(
        '/endpoint',
        { headers: { 'cf-connecting-ip': '192.168.1.100' } },
        { RATE_LIMITER: mockRateLimiter }
      )

      expect(res.status).toBe(200)
      expect(limitCalls).toHaveLength(1)
      expect(limitCalls[0].key).toBe('192.168.1.100')
    })

    it('should fall back to "anonymous" when no IP header', async () => {
      const limitCalls: Array<{ key: string }> = []
      const mockRateLimiter = createMockRateLimiter({ limitCalls })

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      // No CF-Connecting-IP header, no auth
      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(200)
      expect(limitCalls).toHaveLength(1)
      expect(limitCalls[0].key).toBe('anonymous')
    })

    it('should prefer user ID over IP when both are available', async () => {
      const limitCalls: Array<{ key: string }> = []
      const mockRateLimiter = createMockRateLimiter({ limitCalls })

      const app = API({
        name: 'rate-limited-api',
        auth: { mode: 'optional', trustUnverified: true },
        rateLimit: { binding: 'RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      // Create a fake JWT with user ID
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'user-456' }
      const fakeToken = `${btoa(JSON.stringify(header)).replace(/=/g, '')}.${btoa(JSON.stringify(payload)).replace(/=/g, '')}.fake_signature`

      const res = await app.request(
        '/endpoint',
        {
          headers: {
            Authorization: `Bearer ${fakeToken}`,
            'cf-connecting-ip': '10.0.0.1',
          },
        },
        { RATE_LIMITER: mockRateLimiter }
      )

      expect(res.status).toBe(200)
      expect(limitCalls).toHaveLength(1)
      // User ID should take precedence over IP
      expect(limitCalls[0].key).toBe('user-456')
    })
  })

  // ============================================================================
  // Binding configuration
  // ============================================================================
  describe('Binding configuration', () => {
    it('should use configured binding name to look up rate limiter', async () => {
      const mockRateLimiter = createMockRateLimiter()

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'CUSTOM_RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      // Use custom binding name
      const res = await app.request('/endpoint', {}, { CUSTOM_RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(200)
      expect(mockRateLimiter.limit).toHaveBeenCalledTimes(1)
    })

    it('should not rate limit when wrong binding name is used', async () => {
      const mockRateLimiter = createMockRateLimiter({ shouldLimit: true }) // Would block if used

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      // Provide binding under different name
      const res = await app.request('/endpoint', {}, { WRONG_BINDING: mockRateLimiter })

      // Should pass through because RATE_LIMITER binding is not found
      expect(res.status).toBe(200)
      expect(mockRateLimiter.limit).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Standard rate limit headers (RFC 6585 and common conventions)
  // ============================================================================
  describe('Rate limit headers', () => {
    it('should include X-RateLimit-Limit header with the configured limit', async () => {
      const mockRateLimiter = createMockRateLimiter()

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER', limit: 100 },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Limit')).toBe('100')
    })

    it('should include X-RateLimit-Remaining header with remaining requests', async () => {
      const mockRateLimiter = createMockRateLimiter({
        customHandler: async () => ({ success: true, remaining: 42 }),
      })

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER', limit: 100 },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('42')
    })

    it('should include X-RateLimit-Reset header with Unix timestamp', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 60 // 60 seconds from now
      const mockRateLimiter = createMockRateLimiter({
        customHandler: async () => ({ success: true, remaining: 50, reset: resetTime }),
      })

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER', limit: 100 },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Reset')).toBe(String(resetTime))
    })

    it('should include Retry-After header on 429 responses', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 30 // 30 seconds from now
      const mockRateLimiter = createMockRateLimiter({
        customHandler: async () => ({ success: false, remaining: 0, reset: resetTime }),
      })

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER', limit: 100 },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(429)
      // Retry-After should be in seconds (difference between reset time and now)
      const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10)
      expect(retryAfter).toBeGreaterThan(0)
      expect(retryAfter).toBeLessThanOrEqual(30)
    })

    it('should include all rate limit headers on successful responses', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 60
      const mockRateLimiter = createMockRateLimiter({
        customHandler: async () => ({ success: true, remaining: 99, reset: resetTime }),
      })

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER', limit: 100 },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('99')
      expect(res.headers.get('X-RateLimit-Reset')).toBe(String(resetTime))
      // Retry-After should NOT be present on successful responses
      expect(res.headers.get('Retry-After')).toBeNull()
    })

    it('should include all rate limit headers on 429 responses', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 60
      const mockRateLimiter = createMockRateLimiter({
        customHandler: async () => ({ success: false, remaining: 0, reset: resetTime }),
      })

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER', limit: 100 },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(429)
      expect(res.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(res.headers.get('X-RateLimit-Reset')).toBe(String(resetTime))
      expect(res.headers.get('Retry-After')).toBeDefined()
    })

    it('should use default limit when not configured', async () => {
      const mockRateLimiter = createMockRateLimiter()

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER' }, // No limit specified
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(200)
      // Should have a default limit header
      expect(res.headers.get('X-RateLimit-Limit')).toBeDefined()
    })
  })

  // ============================================================================
  // Edge cases
  // ============================================================================
  describe('Edge cases', () => {
    it('should handle multiple requests with different rate limit results', async () => {
      let callCount = 0
      const mockRateLimiter = createMockRateLimiter({
        customHandler: async () => {
          callCount++
          // Allow first request, block second
          return { success: callCount === 1 }
        },
      })

      const app = API({
        name: 'rate-limited-api',
        rateLimit: { binding: 'RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { message: 'success' } }))
        },
      })

      // First request should succeed
      const res1 = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })
      expect(res1.status).toBe(200)

      // Second request should be rate limited
      const res2 = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })
      expect(res2.status).toBe(429)
    })

    it('should not interfere with other middleware', async () => {
      const mockRateLimiter = createMockRateLimiter()

      const app = API({
        name: 'rate-limited-api',
        auth: { mode: 'none' },
        rateLimit: { binding: 'RATE_LIMITER' },
        routes: (a) => {
          a.get('/endpoint', (c) =>
            c.var.respond({
              data: {
                requestId: c.var.requestId,
                message: 'success',
              },
            })
          )
        },
      })

      const res = await app.request('/endpoint', {}, { RATE_LIMITER: mockRateLimiter })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.message).toBe('success')
      expect(body.data.requestId).toBeDefined()
    })
  })
})
