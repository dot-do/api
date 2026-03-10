import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { responseMiddleware } from '../../src/response'
import { authLevelMiddleware } from '../../src/middleware/auth-levels'
import { billingMiddleware, requirePlan, requireFeature } from '../../src/middleware/billing'
import type { BillingConfig, PlanConfig } from '../../src/middleware/billing'
import type { ApiEnv, UserContext } from '../../src/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return raw claims object — used to inject as verifiedUser instead of encoding as a JWT. */
function createUserClaims(claims: Record<string, unknown>): Record<string, unknown> {
  return claims
}

const defaultApiConfig = {
  name: 'billing-test-api',
  description: 'Test API for billing middleware',
}

/** Build an app with verifiedUser pre-set (simulating authMiddleware) before authLevelMiddleware. */
function buildVerifiedApp(verifiedUser: Record<string, unknown>, billingConfig: BillingConfig) {
  const app = new Hono<ApiEnv>()
  app.use('*', async (c, next) => {
    c.set('verifiedUser' as never, verifiedUser as never)
    await next()
  })
  app.use('*', responseMiddleware(defaultApiConfig))
  app.use('*', authLevelMiddleware())
  app.use('*', billingMiddleware(billingConfig))
  return app
}

/** Build an anonymous app (no verifiedUser) — for unauthenticated / L0 tests. */
function buildAnonApp(billingConfig: BillingConfig) {
  const app = new Hono<ApiEnv>()
  app.use('*', responseMiddleware(defaultApiConfig))
  app.use('*', authLevelMiddleware())
  app.use('*', billingMiddleware(billingConfig))
  return app
}

const samplePlans: Record<string, PlanConfig> = {
  free: {
    rate: { limit: 100, period: 60 },
    quota: { requests: 1000 },
    entities: ['contacts', 'leads'],
  },
  starter: {
    rate: { limit: 500, period: 60 },
    quota: { requests: 50000 },
    entities: ['contacts', 'leads', 'deals', 'campaigns'],
    price: '$29/mo',
  },
  pro: {
    rate: { limit: 2000, period: 60 },
    quota: { requests: 500000 },
    entities: '*',
    price: '$99/mo',
  },
}

const sampleFeatures: Record<string, string[]> = {
  free: ['read', 'search'],
  starter: ['read', 'search', 'write', 'delete', 'export'],
  pro: ['read', 'search', 'write', 'delete', 'export', 'bulk', 'webhooks', 'api-keys'],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Billing Middleware', () => {
  // ==========================================================================
  // billingMiddleware — usage tracking and plan enrichment
  // ==========================================================================
  describe('billingMiddleware', () => {
    it('should enrich user context with plan limits from config', async () => {
      const claims = createUserClaims({ sub: 'user-1', email: 'u@test.com' })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/check', (c) => {
        const user = c.get('user' as never) as UserContext
        return c.json({ user })
      })

      // L2 user with "free" plan (default from auth-levels)
      const res = await app.request('/check')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.plan).toBe('free')
      expect(body.user.usage).toBeDefined()
      expect(body.user.usage.requests).toBeDefined()
      expect(body.user.usage.requests.limit).toBe(1000)
    })

    it('should use plan-specific quota limits from config', async () => {
      // L3 user has enterprise plan by default from auth-levels
      const claims = createUserClaims({ sub: 'user-2', plan: 'starter', org_verified: true })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/check', (c) => {
        const user = c.get('user' as never) as UserContext
        return c.json({ user })
      })

      const res = await app.request('/check')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.plan).toBe('starter')
      expect(body.user.usage.requests.limit).toBe(50000)
    })

    it('should pass through unauthenticated requests without error', async () => {
      const app = buildAnonApp({ plans: samplePlans, features: sampleFeatures })

      app.get('/public', (c) => {
        return c.json({ message: 'ok' })
      })

      const res = await app.request('/public')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.message).toBe('ok')
    })

    it('should fall back to free plan limits for unknown plans', async () => {
      const claims = createUserClaims({ sub: 'user-3', plan: 'nonexistent' })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/check', (c) => {
        const user = c.get('user' as never) as UserContext
        return c.json({ user })
      })

      const res = await app.request('/check')

      expect(res.status).toBe(200)
      const body = await res.json()
      // Unknown plan should fall back to free
      expect(body.user.usage.requests.limit).toBe(1000)
    })

    it('should add upgrade links for non-top-tier plans', async () => {
      const billingConfig: BillingConfig = {
        plans: samplePlans,
        features: sampleFeatures,
        billingUrl: 'https://billing.do',
      }
      const claims = createUserClaims({ sub: 'user-4', email: 'u@test.com' })
      const app = buildVerifiedApp(claims, billingConfig)

      app.get('/check', (c) => {
        const user = c.get('user' as never) as UserContext
        return c.json({ user })
      })

      const res = await app.request('/check')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.links).toBeDefined()
      expect(body.user.links.upgrade).toBeDefined()
      expect(body.user.links.upgrade).toContain('billing.do')
    })
  })

  // ==========================================================================
  // requirePlan — route-level plan guard
  // ==========================================================================
  describe('requirePlan', () => {
    it('should allow access when user has the required plan', async () => {
      const claims = createUserClaims({ sub: 'user-1', email: 'u@test.com' })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/free-route', requirePlan('free', samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/free-route')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBe('ok')
    })

    it('should allow access when user has a higher-tier plan', async () => {
      // L3 user gets "enterprise" by default, but let's set plan to "pro"
      const claims = createUserClaims({ sub: 'user-5', plan: 'pro' })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/starter-route', requirePlan('starter', samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/starter-route')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBe('ok')
    })

    it('should return 403 when user plan is below required plan', async () => {
      const billingConfig: BillingConfig = {
        plans: samplePlans,
        features: sampleFeatures,
        billingUrl: 'https://billing.do',
      }
      // Free user
      const claims = createUserClaims({ sub: 'user-6', email: 'u@test.com' })
      const app = buildVerifiedApp(claims, billingConfig)

      app.get('/pro-route', requirePlan('pro', samplePlans, 'https://billing.do'), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/pro-route')

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('PLAN_REQUIRED')
      expect(body.error.message).toContain('pro')
      expect(body.links).toBeDefined()
      expect(body.links.upgrade).toBeDefined()
      expect(body.links.upgrade).toContain('billing.do')
    })

    it('should return 401 when user is not authenticated', async () => {
      const app = buildAnonApp({ plans: samplePlans, features: sampleFeatures })

      app.get('/paid-route', requirePlan('starter', samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/paid-route')

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })
  })

  // ==========================================================================
  // requireFeature — feature-based guard
  // ==========================================================================
  describe('requireFeature', () => {
    it('should allow access when user plan has the required feature', async () => {
      const claims = createUserClaims({ sub: 'user-1', email: 'u@test.com' })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/read-route', requireFeature('read', sampleFeatures, samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/read-route')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBe('ok')
    })

    it('should return 403 when user plan does not include the feature', async () => {
      // Free user doesn't have 'bulk'
      const claims = createUserClaims({ sub: 'user-7', email: 'u@test.com' })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/bulk-route', requireFeature('bulk', sampleFeatures, samplePlans, 'https://billing.do'), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/bulk-route')

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('FEATURE_REQUIRED')
      expect(body.error.message).toContain('bulk')
      expect(body.links).toBeDefined()
      expect(body.links.upgrade).toContain('feature=bulk')
    })

    it('should allow access to a feature available on higher plans', async () => {
      const claims = createUserClaims({ sub: 'user-8', plan: 'starter' })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/export-route', requireFeature('export', sampleFeatures, samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/export-route')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBe('ok')
    })

    it('should return 401 when user is not authenticated', async () => {
      const app = buildAnonApp({ plans: samplePlans, features: sampleFeatures })

      app.get('/feature-route', requireFeature('write', sampleFeatures, samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/feature-route')

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should tell the user which plan they need for the feature', async () => {
      // Starter user doesn't have webhooks (only pro)
      const claims = createUserClaims({ sub: 'user-9', plan: 'starter' })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/webhook-route', requireFeature('webhooks', sampleFeatures, samplePlans, 'https://billing.do'), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/webhook-route')

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error.code).toBe('FEATURE_REQUIRED')
      expect(body.error.requiredPlan).toBeDefined()
      expect(body.error.requiredPlan).toBe('pro')
    })
  })

  // ==========================================================================
  // Plan ordering and tier comparison
  // ==========================================================================
  describe('Plan ordering', () => {
    it('should respect plan order based on config key order', async () => {
      // Free user should be blocked
      const freeClaims = createUserClaims({ sub: 'free-user', email: 'u@test.com' })
      const freeApp = buildVerifiedApp(freeClaims, { plans: samplePlans, features: sampleFeatures })
      freeApp.get('/starter-only', requirePlan('starter', samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })
      const freeRes = await freeApp.request('/starter-only')
      expect(freeRes.status).toBe(403)

      // Starter user should pass
      const starterClaims = createUserClaims({ sub: 'starter-user', plan: 'starter' })
      const starterApp = buildVerifiedApp(starterClaims, { plans: samplePlans, features: sampleFeatures })
      starterApp.get('/starter-only', requirePlan('starter', samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })
      const starterRes = await starterApp.request('/starter-only')
      expect(starterRes.status).toBe(200)

      // Pro user should also pass (higher tier)
      const proClaims = createUserClaims({ sub: 'pro-user', plan: 'pro' })
      const proApp = buildVerifiedApp(proClaims, { plans: samplePlans, features: sampleFeatures })
      proApp.get('/starter-only', requirePlan('starter', samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })
      const proRes = await proApp.request('/starter-only')
      expect(proRes.status).toBe(200)
    })

    it('should handle enterprise plan (not in config) as highest tier', async () => {
      // L3 user with enterprise plan (assigned by auth-levels)
      const claims = createUserClaims({ sub: 'ent-user', plan: 'enterprise', org_verified: true })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/pro-only', requirePlan('pro', samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/pro-only')

      expect(res.status).toBe(200)
    })
  })

  // ==========================================================================
  // Entity access gating
  // ==========================================================================
  describe('Entity access', () => {
    it('should expose allowed entities for the user plan', async () => {
      const claims = createUserClaims({ sub: 'user-10', email: 'u@test.com' })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/check-entities', (c) => {
        const user = c.get('user' as never) as UserContext & { allowedEntities?: string[] | '*' }
        return c.json({ allowedEntities: user.allowedEntities })
      })

      const res = await app.request('/check-entities')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.allowedEntities).toEqual(['contacts', 'leads'])
    })

    it('should allow all entities for pro plan', async () => {
      const claims = createUserClaims({ sub: 'user-11', plan: 'pro' })
      const app = buildVerifiedApp(claims, { plans: samplePlans, features: sampleFeatures })

      app.get('/check-entities', (c) => {
        const user = c.get('user' as never) as UserContext & { allowedEntities?: string[] | '*' }
        return c.json({ allowedEntities: user.allowedEntities })
      })

      const res = await app.request('/check-entities')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.allowedEntities).toBe('*')
    })
  })

  // ==========================================================================
  // Usage tracking
  // ==========================================================================
  describe('Usage tracking', () => {
    it('should increment usage counter per request', async () => {
      const usageStore = new Map<string, number>()
      const billingConfig: BillingConfig = {
        plans: samplePlans,
        features: sampleFeatures,
        trackUsage: (userId, plan) => {
          const current = usageStore.get(userId) || 0
          usageStore.set(userId, current + 1)
          return current + 1
        },
      }
      const claims = createUserClaims({ sub: 'user-12', email: 'u@test.com' })
      const app = buildVerifiedApp(claims, billingConfig)

      app.get('/tracked', (c) => {
        const user = c.get('user' as never) as UserContext
        return c.json({ usage: user.usage })
      })

      // First request
      const res1 = await app.request('/tracked')
      const body1 = await res1.json()
      expect(body1.usage.requests.used).toBe(1)

      // Second request
      const res2 = await app.request('/tracked')
      const body2 = await res2.json()
      expect(body2.usage.requests.used).toBe(2)
    })

    it('should return 429 when usage exceeds quota', async () => {
      const billingConfig: BillingConfig = {
        plans: {
          free: {
            rate: { limit: 10, period: 60 },
            quota: { requests: 2 },
            entities: ['contacts'],
          },
        },
        features: { free: ['read'] },
        trackUsage: (_userId, _plan) => 3, // Already over limit
        billingUrl: 'https://billing.do',
      }
      const claims = createUserClaims({ sub: 'user-13', email: 'u@test.com' })
      const app = buildVerifiedApp(claims, billingConfig)

      app.get('/limited', (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/limited')

      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('QUOTA_EXCEEDED')
      expect(body.links).toBeDefined()
      expect(body.links.upgrade).toBeDefined()
    })
  })

  // ==========================================================================
  // Edge cases
  // ==========================================================================
  describe('Edge cases', () => {
    it('should handle empty plans config gracefully', async () => {
      const claims = createUserClaims({ sub: 'user-14', email: 'u@test.com' })
      const app = buildVerifiedApp(claims, { plans: {}, features: {} })

      app.get('/endpoint', (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/endpoint')

      expect(res.status).toBe(200)
    })

    it('should handle unverified API key (L0) — no billing context', async () => {
      const app = buildAnonApp({ plans: samplePlans, features: sampleFeatures })

      app.get('/check', (c) => {
        const user = c.get('user' as never) as UserContext
        return c.json({ user })
      })

      // Unverified x-api-key (no authMiddleware) → L0, no plan/usage
      const res = await app.request('/check', {
        headers: { 'x-api-key': 'agent_test123' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.authenticated).toBe(false)
      expect(body.user.level).toBe('L0')
    })

    it('should not modify context for unauthenticated requests', async () => {
      const app = buildAnonApp({ plans: samplePlans, features: sampleFeatures })

      app.get('/anon', (c) => {
        const user = c.get('user' as never) as UserContext
        return c.json({ authenticated: user?.authenticated })
      })

      const res = await app.request('/anon')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.authenticated).toBe(false)
    })

    it('should support plans without quota (unlimited)', async () => {
      const plansWithUnlimited: Record<string, PlanConfig> = {
        enterprise: {
          rate: { limit: 10000, period: 60 },
          entities: '*',
        },
      }

      const claims = createUserClaims({ sub: 'user-15', plan: 'enterprise', org_verified: true })
      const app = buildVerifiedApp(claims, { plans: plansWithUnlimited, features: {} })

      app.get('/check', (c) => {
        const user = c.get('user' as never) as UserContext
        return c.json({ user })
      })

      const res = await app.request('/check')

      expect(res.status).toBe(200)
      const body = await res.json()
      // No quota means unlimited — limit should be -1 or Infinity indicator
      expect(body.user.usage.requests.limit).toBe(-1)
    })
  })

  // ==========================================================================
  // Discovery — gated functions marked with required plan
  // ==========================================================================
  describe('Discovery', () => {
    it('should expose plan requirements for features via getFeatureRequirements', async () => {
      const { getFeatureRequirements } = await import('../../src/middleware/billing')

      const requirements = getFeatureRequirements(sampleFeatures, samplePlans)

      expect(requirements.read).toBe('free')
      expect(requirements.search).toBe('free')
      expect(requirements.write).toBe('starter')
      expect(requirements.bulk).toBe('pro')
      expect(requirements.webhooks).toBe('pro')
    })
  })
})
