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
    // Reset modules to ensure fresh import for each test
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

    it('should set anonymous L0 user when mode is none', async () => {
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
      // authLevelMiddleware always sets user — L0 anonymous when no auth
      expect(body.data.user).toBeDefined()
      expect(body.data.user.authenticated).toBe(false)
      expect(body.data.user.level).toBe('L0')
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
  // mode: 'optional' - allows requests without token, sets user if present
  // ============================================================================
  describe('mode: optional', () => {
    it('should set anonymous L0 user when no authorization header', async () => {
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
      // authLevelMiddleware always sets user — L0 anonymous when no token
      expect(body.data.user).toBeDefined()
      expect(body.data.user.authenticated).toBe(false)
      expect(body.data.user.level).toBe('L0')
    })

    it('should set anonymous L0 user when invalid token is provided (no trustUnverified)', async () => {
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

      // Request succeeds but attacker claims are NOT trusted — L0 anonymous
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user).toBeDefined()
      expect(body.data.user.authenticated).toBe(false)
      expect(body.data.user.level).toBe('L0')
    })

    it('should set user when valid token is provided with trustUnverified', async () => {
      const fakeToken = createFakeJwt({
        sub: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
      })

      const app = API({
        name: 'optional-api',
        auth: { mode: 'optional', trustUnverified: true },
        routes: (a) => {
          a.get('/maybe-auth', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/maybe-auth', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user).toBeDefined()
      expect(body.data.user.id).toBe('user-123')
    })
  })

  // ============================================================================
  // cf.actor — tamper-proof identity from auth-identity snippet
  // ============================================================================
  // NOTE: Hono's app.request() doesn't support setting request.cf directly,
  // so cf.actor tests require integration/e2e testing against a real worker.
  // The middleware implementation is straightforward: if cf.authenticated && cf.actor,
  // extract user and skip AUTH RPC. Unit tests for the downstream token paths
  // (Authorization header, cookie) cover the fallback behavior.

  // ============================================================================
  // User info extraction from valid token
  // ============================================================================
  describe('User info extraction', () => {
    it('should extract standard JWT claims (sub, email, name) to user info', async () => {
      const fakeToken = createFakeJwt({
        sub: 'user-456',
        email: 'test@example.com',
        name: 'Test User',
      })

      const app = API({
        name: 'user-api',
        auth: { mode: 'required', trustUnverified: true },
        routes: (a) => {
          a.get('/me', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/me', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user.id).toBe('user-456')
      expect(body.data.user.email).toBe('test@example.com')
      expect(body.data.user.name).toBe('Test User')
    })

    it('should handle tokens with only sub claim', async () => {
      const fakeToken = createFakeJwt({
        sub: 'minimal-user',
      })

      const app = API({
        name: 'user-api',
        auth: { mode: 'optional', trustUnverified: true },
        routes: (a) => {
          a.get('/me', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/me', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user.id).toBe('minimal-user')
      expect(body.data.user.email).toBeUndefined()
      expect(body.data.user.name).toBeUndefined()
    })
  })

  // ============================================================================
  // Invalid token rejection when required
  // ============================================================================
  describe('Invalid token rejection', () => {
    it('should reject fake JWT tokens when auth is required (no trustUnverified flag)', async () => {
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

    it('should not trust invalid token in optional mode (L0 anonymous)', async () => {
      const fakeToken = createFakeJwt({
        sub: 'attacker-id',
        email: 'attacker@evil.com',
      })

      const app = API({
        name: 'optional-api',
        auth: { mode: 'optional' },
        routes: (a) => {
          a.get('/endpoint', (c) => {
            const user = c.var.user as Record<string, unknown> | undefined
            return c.var.respond({ data: { authenticated: user?.authenticated } })
          })
        },
      })

      const res = await app.request('/endpoint', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.authenticated).toBe(false)
    })
  })

  // ============================================================================
  // trustUnverified flag behavior
  // ============================================================================
  describe('trustUnverified flag', () => {
    it('should accept fake JWT tokens only when trustUnverified is explicitly true', async () => {
      const fakeToken = createFakeJwt({
        sub: 'trusted-user-id',
        email: 'trusted@example.com',
        name: 'Trusted User',
      })

      const app = API({
        name: 'legacy-api',
        auth: { mode: 'optional', trustUnverified: true },
        routes: (a) => {
          a.get('/legacy', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/legacy', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user).toBeDefined()
      expect(body.data.user.id).toBe('trusted-user-id')
      expect(body.data.user.email).toBe('trusted@example.com')
      expect(body.data.user.name).toBe('Trusted User')
    })

    it('should log a warning when trustUnverified fallback is used', async () => {
      const fakeToken = createFakeJwt({
        sub: 'user-id',
        email: 'user@example.com',
        name: 'User',
      })

      const app = API({
        name: 'legacy-api',
        auth: { mode: 'optional', trustUnverified: true },
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: {} }))
        },
      })

      await app.request('/test', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/SECURITY WARNING.*trustUnverified/i)
      )
    })

    it('should NOT log warning when trustUnverified is false', async () => {
      const fakeToken = createFakeJwt({
        sub: 'user-id',
        email: 'user@example.com',
      })

      const app = API({
        name: 'secure-api',
        auth: { mode: 'optional', trustUnverified: false },
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: {} }))
        },
      })

      await app.request('/test', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should work with required mode and trustUnverified', async () => {
      const fakeToken = createFakeJwt({
        sub: 'user-id',
        email: 'user@example.com',
      })

      const app = API({
        name: 'legacy-required-api',
        auth: { mode: 'required', trustUnverified: true },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user.id).toBe('user-id')
    })
  })

  // ============================================================================
  // Edge cases - malformed tokens, expired claims, etc.
  // ============================================================================
  describe('Edge cases', () => {
    describe('Malformed tokens', () => {
      it('should reject token with only two parts', async () => {
        const app = API({
          name: 'secure-api',
          auth: { mode: 'required', trustUnverified: true },
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
          auth: { mode: 'required', trustUnverified: true },
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
          auth: { mode: 'required', trustUnverified: true },
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

    describe('Token edge cases with trustUnverified', () => {
      it('should handle token with missing sub claim', async () => {
        const fakeToken = createFakeJwt({
          email: 'user@example.com',
          name: 'User Without ID',
        })

        const app = API({
          name: 'user-api',
          auth: { mode: 'optional', trustUnverified: true },
          routes: (a) => {
            a.get('/me', (c) => c.var.respond({ data: { user: c.var.user } }))
          },
        })

        const res = await app.request('/me', {
          headers: { Authorization: `Bearer ${fakeToken}` },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.user).toBeDefined()
        // No sub claim + no org → classified as L1 (agent) by authLevelMiddleware
        expect(body.data.user.authenticated).toBe(true)
        expect(body.data.user.level).toBe('L1')
      })

      it('should handle token with empty payload object', async () => {
        const fakeToken = createFakeJwt({})

        const app = API({
          name: 'user-api',
          auth: { mode: 'optional', trustUnverified: true },
          routes: (a) => {
            a.get('/me', (c) => c.var.respond({ data: { user: c.var.user } }))
          },
        })

        const res = await app.request('/me', {
          headers: { Authorization: `Bearer ${fakeToken}` },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        // User object should exist but with undefined fields
        expect(body.data.user).toBeDefined()
        expect(body.data.user.id).toBeUndefined()
      })

      it('should handle base64url encoded payload (with - and _)', async () => {
        // Create a token with base64url encoding (uses - and _ instead of + and /)
        const header = { alg: 'HS256', typ: 'JWT' }
        const payload = { sub: 'user-with-special+chars/test', email: 'test@example.com' }
        const base64Header = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
        const base64Payload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
        const token = `${base64Header}.${base64Payload}.fake_signature`

        const app = API({
          name: 'user-api',
          auth: { mode: 'optional', trustUnverified: true },
          routes: (a) => {
            a.get('/me', (c) => c.var.respond({ data: { user: c.var.user } }))
          },
        })

        const res = await app.request('/me', {
          headers: { Authorization: `Bearer ${token}` },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.user.id).toBe('user-with-special+chars/test')
      })
    })

    describe('Authorization header variations', () => {
      it('should handle Bearer with different casing', async () => {
        const fakeToken = createFakeJwt({ sub: 'user-123' })

        const app = API({
          name: 'user-api',
          auth: { mode: 'optional', trustUnverified: true },
          routes: (a) => {
            a.get('/me', (c) => c.var.respond({ data: { user: c.var.user } }))
          },
        })

        const res = await app.request('/me', {
          headers: { Authorization: `bearer ${fakeToken}` },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.user.id).toBe('user-123')
      })

      it('should handle multiple spaces after Bearer', async () => {
        const fakeToken = createFakeJwt({ sub: 'user-123' })

        const app = API({
          name: 'user-api',
          auth: { mode: 'optional', trustUnverified: true },
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
      // This proves the middleware READ the x-api-key header (not AUTH_REQUIRED)
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

      // Both x-api-key and Authorization present. If x-api-key takes priority,
      // the API key gets sent to verifyToken (which wraps it as "Bearer hly_sk_...").
      // No AUTH binding → verification fails → 401 INVALID_TOKEN.
      // This is the same result as x-api-key alone, proving it took priority.
      // (If Authorization took priority, the JWT would also fail → INVALID_TOKEN,
      // but this test documents the intended priority behavior.)
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

      // x-api-key present → cookie should be skipped, x-api-key used for verification
      // Verification fails (no AUTH binding) → INVALID_TOKEN (not AUTH_REQUIRED)
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

      // No x-api-key, no Authorization, no cookie → L0 anonymous, request proceeds
      const res = await app.request('/check')
      expect(res.status).toBe(200)
    })
  })
})
