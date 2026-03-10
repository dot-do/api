import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { responseMiddleware } from '../../src/response'
import { authLevelMiddleware } from '../../src/middleware/auth-levels'
import { billingMiddleware, requirePlan, requireFeature } from '../../src/middleware/billing'
import type { BillingConfig, PlanConfig } from '../../src/middleware/billing'
import type { ApiEnv, UserContext } from '../../src/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFakeJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const base64Header = btoa(JSON.stringify(header)).replace(/=/g, '')
  const base64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '')
  return `${base64Header}.${base64Payload}.fake_signature`
}

const defaultApiConfig = {
  name: 'billing-test-api',
  description: 'Test API for billing middleware',
}

function createTestApp(billingConfig: BillingConfig, verifiedUser?: Record<string, unknown>) {
  const app = new Hono<ApiEnv>()

  // Minimal middleware stack matching the real API factory order
  app.use('*', responseMiddleware(defaultApiConfig))
  // Simulate authMiddleware setting verifiedUser (so authLevelMiddleware classifies correctly)
  if (verifiedUser) {
    app.use('*', async (c, next) => {
      c.set('verifiedUser' as never, verifiedUser as never)
      await next()
    })
  }
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
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-1', email: 'u@test.com' })

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
      // Verified admin — classifyVerifiedUser sees roles: ['admin'] → L3, buildUserContext defaults plan to 'pro'
      // But billingMiddleware should use the plan from user context
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-2', organizationId: 'org_1', roles: ['admin'] })

      app.get('/check', (c) => {
        const user = c.get('user' as never) as UserContext
        return c.json({ user })
      })

      const res = await app.request('/check')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user.plan).toBe('pro') // L3 admin defaults to 'pro'
      expect(body.user.usage.requests.limit).toBe(500000)
    })

    it('should pass through unauthenticated requests without error', async () => {
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures })

      app.get('/public', (c) => {
        return c.json({ message: 'ok' })
      })

      const res = await app.request('/public')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.message).toBe('ok')
    })

    it('should fall back to free plan limits for unknown plans', async () => {
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-3' })

      app.get('/check', (c) => {
        const user = c.get('user' as never) as UserContext
        return c.json({ user })
      })

      // L2 user defaults to 'free' plan, which isn't a known plan name → fallback
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
      const app = createTestApp(billingConfig, { id: 'user-4', email: 'u@test.com' })

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
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-1', email: 'u@test.com' })

      app.get('/free-route', requirePlan('free', samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/free-route')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBe('ok')
    })

    it('should allow access when user has a higher-tier plan', async () => {
      // L3 admin defaults to 'pro' plan, which is higher than 'starter'
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-5', organizationId: 'org_1', roles: ['admin'] })

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
      // Free user (L2 defaults to 'free' plan)
      const app = createTestApp(billingConfig, { id: 'user-6', email: 'u@test.com' })

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
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures })

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
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-1', email: 'u@test.com' })

      app.get('/read-route', requireFeature('read', sampleFeatures, samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/read-route')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBe('ok')
    })

    it('should return 403 when user plan does not include the feature', async () => {
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-7', email: 'u@test.com' })

      app.get('/bulk-route', requireFeature('bulk', sampleFeatures, samplePlans, 'https://billing.do'), (c) => {
        return c.json({ data: 'ok' })
      })

      // Free user doesn't have 'bulk'
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
      // Need a user whose plan includes 'export'. L3 admin gets 'pro' which has 'export'.
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-8', organizationId: 'org_1', roles: ['admin'] })

      app.get('/export-route', requireFeature('export', sampleFeatures, samplePlans), (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/export-route')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBe('ok')
    })

    it('should return 401 when user is not authenticated', async () => {
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures })

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
      // L2 user with 'free' plan doesn't have 'webhooks' (only pro does)
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-9' })

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
      // Free user should be blocked from starter-only route
      const freeApp = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'free-user', email: 'u@test.com' })
      freeApp.get('/starter-only', requirePlan('starter', samplePlans), (c) => c.json({ data: 'ok' }))
      const freeRes = await freeApp.request('/starter-only')
      expect(freeRes.status).toBe(403)

      // Pro user (L3 admin) should pass starter-only route
      const proApp = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'pro-user', organizationId: 'org_1', roles: ['admin'] })
      proApp.get('/starter-only', requirePlan('starter', samplePlans), (c) => c.json({ data: 'ok' }))
      const proRes = await proApp.request('/starter-only')
      expect(proRes.status).toBe(200)
    })

    it('should handle enterprise plan (not in config) as highest tier', async () => {
      // L4 superadmin gets 'enterprise' plan
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'ent-user', organizationId: 'org_do', platformRole: 'superadmin' })

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
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-10', email: 'u@test.com' })

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
      // L3 admin defaults to 'pro' plan
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures }, { id: 'user-11', organizationId: 'org_1', roles: ['admin'] })

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
      const app = createTestApp(billingConfig, { id: 'user-12', email: 'u@test.com' })

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
      const app = createTestApp(billingConfig, { id: 'user-13', email: 'u@test.com' })

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
      const app = createTestApp({ plans: {}, features: {} }, { id: 'user-14', email: 'u@test.com' })

      app.get('/endpoint', (c) => {
        return c.json({ data: 'ok' })
      })

      const res = await app.request('/endpoint')

      expect(res.status).toBe(200)
    })

    it('should handle unverified API key (L0) — no billing context', async () => {
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures })

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
      const app = createTestApp({ plans: samplePlans, features: sampleFeatures })

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

      // L4 superadmin gets 'enterprise' plan
      const app = createTestApp({ plans: plansWithUnlimited, features: {} }, { id: 'user-15', organizationId: 'org_do', platformRole: 'superadmin' })

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
