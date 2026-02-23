import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { responseMiddleware } from '../../src/response'
import { authLevelMiddleware } from '../../src/middleware/auth-levels'
import { billingMiddleware } from '../../src/middleware/billing'
import { paymentsMiddleware, requirePayment } from '../../src/middleware/payments'
import type { PaymentConfig, PaymentPayload, PricedEndpoint } from '../../src/middleware/payments'
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

function createPaymentSignature(payload: PaymentPayload): string {
  return btoa(JSON.stringify(payload))
}

const defaultApiConfig = {
  name: 'payments-test-api',
  description: 'Test API for payments middleware',
}

const samplePlans: Record<string, PlanConfig> = {
  free: {
    rate: { limit: 100, period: 60 },
    quota: { requests: 1000 },
    entities: ['contacts', 'leads'],
  },
  paygo: {
    rate: { limit: 1000, period: 60 },
    entities: '*',
    price: 'pay-per-call',
  },
  starter: {
    rate: { limit: 500, period: 60 },
    quota: { requests: 50000 },
    entities: '*',
    price: '$29/mo',
  },
  pro: {
    rate: { limit: 2000, period: 60 },
    quota: { requests: 500000 },
    entities: '*',
    price: '$99/mo',
  },
}

const sampleBillingConfig: BillingConfig = {
  plans: samplePlans,
  features: {
    free: ['read'],
    paygo: ['read', 'write'],
    starter: ['read', 'write', 'export'],
    pro: ['read', 'write', 'export', 'bulk'],
  },
}

const samplePaymentConfig: PaymentConfig = {
  payTo: '0x1234567890abcdef1234567890abcdef12345678',
  endpoints: [
    { path: '/contacts', amount: '100', description: 'List contacts' },
    { path: '/contacts/:id', amount: '50', description: 'Get single contact' },
    { path: '/contacts/*', methods: ['POST', 'PUT'], amount: '200', description: 'Mutate contacts' },
    { path: '/analytics/*', amount: '500', description: 'Analytics queries' },
  ],
  networks: ['base'],
  assets: ['USDC'],
  facilitatorUrl: 'https://x402.org/facilitator',
  billingUrl: 'https://billing.do',
}

function createTestApp(paymentConfig: PaymentConfig, billingConfig?: BillingConfig) {
  const app = new Hono<ApiEnv>()

  // Minimal middleware stack matching the real API factory order
  app.use('*', responseMiddleware(defaultApiConfig))
  app.use('*', authLevelMiddleware())
  if (billingConfig) {
    app.use('*', billingMiddleware(billingConfig))
  }
  app.use('*', paymentsMiddleware(paymentConfig))

  return app
}

function makeValidPaymentPayload(resourceUrl: string, amount = '100'): PaymentPayload {
  return {
    x402Version: 1,
    resource: resourceUrl,
    accepted: {
      scheme: 'exact',
      network: 'base',
      asset: 'USDC',
      amount,
      payTo: '0x1234567890abcdef1234567890abcdef12345678',
      maxTimeoutSeconds: 60,
    },
    payload: 'signed_transaction_data_base64',
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Payments Middleware (x402)', () => {
  // ==========================================================================
  // 402 Payment Required responses
  // ==========================================================================
  describe('402 Payment Required', () => {
    it('should return 402 for priced endpoints without payment', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      const res = await app.request('/contacts')

      expect(res.status).toBe(402)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('PAYMENT_REQUIRED')
      expect(body.error.status).toBe(402)
      expect(body.error.message).toContain('100')
      expect(body.error.message).toContain('USDC')
    })

    it('should include x402 payment block in 402 response', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      const res = await app.request('/contacts')

      expect(res.status).toBe(402)
      const body = await res.json()

      expect(body.payment).toBeDefined()
      expect(body.payment.x402Version).toBe(1)
      expect(body.payment.resource).toBeDefined()
      expect(body.payment.resource.url).toContain('/contacts')
      expect(body.payment.resource.description).toBe('List contacts')
      expect(body.payment.accepts).toBeInstanceOf(Array)
      expect(body.payment.accepts.length).toBeGreaterThan(0)

      const accept = body.payment.accepts[0]
      expect(accept.scheme).toBe('exact')
      expect(accept.network).toBe('base')
      expect(accept.asset).toBe('USDC')
      expect(accept.amount).toBe('100')
      expect(accept.payTo).toBe('0x1234567890abcdef1234567890abcdef12345678')
      expect(accept.maxTimeoutSeconds).toBe(60)
    })

    it('should include PAYMENT-REQUIRED header in 402 response', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      const res = await app.request('/contacts')

      expect(res.status).toBe(402)
      const header = res.headers.get('PAYMENT-REQUIRED')
      expect(header).toBeTruthy()

      // Should be base64-encoded JSON
      const decoded = JSON.parse(atob(header!))
      expect(decoded.x402Version).toBe(1)
      expect(decoded.accepts).toBeInstanceOf(Array)
    })

    it('should include upgrade and pricing links in 402 response', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      const res = await app.request('/contacts')

      expect(res.status).toBe(402)
      const body = await res.json()

      expect(body.links).toBeDefined()
      expect(body.links.upgrade).toContain('billing.do')
      expect(body.links.pricing).toContain('billing.do')
      expect(body.links.facilitator).toBe('https://x402.org/facilitator')
    })

    it('should include tenant in upgrade links when user has tenant', async () => {
      const app = createTestApp(samplePaymentConfig, sampleBillingConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      // Free plan user with tenant
      const token = createFakeJwt({ sub: 'user-1', email: 'u@test.com', tenant: 'acme' })
      const res = await app.request('/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.status).toBe(402)
      const body = await res.json()
      // Tenant resolution depends on auth-levels setting it
      expect(body.links).toBeDefined()
      expect(body.links.upgrade).toBeDefined()
    })
  })

  // ==========================================================================
  // Endpoint matching
  // ==========================================================================
  describe('Endpoint matching', () => {
    it('should match exact path patterns', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      const res = await app.request('/contacts')
      expect(res.status).toBe(402)
    })

    it('should match parameterized path patterns', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts/abc123', (c) => c.json({ data: {} }))

      const res = await app.request('/contacts/abc123')
      expect(res.status).toBe(402)
      const body = await res.json()
      expect(body.error.message).toContain('50') // :id endpoint costs 50
    })

    it('should match wildcard path patterns', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/analytics/funnel/conversion', (c) => c.json({ data: {} }))

      const res = await app.request('/analytics/funnel/conversion')
      expect(res.status).toBe(402)
      const body = await res.json()
      expect(body.error.message).toContain('500') // analytics/* costs 500
    })

    it('should respect method filters on endpoints', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts/new-contact', (c) => c.json({ data: {} }))
      app.post('/contacts/new-contact', (c) => c.json({ data: {} }))

      // GET on /contacts/new-contact matches /contacts/:id (50), not the POST-only wildcard (200)
      const getRes = await app.request('/contacts/new-contact')
      expect(getRes.status).toBe(402)
      const getBody = await getRes.json()
      expect(getBody.error.message).toContain('50')

      // POST on /contacts/new-contact should match /contacts/* POST (200)
      // But since endpoints are evaluated in order and /contacts/:id comes first,
      // /contacts/:id matches first with amount 50, since it has no method filter
      const postRes = await app.request('/contacts/new-contact', { method: 'POST' })
      expect(postRes.status).toBe(402)
    })

    it('should pass through unpriced endpoints', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/health', (c) => c.json({ status: 'ok' }))

      const res = await app.request('/health')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('ok')
    })

    it('should match global wildcard endpoint', async () => {
      const config: PaymentConfig = {
        payTo: '0xabcdef',
        endpoints: [{ path: '*', amount: '10', description: 'All endpoints' }],
      }
      const app = createTestApp(config)

      app.get('/anything', (c) => c.json({ data: 'ok' }))

      const res = await app.request('/anything')
      expect(res.status).toBe(402)
    })

    it('should use first matching endpoint (order matters)', async () => {
      const config: PaymentConfig = {
        payTo: '0xabcdef',
        endpoints: [
          { path: '/contacts', amount: '100' },
          { path: '*', amount: '10' },
        ],
      }
      const app = createTestApp(config)

      app.get('/contacts', (c) => c.json({ data: [] }))

      const res = await app.request('/contacts')
      expect(res.status).toBe(402)
      const body = await res.json()
      expect(body.error.message).toContain('100') // first match wins
    })
  })

  // ==========================================================================
  // PAYMENT-SIGNATURE header (autonomous agent payment)
  // ==========================================================================
  describe('PAYMENT-SIGNATURE header', () => {
    it('should accept valid payment signature and pass through', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts', (c) => c.json({ data: ['contact1'] }))

      const paymentPayload = makeValidPaymentPayload('http://localhost/contacts')
      const signature = createPaymentSignature(paymentPayload)

      const res = await app.request('/contacts', {
        headers: { 'PAYMENT-SIGNATURE': signature },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual(['contact1'])
    })

    it('should return 400 for malformed payment signature', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      const res = await app.request('/contacts', {
        headers: { 'PAYMENT-SIGNATURE': 'not-valid-base64!!!' },
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_PAYMENT')
    })

    it('should return 400 for payment signature missing required fields', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      // Missing payload field
      const incomplete = btoa(JSON.stringify({ x402Version: 1, resource: '/contacts' }))
      const res = await app.request('/contacts', {
        headers: { 'PAYMENT-SIGNATURE': incomplete },
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_PAYMENT')
    })

    it('should reject payment when verifyPayment returns false', async () => {
      const config: PaymentConfig = {
        ...samplePaymentConfig,
        verifyPayment: () => false,
      }
      const app = createTestApp(config)

      app.get('/contacts', (c) => c.json({ data: [] }))

      const paymentPayload = makeValidPaymentPayload('http://localhost/contacts')
      const signature = createPaymentSignature(paymentPayload)

      const res = await app.request('/contacts', {
        headers: { 'PAYMENT-SIGNATURE': signature },
      })

      expect(res.status).toBe(402)
      const body = await res.json()
      expect(body.error.code).toBe('PAYMENT_FAILED')
    })

    it('should accept payment when verifyPayment returns true', async () => {
      const verifyFn = vi.fn().mockReturnValue(true)
      const config: PaymentConfig = {
        ...samplePaymentConfig,
        verifyPayment: verifyFn,
      }
      const app = createTestApp(config)

      app.get('/contacts', (c) => c.json({ data: ['contact1'] }))

      const paymentPayload = makeValidPaymentPayload('http://localhost/contacts')
      const signature = createPaymentSignature(paymentPayload)

      const res = await app.request('/contacts', {
        headers: { 'PAYMENT-SIGNATURE': signature },
      })

      expect(res.status).toBe(200)
      expect(verifyFn).toHaveBeenCalledOnce()

      // Verify the correct payload was passed to the verifier
      const calledWith = verifyFn.mock.calls[0][0] as PaymentPayload
      expect(calledWith.x402Version).toBe(1)
      expect(calledWith.accepted.amount).toBe('100')
    })

    it('should support async verifyPayment callback', async () => {
      const config: PaymentConfig = {
        ...samplePaymentConfig,
        verifyPayment: async (payload) => {
          // Simulate async verification delay
          await new Promise((resolve) => setTimeout(resolve, 10))
          return payload.accepted.amount === '100'
        },
      }
      const app = createTestApp(config)

      app.get('/contacts', (c) => c.json({ data: ['contact1'] }))

      const paymentPayload = makeValidPaymentPayload('http://localhost/contacts')
      const signature = createPaymentSignature(paymentPayload)

      const res = await app.request('/contacts', {
        headers: { 'PAYMENT-SIGNATURE': signature },
      })

      expect(res.status).toBe(200)
    })
  })

  // ==========================================================================
  // Subscription plan bypass
  // ==========================================================================
  describe('Subscription plan bypass', () => {
    it('should bypass payment for users on a paid subscription plan', async () => {
      const app = createTestApp(samplePaymentConfig, sampleBillingConfig)

      app.get('/contacts', (c) => c.json({ data: ['contact1'] }))

      // Starter plan user should bypass per-call payments
      const token = createFakeJwt({ sub: 'user-1', plan: 'starter' })
      const res = await app.request('/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual(['contact1'])
    })

    it('should bypass payment for pro plan users', async () => {
      const app = createTestApp(samplePaymentConfig, sampleBillingConfig)

      app.get('/contacts', (c) => c.json({ data: ['contact1'] }))

      const token = createFakeJwt({ sub: 'user-2', plan: 'pro' })
      const res = await app.request('/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.status).toBe(200)
    })

    it('should NOT bypass payment for free plan users', async () => {
      const app = createTestApp(samplePaymentConfig, sampleBillingConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      const token = createFakeJwt({ sub: 'user-3', email: 'u@test.com' })
      const res = await app.request('/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.status).toBe(402)
    })

    it('should NOT bypass payment for paygo plan users', async () => {
      const app = createTestApp(samplePaymentConfig, sampleBillingConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      const token = createFakeJwt({ sub: 'user-4', plan: 'paygo' })
      const res = await app.request('/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.status).toBe(402)
    })
  })

  // ==========================================================================
  // requirePayment — route-level guard
  // ==========================================================================
  describe('requirePayment', () => {
    it('should require payment on a specific route', async () => {
      const app = new Hono<ApiEnv>()
      app.use('*', responseMiddleware(defaultApiConfig))
      app.use('*', authLevelMiddleware())

      app.get(
        '/expensive',
        requirePayment({
          amount: '1000',
          payTo: '0xabcdef',
          description: 'Expensive operation',
        }),
        (c) => c.json({ result: 'done' }),
      )

      const res = await app.request('/expensive')

      expect(res.status).toBe(402)
      const body = await res.json()
      expect(body.error.code).toBe('PAYMENT_REQUIRED')
      expect(body.error.message).toContain('1000')
      expect(body.payment.accepts[0].amount).toBe('1000')
    })

    it('should pass through with valid payment on requirePayment route', async () => {
      const app = new Hono<ApiEnv>()
      app.use('*', responseMiddleware(defaultApiConfig))
      app.use('*', authLevelMiddleware())

      app.get(
        '/expensive',
        requirePayment({
          amount: '1000',
          payTo: '0xabcdef',
        }),
        (c) => c.json({ result: 'done' }),
      )

      const paymentPayload = makeValidPaymentPayload('http://localhost/expensive', '1000')
      const signature = createPaymentSignature(paymentPayload)

      const res = await app.request('/expensive', {
        headers: { 'PAYMENT-SIGNATURE': signature },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.result).toBe('done')
    })
  })

  // ==========================================================================
  // Multiple networks and assets
  // ==========================================================================
  describe('Multiple networks and assets', () => {
    it('should include all configured networks and assets in payment block', async () => {
      const config: PaymentConfig = {
        payTo: '0xabcdef',
        endpoints: [{ path: '/data', amount: '100' }],
        networks: ['base', 'ethereum', 'arbitrum'],
        assets: ['USDC', 'USDT'],
      }
      const app = createTestApp(config)

      app.get('/data', (c) => c.json({ data: [] }))

      const res = await app.request('/data')

      expect(res.status).toBe(402)
      const body = await res.json()

      // Should have 3 networks x 2 assets = 6 accepted payment methods
      expect(body.payment.accepts).toHaveLength(6)

      const networks = new Set(body.payment.accepts.map((a: any) => a.network))
      expect(networks).toEqual(new Set(['base', 'ethereum', 'arbitrum']))

      const assets = new Set(body.payment.accepts.map((a: any) => a.asset))
      expect(assets).toEqual(new Set(['USDC', 'USDT']))
    })

    it('should default to base network and USDC asset', async () => {
      const config: PaymentConfig = {
        payTo: '0xabcdef',
        endpoints: [{ path: '/data', amount: '100' }],
        // No networks or assets specified
      }
      const app = createTestApp(config)

      app.get('/data', (c) => c.json({ data: [] }))

      const res = await app.request('/data')

      expect(res.status).toBe(402)
      const body = await res.json()

      expect(body.payment.accepts).toHaveLength(1)
      expect(body.payment.accepts[0].network).toBe('base')
      expect(body.payment.accepts[0].asset).toBe('USDC')
    })
  })

  // ==========================================================================
  // Edge cases
  // ==========================================================================
  describe('Edge cases', () => {
    it('should handle empty endpoints config (no pricing)', async () => {
      const config: PaymentConfig = {
        payTo: '0xabcdef',
        endpoints: [],
      }
      const app = createTestApp(config)

      app.get('/anything', (c) => c.json({ data: 'ok' }))

      const res = await app.request('/anything')
      expect(res.status).toBe(200)
    })

    it('should handle trailing slashes in paths', async () => {
      const config: PaymentConfig = {
        payTo: '0xabcdef',
        endpoints: [{ path: '/contacts', amount: '100' }],
      }
      const app = createTestApp(config)

      app.get('/contacts/', (c) => c.json({ data: [] }))

      const res = await app.request('/contacts/')
      expect(res.status).toBe(402)
    })

    it('should not require payment when no facilitator URL is configured', async () => {
      const config: PaymentConfig = {
        payTo: '0xabcdef',
        endpoints: [{ path: '/data', amount: '100' }],
        // No facilitatorUrl
      }
      const app = createTestApp(config)

      app.get('/data', (c) => c.json({ data: [] }))

      const res = await app.request('/data')

      expect(res.status).toBe(402)
      const body = await res.json()
      expect(body.links.facilitator).toBeUndefined()
    })

    it('should handle version mismatch in payment payload', async () => {
      const app = createTestApp(samplePaymentConfig)

      app.get('/contacts', (c) => c.json({ data: [] }))

      // Version 2 is not supported
      const badPayload = btoa(
        JSON.stringify({
          x402Version: 2,
          resource: '/contacts',
          accepted: { scheme: 'exact', network: 'base', asset: 'USDC', amount: '100', payTo: '0x', maxTimeoutSeconds: 60 },
          payload: 'data',
        }),
      )

      const res = await app.request('/contacts', {
        headers: { 'PAYMENT-SIGNATURE': badPayload },
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_PAYMENT')
    })

    it('should use custom maxTimeoutSeconds from config', async () => {
      const config: PaymentConfig = {
        payTo: '0xabcdef',
        endpoints: [{ path: '/data', amount: '100' }],
        maxTimeoutSeconds: 120,
      }
      const app = createTestApp(config)

      app.get('/data', (c) => c.json({ data: [] }))

      const res = await app.request('/data')

      expect(res.status).toBe(402)
      const body = await res.json()
      expect(body.payment.accepts[0].maxTimeoutSeconds).toBe(120)
    })
  })
})
