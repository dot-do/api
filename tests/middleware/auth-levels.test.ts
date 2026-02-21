import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { authLevelMiddleware, requireAuth, buildUserContext } from '../../src/middleware/auth-levels'
import type { AuthLevel, AuthLevelConfig } from '../../src/middleware/auth-levels'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a fake JWT (header.payload.signature) from arbitrary claims. */
function createFakeJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const base64Header = btoa(JSON.stringify(header)).replace(/=/g, '')
  const base64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '')
  return `${base64Header}.${base64Payload}.fake_signature`
}

/** Build a minimal Hono app with auth-level middleware and a test route. */
function buildApp(config?: AuthLevelConfig) {
  const app = new Hono()
  app.use('*', authLevelMiddleware(config))
  app.get('/test', (c) => {
    const user = c.get('user' as never)
    return c.json({ user })
  })
  return app
}

/** Build a Hono app with auth-level + requireAuth guard on a protected route. */
function buildGuardedApp(level?: AuthLevel, config?: AuthLevelConfig) {
  const app = new Hono()
  app.use('*', authLevelMiddleware(config))
  app.get('/protected', requireAuth(level), (c) => {
    const user = c.get('user' as never)
    return c.json({ user })
  })
  app.get('/open', (c) => c.json({ ok: true }))
  return app
}

// ===========================================================================
// authLevelMiddleware — level detection
// ===========================================================================

describe('authLevelMiddleware', () => {
  // -------------------------------------------------------------------------
  // L0 — Anonymous
  // -------------------------------------------------------------------------
  describe('L0 — Anonymous (no auth)', () => {
    it('should set L0 user context when no auth header is present', async () => {
      const app = buildApp()
      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.authenticated).toBe(false)
      expect(body.user.level).toBe('L0')
      expect(body.user.links).toBeDefined()
      expect(body.user.links.register).toContain('register')
      expect(body.user.links.login).toContain('login')
    })

    it('should set L0 when Authorization header is empty', async () => {
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { Authorization: '' },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.level).toBe('L0')
      expect(body.user.authenticated).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // L1 — Agent (API key)
  // -------------------------------------------------------------------------
  describe('L1 — Agent (API key)', () => {
    it('should set L1 for x-api-key with agent_ prefix', async () => {
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { 'x-api-key': 'agent_abc123' },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.authenticated).toBe(true)
      expect(body.user.level).toBe('L1')
      expect(body.user.agent).toBeDefined()
      expect(body.user.agent.id).toBe('agent_abc123')
      expect(body.user.plan).toBe('free')
      expect(body.user.links.claim).toContain('claim')
      expect(body.user.links.upgrade).toContain('upgrade')
    })

    it('should set L1 for sk_live_ API key in Authorization header', async () => {
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer sk_live_test123' },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.authenticated).toBe(true)
      expect(body.user.level).toBe('L1')
      expect(body.user.agent).toBeDefined()
      expect(body.user.agent.id).toBe('sk_live_test123')
    })

    it('should set L1 for sk_test_ API key in Authorization header', async () => {
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer sk_test_xyz789' },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.authenticated).toBe(true)
      expect(body.user.level).toBe('L1')
    })

    it('should set L1 for agent_ prefix in Authorization header', async () => {
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer agent_my-bot' },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.authenticated).toBe(true)
      expect(body.user.level).toBe('L1')
      expect(body.user.agent.id).toBe('agent_my-bot')
    })

    it('should include usage info at L1', async () => {
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { 'x-api-key': 'agent_bot1' },
      })
      const body = await res.json()
      expect(body.user.usage).toBeDefined()
      expect(body.user.usage.requests).toBeDefined()
      expect(typeof body.user.usage.requests.used).toBe('number')
      expect(typeof body.user.usage.requests.limit).toBe('number')
    })
  })

  // -------------------------------------------------------------------------
  // L2 — Claimed (JWT with user claims)
  // -------------------------------------------------------------------------
  describe('L2 — Claimed (JWT with user claims)', () => {
    it('should set L2 for Bearer JWT with user claims', async () => {
      const token = createFakeJwt({
        sub: 'user_alice',
        name: 'Alice Johnson',
        email: 'alice@acme.com',
        tenant: 'acme',
      })
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.authenticated).toBe(true)
      expect(body.user.level).toBe('L2')
      expect(body.user.name).toBe('Alice Johnson')
      expect(body.user.email).toBe('alice@acme.com')
      expect(body.user.tenant).toBe('acme')
      expect(body.user.links.billing).toBeDefined()
      expect(body.user.links.settings).toBeDefined()
    })

    it('should set L2 for JWT with sub but no org_verified flag', async () => {
      const token = createFakeJwt({
        sub: 'user_bob',
        name: 'Bob Smith',
        email: 'bob@example.com',
      })
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()
      expect(body.user.level).toBe('L2')
      expect(body.user.id).toBe('user_bob')
    })

    it('should include plan info at L2', async () => {
      const token = createFakeJwt({
        sub: 'user_carol',
        name: 'Carol',
        email: 'carol@example.com',
        plan: 'starter',
      })
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()
      expect(body.user.plan).toBe('starter')
    })
  })

  // -------------------------------------------------------------------------
  // L3 — Verified (JWT with verified org SSO)
  // -------------------------------------------------------------------------
  describe('L3 — Verified (JWT with org verification)', () => {
    it('should set L3 for JWT with org_verified: true', async () => {
      const token = createFakeJwt({
        sub: 'user_dave',
        name: 'Dave Manager',
        email: 'dave@bigcorp.com',
        tenant: 'bigcorp',
        org_verified: true,
        plan: 'enterprise',
      })
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.authenticated).toBe(true)
      expect(body.user.level).toBe('L3')
      expect(body.user.name).toBe('Dave Manager')
      expect(body.user.tenant).toBe('bigcorp')
      expect(body.user.plan).toBe('enterprise')
    })

    it('should set L3 for JWT with sso_connection claim', async () => {
      const token = createFakeJwt({
        sub: 'user_eve',
        name: 'Eve Admin',
        email: 'eve@enterprise.io',
        tenant: 'enterprise',
        sso_connection: 'conn_saml_xyz',
      })
      const app = buildApp()
      const res = await app.request('/test', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()
      expect(body.user.level).toBe('L3')
    })
  })

  // -------------------------------------------------------------------------
  // Config — custom identity/billing URLs
  // -------------------------------------------------------------------------
  describe('Custom config URLs', () => {
    it('should use custom identityUrl in L0 links', async () => {
      const app = buildApp({ identityUrl: 'https://auth.custom.com' })
      const res = await app.request('/test')
      const body = await res.json()
      expect(body.user.links.register).toBe('https://auth.custom.com/register')
      expect(body.user.links.login).toBe('https://auth.custom.com/login')
    })

    it('should use custom billingUrl in L1 links', async () => {
      const app = buildApp({ billingUrl: 'https://pay.custom.com' })
      const res = await app.request('/test', {
        headers: { 'x-api-key': 'agent_bot' },
      })
      const body = await res.json()
      expect(body.user.links.upgrade).toBe('https://pay.custom.com/upgrade')
    })
  })
})

// ===========================================================================
// requireAuth — route-level guard
// ===========================================================================

describe('requireAuth', () => {
  // -------------------------------------------------------------------------
  // requireAuth() — any authenticated (L1+)
  // -------------------------------------------------------------------------
  describe('requireAuth() — L1+ (any authenticated)', () => {
    it('should block L0 with 401', async () => {
      const app = buildGuardedApp()
      const res = await app.request('/protected')
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.links).toBeDefined()
      expect(body.links.register).toBeDefined()
      expect(body.links.login).toBeDefined()
    })

    it('should allow L1', async () => {
      const app = buildGuardedApp()
      const res = await app.request('/protected', {
        headers: { 'x-api-key': 'agent_test' },
      })
      expect(res.status).toBe(200)
    })

    it('should allow L2', async () => {
      const token = createFakeJwt({ sub: 'user_1', name: 'User', email: 'u@test.com' })
      const app = buildGuardedApp()
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
    })

    it('should allow L3', async () => {
      const token = createFakeJwt({ sub: 'user_2', name: 'Admin', email: 'a@test.com', org_verified: true })
      const app = buildGuardedApp()
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
    })
  })

  // -------------------------------------------------------------------------
  // requireAuth('claimed') — L2+
  // -------------------------------------------------------------------------
  describe("requireAuth('claimed') — L2+", () => {
    it('should block L0 with 401', async () => {
      const app = buildGuardedApp('claimed')
      const res = await app.request('/protected')
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should block L1 with 403', async () => {
      const app = buildGuardedApp('claimed')
      const res = await app.request('/protected', {
        headers: { 'x-api-key': 'agent_test' },
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error.code).toBe('FORBIDDEN')
      expect(body.links).toBeDefined()
      expect(body.links.claim).toBeDefined()
    })

    it('should allow L2', async () => {
      const token = createFakeJwt({ sub: 'user_1', name: 'User', email: 'u@test.com' })
      const app = buildGuardedApp('claimed')
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
    })

    it('should allow L3', async () => {
      const token = createFakeJwt({ sub: 'user_2', name: 'Admin', email: 'a@test.com', org_verified: true })
      const app = buildGuardedApp('claimed')
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
    })
  })

  // -------------------------------------------------------------------------
  // requireAuth('verified') — L3 only
  // -------------------------------------------------------------------------
  describe("requireAuth('verified') — L3 only", () => {
    it('should block L0 with 401', async () => {
      const app = buildGuardedApp('verified')
      const res = await app.request('/protected')
      expect(res.status).toBe(401)
    })

    it('should block L1 with 403', async () => {
      const app = buildGuardedApp('verified')
      const res = await app.request('/protected', {
        headers: { 'x-api-key': 'agent_test' },
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error.code).toBe('FORBIDDEN')
    })

    it('should block L2 with 403', async () => {
      const token = createFakeJwt({ sub: 'user_1', name: 'User', email: 'u@test.com' })
      const app = buildGuardedApp('verified')
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error.code).toBe('FORBIDDEN')
      expect(body.links).toBeDefined()
    })

    it('should allow L3', async () => {
      const token = createFakeJwt({ sub: 'user_2', name: 'Admin', email: 'a@test.com', org_verified: true, tenant: 'bigcorp' })
      const app = buildGuardedApp('verified')
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
    })
  })

  // -------------------------------------------------------------------------
  // Error responses include appropriate links
  // -------------------------------------------------------------------------
  describe('Error response links', () => {
    it('should include register/login links in 401 for L0', async () => {
      const app = buildGuardedApp()
      const res = await app.request('/protected')
      const body = await res.json()
      expect(res.status).toBe(401)
      expect(body.links.register).toBeDefined()
      expect(body.links.login).toBeDefined()
    })

    it('should include claim link in 403 for L1 needing L2', async () => {
      const app = buildGuardedApp('claimed')
      const res = await app.request('/protected', {
        headers: { 'x-api-key': 'agent_test' },
      })
      const body = await res.json()
      expect(res.status).toBe(403)
      expect(body.links.claim).toBeDefined()
    })

    it('should include upgrade link in 403 for L2 needing L3', async () => {
      const token = createFakeJwt({ sub: 'user_1', name: 'User', email: 'u@test.com' })
      const app = buildGuardedApp('verified')
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()
      expect(res.status).toBe(403)
      expect(body.links.upgrade).toBeDefined()
    })

    it('should use custom URLs in error response links', async () => {
      const config: AuthLevelConfig = {
        identityUrl: 'https://auth.custom.com',
        billingUrl: 'https://pay.custom.com',
      }
      const app = buildGuardedApp(undefined, config)
      const res = await app.request('/protected')
      const body = await res.json()
      expect(body.links.register).toBe('https://auth.custom.com/register')
      expect(body.links.login).toBe('https://auth.custom.com/login')
    })
  })

  // -------------------------------------------------------------------------
  // Non-guarded routes should still work
  // -------------------------------------------------------------------------
  describe('Non-guarded routes', () => {
    it('should not block open routes even at L0', async () => {
      const app = buildGuardedApp()
      const res = await app.request('/open')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
    })
  })
})

// ===========================================================================
// buildUserContext — unit tests
// ===========================================================================

describe('buildUserContext', () => {
  it('should build L0 context with no claims', () => {
    const ctx = buildUserContext(null, 'L0')
    expect(ctx.authenticated).toBe(false)
    expect(ctx.level).toBe('L0')
    expect(ctx.links?.register).toBeDefined()
    expect(ctx.links?.login).toBeDefined()
    expect(ctx.id).toBeUndefined()
    expect(ctx.agent).toBeUndefined()
  })

  it('should build L1 context with agent claims', () => {
    const ctx = buildUserContext({ agentId: 'agent_bot', agentName: 'my-bot' }, 'L1')
    expect(ctx.authenticated).toBe(true)
    expect(ctx.level).toBe('L1')
    expect(ctx.agent?.id).toBe('agent_bot')
    expect(ctx.agent?.name).toBe('my-bot')
    expect(ctx.plan).toBe('free')
    expect(ctx.usage).toBeDefined()
    expect(ctx.links?.claim).toBeDefined()
    expect(ctx.links?.upgrade).toBeDefined()
  })

  it('should build L2 context with user claims', () => {
    const ctx = buildUserContext(
      { sub: 'user_alice', name: 'Alice Johnson', email: 'alice@acme.com', tenant: 'acme', plan: 'starter' },
      'L2',
    )
    expect(ctx.authenticated).toBe(true)
    expect(ctx.level).toBe('L2')
    expect(ctx.id).toBe('user_alice')
    expect(ctx.name).toBe('Alice Johnson')
    expect(ctx.email).toBe('alice@acme.com')
    expect(ctx.tenant).toBe('acme')
    expect(ctx.plan).toBe('starter')
    expect(ctx.links?.billing).toBeDefined()
    expect(ctx.links?.settings).toBeDefined()
  })

  it('should build L3 context with verified org claims', () => {
    const ctx = buildUserContext(
      { sub: 'user_dave', name: 'Dave Manager', email: 'dave@bigcorp.com', tenant: 'bigcorp', plan: 'enterprise' },
      'L3',
    )
    expect(ctx.authenticated).toBe(true)
    expect(ctx.level).toBe('L3')
    expect(ctx.id).toBe('user_dave')
    expect(ctx.tenant).toBe('bigcorp')
    expect(ctx.plan).toBe('enterprise')
    expect(ctx.links?.billing).toBeDefined()
    expect(ctx.links?.settings).toBeDefined()
    expect(ctx.links?.team).toBeDefined()
    expect(ctx.links?.sso).toBeDefined()
  })

  it('should use custom identity/billing URLs', () => {
    const config: AuthLevelConfig = {
      identityUrl: 'https://auth.example.com',
      billingUrl: 'https://pay.example.com',
    }
    const ctx = buildUserContext(null, 'L0', config)
    expect(ctx.links?.register).toBe('https://auth.example.com/register')
    expect(ctx.links?.login).toBe('https://auth.example.com/login')
  })

  it('should default plan to "free" for L1', () => {
    const ctx = buildUserContext({ agentId: 'agent_x' }, 'L1')
    expect(ctx.plan).toBe('free')
  })

  it('should default plan to "free" for L2 when not specified', () => {
    const ctx = buildUserContext({ sub: 'user_1', name: 'Test' }, 'L2')
    expect(ctx.plan).toBe('free')
  })
})
