import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('Landing Page', () => {
  it('returns primitive-ordered navigator at root', async () => {
    const res = await app.request('https://apis.do/')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.api.name).toBe('apis.do')

    // Verify primitive categories exist
    expect(body.core).toBeDefined()
    expect(body.intelligence).toBeDefined()
    expect(body.execution).toBeDefined()
    expect(body.actors).toBeDefined()
    expect(body.outputs).toBeDefined()
    expect(body.interfaces).toBeDefined()
    expect(body.lifecycle).toBeDefined()

    // Verify ordering: core keys should come before lifecycle in JSON
    const keys = Object.keys(body)
    const coreIdx = keys.indexOf('core')
    const lifecycleIdx = keys.indexOf('lifecycle')
    expect(coreIdx).toBeLessThan(lifecycleIdx)

    // Verify Domain is first in core
    const coreKeys = Object.keys(body.core)
    expect(coreKeys[0]).toBe('Domain')

    // Default uses local paths
    expect(body.core.Noun).toBe('https://apis.do/nouns')
    expect(body.core.Event).toBe('https://apis.do/events')
    expect(body.intelligence.Database).toBe('https://apis.do/database')
    expect(body.core.Domain).toBe('https://apis.do/domains')

    // Action offers to show .do domains
    expect(body.actions['Show .do Domains']).toBe('https://apis.do/?domains')

    // Only auto-generated links (home, self)
    expect(body.links.home).toBe('https://apis.do')
    expect(body.links.self).toBe('https://apis.do/')

    // Old discover key should NOT exist
    expect(body.discover).toBeUndefined()
  })

  it('shows .do domains with ?domains', async () => {
    const res = await app.request('https://apis.do/?domains')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.core.Noun).toBe('https://nouns.do')
    expect(body.core.Event).toBe('https://events.do')
    expect(body.intelligence.Database).toBe('https://database.do')
    expect(body.actions['Show Local Paths']).toBe('https://apis.do/')
  })
})

describe('Service Registry', () => {
  it('returns services under semantic key', async () => {
    const res = await app.request('https://apis.do/services')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.services).toBeDefined()
    expect(Array.isArray(body.services)).toBe(true)
    expect(body.services.length).toBeGreaterThan(300)
    expect(body.total).toBe(body.services.length)
  })

  it('returns categories under semantic key', async () => {
    const res = await app.request('https://apis.do/categories')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.categories).toBeDefined()
    expect(Array.isArray(body.categories)).toBe(true)
    expect(body.categories.length).toBeGreaterThan(5)
    expect(body.total).toBe(body.categories.length)
  })

  it('filters services by category', async () => {
    const res = await app.request('https://apis.do/services?category=ai')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.services.every((s: { category: string }) => s.category === 'ai')).toBe(true)
  })

  it('searches services by query', async () => {
    const res = await app.request('https://apis.do/services?q=database')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.services.length).toBeGreaterThan(0)
  })

  it('returns service detail with links', async () => {
    const res = await app.request('https://apis.do/services/events')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.service.name).toBe('events')
    expect(body.service.domain).toBe('events.do')
    expect(body.links.also).toBe('https://events.do/api')
    expect(body.links.api).toBe('https://apis.do/events')
  })

  it('returns backward-compat /apis endpoint', async () => {
    const res = await app.request('https://apis.do/apis')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(Array.isArray(body.apis)).toBe(true)
    expect(body.apis.length).toBeGreaterThan(300)
    expect(body.total).toBe(body.apis.length)
  })
})

describe('Events — Auth Protection', () => {
  // NOTE: bare /events may conflict with the database convention's CDC endpoint
  // when the DATABASE binding is not a real DurableObjectNamespace.
  // Sub-paths are handled cleanly by the events convention.

  it('rejects unauthenticated requests to /events/system with 401', async () => {
    const res = await app.request('https://apis.do/events/system')
    expect(res.status).toBe(401)
  })

  it('rejects unauthenticated requests to /events/data with 401', async () => {
    const res = await app.request('https://apis.do/events/data')
    expect(res.status).toBe(401)
  })

  it('rejects unauthenticated requests to /events/integration with 401', async () => {
    const res = await app.request('https://apis.do/events/integration')
    expect(res.status).toBe(401)
  })

  it('rejects unauthenticated requests to /events/agent with 401', async () => {
    const res = await app.request('https://apis.do/events/agent')
    expect(res.status).toBe(401)
  })

  it('rejects unauthenticated requests to /events/user with 401', async () => {
    const res = await app.request('https://apis.do/events/user')
    expect(res.status).toBe(401)
  })

  it('rejects unauthenticated requests to /events/integration/:provider with 401', async () => {
    const res = await app.request('https://apis.do/events/integration/stripe')
    expect(res.status).toBe(401)
  })
})

describe('Integration Namespaces', () => {
  it('returns stripe discovery', async () => {
    const res = await app.request('https://apis.do/stripe')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.discover['Customers']).toBe('https://apis.do/stripe/customers')
    expect(body.links.events).toBe('https://apis.do/events/integration/stripe')
  })

  it('returns github discovery', async () => {
    const res = await app.request('https://apis.do/github')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.discover['Repositories']).toBe('https://apis.do/github/repos')
    expect(body.links.events).toBe('https://apis.do/events/integration/github')
  })
})

describe('Service Catch-All', () => {
  it('returns service detail for known service', async () => {
    const res = await app.request('https://apis.do/analytics')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.service).toBeDefined()
    expect(body.service.name).toBe('analytics')
    expect(body.links.api).toBe('https://apis.do/analytics')
    expect(body.links.also).toBe('https://analytics.do/api')
  })

  it('returns 404 for unknown service', async () => {
    const res = await app.request('https://apis.do/nonexistent-service-xyz')
    expect(res.status).toBe(404)
  })
})

describe('Category Detail', () => {
  it('returns category with services under semantic key', async () => {
    const res = await app.request('https://apis.do/categories/infrastructure')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.category.slug).toBe('infrastructure')
    expect(body.category.services).toBeDefined()
    expect(body.category.services.length).toBeGreaterThan(3)
    expect(body.category.services[0].api).toMatch(/^https:\/\/apis\.do\//)
    expect(body.category.services[0].also).toMatch(/\.do\/api$/)
  })
})

describe('Alias Resolution Routes', () => {
  it('redirects /db to /database', async () => {
    const res = await app.request('https://apis.do/db', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://apis.do/database')
  })

  it('redirects /fn to /functions', async () => {
    const res = await app.request('https://apis.do/fn', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://apis.do/functions')
  })

  it('does not redirect canonical paths', async () => {
    const res = await app.request('https://apis.do/database')
    expect(res.ok).toBe(true)
    // Should not be a redirect
    expect(res.status).not.toBe(302)
  })
})

describe('Entity ID Resolution', () => {
  // The catch-all route /:id handles self-describing entity IDs.
  // In the test environment, c.env is undefined (app.request() bypasses miniflare),
  // so RPC calls to EVENTS, AUTH, PAYMENTS, and DATABASE throw.
  // Tests verify the routing logic and graceful error handling.

  it('request_<rayId> returns request trace fallback', async () => {
    const res = await app.request('https://apis.do/request_abc123def')
    expect(res.status).toBe(200)

    const body = await res.json()
    // Falls through EVENTS.sql() failure to the fallback response
    expect(body.$type).toBe('Request')
    expect(body.$id).toBe('request_abc123def')
    expect(body.request).toBeDefined()
    expect(body.request.id).toBe('request_abc123def')
    expect(body.request.cfRay).toBe('abc123def')
    expect(body.links.events).toBe('https://apis.do/events')
  })

  it('req_<rayId> short prefix also works', async () => {
    const res = await app.request('https://apis.do/req_9d2ed000983652a6')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.$type).toBe('Request')
    expect(body.$id).toBe('req_9d2ed000983652a6')
    expect(body.request).toBeDefined()
    expect(body.request.cfRay).toBe('9d2ed000983652a6')
    expect(body.links.events).toBe('https://apis.do/events')
  })

  it('request_ with colo suffix strips it for cfRay', async () => {
    const res = await app.request('https://apis.do/request_9d2ed000983652a6-ORD')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.$type).toBe('Request')
    expect(body.$id).toBe('request_9d2ed000983652a6-ORD')
    // cfRay should have the colo suffix stripped
    expect(body.request.cfRay).toBe('9d2ed000983652a6')
  })

  it('org_<id> returns structured error without bindings', async () => {
    // org_ is parsed as entity ID, resolves to 'organization' via TYPE_SYNONYMS,
    // then tries AUTH RPC which fails because c.env is undefined.
    // The framework returns a structured 500 error — not a crash.
    const res = await app.request('https://apis.do/org_abc')
    expect(res.status).toBe(500)

    const body = await res.json()
    // Structured error response from the framework error handler
    expect(body.error).toBeDefined()
    expect(body.error.message).toBeDefined()
    expect(body.api.name).toBe('apis.do')
  })

  it('cus_<id> routes to PAYMENTS (structured error without bindings)', async () => {
    // cus_ is in STRIPE_PREFIXES, so it tries to fetch PAYMENTS binding.
    // Without bindings, c.env is undefined → framework catches and returns 500.
    const res = await app.request('https://apis.do/cus_abc')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.api.name).toBe('apis.do')
  })

  it('sub_<id> routes to PAYMENTS (Stripe prefix)', async () => {
    // sub_ is also a Stripe prefix (subscriptions)
    const res = await app.request('https://apis.do/sub_test123')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.api.name).toBe('apis.do')
  })

  it('contact_<sqid> redirects to database convention', async () => {
    // contact_ is a known entity type from @headlessly/sdk.
    // The catch-all internally redirects to /api/contacts/contact_abc.
    // Without DATABASE binding, it returns 500 — but the self link
    // proves the redirect happened.
    const res = await app.request('https://apis.do/contact_abc')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBeDefined()
    // The self link shows the internal redirect resolved to the database convention path
    expect(body.links.self).toBe('https://apis.do/api/contacts/contact_abc')
  })

  it('deal_<sqid> redirects to database convention', async () => {
    const res = await app.request('https://apis.do/deal_kRziM')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBeDefined()
    // Proves routing: deal → deals collection
    expect(body.links.self).toBe('https://apis.do/api/deals/deal_kRziM')
  })
})
