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

    it('should not set user info when mode is none', async () => {
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
      expect(body.data.user).toBeUndefined()
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
    it('should allow requests without authorization header', async () => {
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
      expect(body.data.user).toBeUndefined()
    })

    it('should NOT set user when invalid token is provided', async () => {
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

      // Request should succeed but user should not be set
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user).toBeUndefined()
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
  // Snippet trust headers (X-Snippet-*) when trustSnippets: true
  // ============================================================================
  describe('trustSnippets: true', () => {
    it('should accept pre-verified auth from snippet headers', async () => {
      const app = API({
        name: 'snippet-api',
        auth: { mode: 'required', trustSnippets: true },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/protected', {
        headers: {
          'x-snippet-auth-valid': 'true',
          'x-snippet-user-id': 'cdn-user-123',
          'x-snippet-user-email': 'cdn@example.com',
          'x-snippet-user-name': 'CDN Verified User',
        },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user).toBeDefined()
      expect(body.data.user.id).toBe('cdn-user-123')
      expect(body.data.user.email).toBe('cdn@example.com')
      expect(body.data.user.name).toBe('CDN Verified User')
    })

    it('should reject when x-snippet-auth-valid is not "true"', async () => {
      const app = API({
        name: 'snippet-api',
        auth: { mode: 'required', trustSnippets: true },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: {} }))
        },
      })

      const res = await app.request('/protected', {
        headers: {
          'x-snippet-auth-valid': 'false',
          'x-snippet-user-id': 'cdn-user-123',
        },
      })

      expect(res.status).toBe(401)
    })

    it('should not trust snippet headers when trustSnippets is false', async () => {
      const app = API({
        name: 'secure-api',
        auth: { mode: 'required', trustSnippets: false },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: {} }))
        },
      })

      const res = await app.request('/protected', {
        headers: {
          'x-snippet-auth-valid': 'true',
          'x-snippet-user-id': 'cdn-user-123',
        },
      })

      // Should reject because trustSnippets is false
      expect(res.status).toBe(401)
    })

    it('should not trust snippet headers by default', async () => {
      const app = API({
        name: 'secure-api',
        auth: { mode: 'required' },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: {} }))
        },
      })

      const res = await app.request('/protected', {
        headers: {
          'x-snippet-auth-valid': 'true',
          'x-snippet-user-id': 'cdn-user-123',
        },
      })

      // Should reject because trustSnippets defaults to undefined/false
      expect(res.status).toBe(401)
    })

    it('should handle partial snippet user info', async () => {
      const app = API({
        name: 'snippet-api',
        auth: { mode: 'required', trustSnippets: true },
        routes: (a) => {
          a.get('/protected', (c) => c.var.respond({ data: { user: c.var.user } }))
        },
      })

      const res = await app.request('/protected', {
        headers: {
          'x-snippet-auth-valid': 'true',
          'x-snippet-user-id': 'user-only-id',
          // No email or name provided
        },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user.id).toBe('user-only-id')
      expect(body.data.user.email).toBeUndefined()
      expect(body.data.user.name).toBeUndefined()
    })
  })

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

    it('should silently ignore invalid token in optional mode', async () => {
      const fakeToken = createFakeJwt({
        sub: 'attacker-id',
        email: 'attacker@evil.com',
      })

      const app = API({
        name: 'optional-api',
        auth: { mode: 'optional' },
        routes: (a) => {
          a.get('/endpoint', (c) => c.var.respond({ data: { hasUser: !!c.var.user } }))
        },
      })

      const res = await app.request('/endpoint', {
        headers: { Authorization: `Bearer ${fakeToken}` },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.hasUser).toBe(false)
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
        expect(body.data.user.id).toBeUndefined()
        expect(body.data.user.email).toBe('user@example.com')
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

    describe('Snippet and token priority', () => {
      it('should prefer snippet headers over token when both are present', async () => {
        const fakeToken = createFakeJwt({
          sub: 'token-user',
          email: 'token@example.com',
        })

        const app = API({
          name: 'snippet-api',
          auth: { mode: 'required', trustSnippets: true, trustUnverified: true },
          routes: (a) => {
            a.get('/check', (c) => c.var.respond({ data: { user: c.var.user } }))
          },
        })

        const res = await app.request('/check', {
          headers: {
            'Authorization': `Bearer ${fakeToken}`,
            'x-snippet-auth-valid': 'true',
            'x-snippet-user-id': 'snippet-user',
            'x-snippet-user-email': 'snippet@example.com',
          },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        // Snippet headers should take precedence
        expect(body.data.user.id).toBe('snippet-user')
        expect(body.data.user.email).toBe('snippet@example.com')
      })

      it('should fall back to token when snippet validation fails', async () => {
        const fakeToken = createFakeJwt({
          sub: 'token-user',
          email: 'token@example.com',
        })

        const app = API({
          name: 'snippet-api',
          auth: { mode: 'required', trustSnippets: true, trustUnverified: true },
          routes: (a) => {
            a.get('/check', (c) => c.var.respond({ data: { user: c.var.user } }))
          },
        })

        const res = await app.request('/check', {
          headers: {
            'Authorization': `Bearer ${fakeToken}`,
            'x-snippet-auth-valid': 'false', // Invalid snippet
            'x-snippet-user-id': 'snippet-user',
          },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        // Should fall back to token
        expect(body.data.user.id).toBe('token-user')
      })
    })
  })
})
