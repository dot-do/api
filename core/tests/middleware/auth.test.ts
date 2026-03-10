import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { API } from '../../src/index'

/**
 * Helper to create a fake JWT token with arbitrary claims but NO valid signature.
 * This simulates an attacker crafting a token without the secret key.
 */
function createFakeJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const base64Header = btoa(JSON.stringify(header)).replace(/=/g, '')
  const base64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '')
  // Fake signature - not cryptographically valid
  const fakeSignature = 'fake_signature_that_should_not_be_trusted'
  return `${base64Header}.${base64Payload}.${fakeSignature}`
}

/**
 * Helper to create a malformed JWT-like string for edge case testing.
 */
function createMalformedJwt(type: 'missing-parts' | 'invalid-base64' | 'invalid-json' | 'empty'): string {
  switch (type) {
    case 'missing-parts':
      return 'only.two'
    case 'invalid-base64':
      return 'not!!!valid!!!base64.also!!!invalid.signature'
    case 'invalid-json':
      // Valid base64 but not valid JSON when decoded
      return `${btoa('valid-header')}.${btoa('not-json{{{')}.signature`
    case 'empty':
      return ''
  }
}

describe('Auth Middleware', () => {
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
  // mode: 'none' - allows all requests without token
  // ============================================================================
  describe('mode: none', () => {
    it('should allow requests without any authorization', async () => {
      const app = API({
        name: 'public-api',
        auth: { mode: 'none' },
        routes: (a) => {
          a.get('/public', (c) => c.var.respond({ data: { message: 'public' } }))
        },
      })

      const res = await app.request('/public')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.message).toBe('public')
    })

    it('should allow requests even with an authorization header present', async () => {
      const app = API({
        name: 'public-api',
        auth: { mode: 'none' },
        routes: (a) => {
          a.get('/public', (c) => c.var.respond({ data: { message: 'public' } }))
        },
      })

      const fakeToken = createFakeJwt({ sub: 'user-123' })
      const res = await app.request('/public', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })
      expect(res.status).toBe(200)
    })

    it('should report unauthenticated when mode is none', async () => {
      const app = API({
        name: 'public-api',
        auth: { mode: 'none' },
        routes: (a) => {
          a.get('/check-user', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/check-user')
      expect(res.status).toBe(200)
      const body = await res.json()
      // authLevelMiddleware sets an L0 user context (authenticated: false)
      expect(body.data.user.authenticated).toBe(false)
    })

    it('should default to mode none when auth config is not provided', async () => {
      const app = API({
        name: 'default-api',
        routes: (a) => {
          a.get('/public', (c) => c.var.respond({ data: { message: 'ok' } }))
        },
      })

      const res = await app.request('/public')
      expect(res.status).toBe(200)
    })
  })

  // ============================================================================
  // mode: 'required' - blocks requests without token (401)
  // ============================================================================
  describe('mode: required', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const app = API({
        name: 'secure-api',
        auth: { mode: 'required' },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: {} }))
        },
      })

      const res = await app.request('/protected')
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('AUTH_REQUIRED')
      expect(body.error.message).toBe('Authentication required')
    })

    it('should return 401 with INVALID_TOKEN when token cannot be verified', async () => {
      const fakeToken = createFakeJwt({
        sub: 'attacker-id',
        email: 'attacker@evil.com',
        name: 'Malicious User',
      })

      const app = API({
        name: 'secure-api',
        auth: { mode: 'required' },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('INVALID_TOKEN')
    })

    it('should reject requests with empty Bearer token', async () => {
      const app = API({
        name: 'secure-api',
        auth: { mode: 'required' },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: {} }))
        },
      })

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer ' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject requests with malformed authorization header', async () => {
      const app = API({
        name: 'secure-api',
        auth: { mode: 'required' },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: {} }))
        },
      })

      const res = await app.request('/protected', {
        headers: { Authorization: 'not-a-bearer-token' },
      })

      expect(res.status).toBe(401)
    })
  })

  // ============================================================================
  // mode: 'optional' - allows requests, user.authenticated indicates auth status
  // ============================================================================
  describe('mode: optional', () => {
    it('should allow requests without authorization and report unauthenticated', async () => {
      const app = API({
        name: 'optional-api',
        auth: { mode: 'optional' },
        routes: (a) => {
          a.get('/maybe-auth', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/maybe-auth')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user.authenticated).toBe(false)
    })

    it('should NOT authenticate when invalid token is provided', async () => {
      const fakeToken = createFakeJwt({
        sub: 'attacker-id',
        email: 'attacker@evil.com',
        name: 'Malicious User',
      })

      const app = API({
        name: 'optional-api',
        auth: { mode: 'optional' },
        routes: (a) => {
          a.get('/maybe-auth', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/maybe-auth', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      // Fake JWT should NOT be trusted — user should be unauthenticated
      expect(body.data.user.authenticated).toBe(false)
    })
  })

  // ============================================================================
  // cf.actor — tamper-proof identity from auth-identity snippet
  // ============================================================================
  // NOTE: Hono's app.request() doesn't support setting request.cf directly,
  // so cf.actor tests require integration/e2e testing against a real worker.

  // ============================================================================
  // Invalid token rejection — no unverified fallback
  // ============================================================================
  describe('Invalid token rejection', () => {
    it('should always reject fake JWT tokens when auth is required', async () => {
      const fakeToken = createFakeJwt({
        sub: 'attacker-id',
        email: 'attacker@evil.com',
        name: 'Malicious User',
      })

      const app = API({
        name: 'secure-api',
        auth: { mode: 'required' },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('INVALID_TOKEN')
    })

    it('should report unauthenticated for invalid token in optional mode', async () => {
      const fakeToken = createFakeJwt({
        sub: 'attacker-id',
        email: 'attacker@evil.com',
      })

      const app = API({
        name: 'optional-api',
        auth: { mode: 'optional' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/endpoint', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user.authenticated).toBe(false)
    })

    it('should reject fake JWT even with well-formed claims', async () => {
      const fakeToken = createFakeJwt({
        sub: 'trusted-user-id',
        email: 'trusted@example.com',
        name: 'Trusted User',
      })

      const app = API({
        name: 'secure-api',
        auth: { mode: 'required' },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(401)
    })
  })

  // ============================================================================
  // Edge cases - malformed tokens, etc.
  // ============================================================================
  describe('Edge cases', () => {
    describe('Malformed tokens', () => {
      it('should reject token with only two parts', async () => {
        const app = API({
          name: 'secure-api',
          auth: { mode: 'required' },
          routes: (a) => {
            a.get('/protected', (c) => c.var.respond({ data: {} }))
          },
        })

        const res = await app.request('/protected', {
          headers: { Authorization: `Bearer ${createMalformedJwt('missing-parts')}` },
        })

        expect(res.status).toBe(401)
      })

      it('should reject empty token', async () => {
        const app = API({
          name: 'secure-api',
          auth: { mode: 'required' },
          routes: (a) => {
            a.get('/protected', (c) => c.var.respond({ data: {} }))
          },
        })

        const res = await app.request('/protected', {
          headers: { Authorization: `Bearer ${createMalformedJwt('empty')}` },
        })

        expect(res.status).toBe(401)
      })

      it('should reject token with invalid base64', async () => {
        const app = API({
          name: 'secure-api',
          auth: { mode: 'required' },
          routes: (a) => {
            a.get('/protected', (c) => c.var.respond({ data: {} }))
          },
        })

        const res = await app.request('/protected', {
          headers: { Authorization: `Bearer ${createMalformedJwt('invalid-base64')}` },
        })

        expect(res.status).toBe(401)
      })

      it('should reject token with invalid JSON payload', async () => {
        const app = API({
          name: 'secure-api',
          auth: { mode: 'required' },
          routes: (a) => {
            a.get('/protected', (c) => c.var.respond({ data: {} }))
          },
        })

        const res = await app.request('/protected', {
          headers: { Authorization: `Bearer ${createMalformedJwt('invalid-json')}` },
        })

        expect(res.status).toBe(401)
      })

      it('should handle token with random string gracefully', async () => {
        const app = API({
          name: 'secure-api',
          auth: { mode: 'required' },
          routes: (a) => {
            a.get('/protected', (c) => c.var.respond({ data: {} }))
          },
        })

        const res = await app.request('/protected', {
          headers: { Authorization: 'Bearer completely-random-string-not-jwt' },
        })

        expect(res.status).toBe(401)
      })
    })

    describe('Token edge cases in optional mode', () => {
      it('should not authenticate with token missing sub claim', async () => {
        const fakeToken = createFakeJwt({
          email: 'user@example.com',
          name: 'User Without ID',
        })

        const app = API({
          name: 'user-api',
          auth: { mode: 'optional' },
          routes: (a) => {
            a.get('/me', (c) => c.var.respond({ data: { user: c.var.user } }))
          },
        })

        const res = await app.request('/me', {
          headers: { Authorization: `Bearer ${fakeToken}` },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.user.authenticated).toBe(false)
      })

      it('should not authenticate with empty payload token', async () => {
        const fakeToken = createFakeJwt({})

        const app = API({
          name: 'user-api',
          auth: { mode: 'optional' },
          routes: (a) => {
            a.get('/me', (c) => c.var.respond({ data: { user: c.var.user } }))
          },
        })

        const res = await app.request('/me', {
          headers: { Authorization: `Bearer ${fakeToken}` },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.user.authenticated).toBe(false)
      })
    })

    describe('Authorization header variations', () => {
      it('should attempt verification with lowercase bearer', async () => {
        const fakeToken = createFakeJwt({ sub: 'user-123' })

        const app = API({
          name: 'user-api',
          auth: { mode: 'optional' },
          routes: (a) => {
            a.get('/me', (c) => c.var.respond({ data: { user: c.var.user } }))
          },
        })

        const res = await app.request('/me', {
          headers: { Authorization: `bearer ${fakeToken}` },
        })

        // Passes through (optional mode) but unauthenticated (no AUTH binding)
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.user.authenticated).toBe(false)
      })

      it('should handle multiple spaces after Bearer', async () => {
        const fakeToken = createFakeJwt({ sub: 'user-123' })

        const app = API({
          name: 'user-api',
          auth: { mode: 'optional' },
          routes: (a) => {
            a.get('/me', (c) => c.var.respond({ data: { user: c.var.user } }))
          },
        })

        const res = await app.request('/me', {
          headers: { Authorization: `Bearer   ${fakeToken}` },
        })

        expect(res.status).toBe(200)
      })
    })
  })

  // ============================================================================
  // x-api-key header support
  // ============================================================================
  describe('x-api-key header support', () => {
    it('should read x-api-key header and attempt verification', async () => {
      const app = API({
        name: 'apikey-api',
        auth: { mode: 'required' },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      // No AUTH binding in test env, so verification fails → 401 INVALID_TOKEN
      const res = await app.request('/protected', {
        headers: { 'x-api-key': 'hly_sk_test_fake_key_12345' },
      })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_TOKEN')
    })

    it('should prioritize x-api-key over Authorization header when both present', async () => {
      const fakeToken = createFakeJwt({
        sub: 'jwt-user',
        email: 'jwt@example.com',
        name: 'JWT User',
      })

      const app = API({
        name: 'apikey-api',
        auth: { mode: 'required' },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/protected', {
        headers: {
          'x-api-key': 'hly_sk_test_fake_key_12345',
          Authorization: `Bearer ${fakeToken}`,
        },
      })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_TOKEN')
    })

    it('should skip cookie when x-api-key is present', async () => {
      const app = API({
        name: 'apikey-api',
        auth: { mode: 'required' },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/protected', {
        headers: {
          'x-api-key': 'hly_sk_test_fake_key_12345',
          Cookie: 'auth_token=some_cookie_value',
        },
      })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_TOKEN')
    })

    it('should allow unauthenticated requests when x-api-key absent and mode is optional', async () => {
      const app = API({
        name: 'apikey-api',
        auth: { mode: 'optional' },
        routes: (a) => {
          a.get('/check', (c) => c.var.respond({ data: { message: 'ok' } }))
        },
      })

      const res = await app.request('/check')
      expect(res.status).toBe(200)
    })
  })
})
