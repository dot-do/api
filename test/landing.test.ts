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
  it('rejects unauthenticated requests to /events with 401', async () => {
    const res = await app.request('https://apis.do/events')
    expect(res.status).toBe(401)
  })

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

describe('Entity Proxy', () => {
  const mockHeadlessly = {
    fetch: (req: Request) => {
      const url = new URL(req.url)
      return new Response(JSON.stringify({ data: [], total: 0, path: url.pathname }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  }
  const env = { HEADLESSLY: mockHeadlessly } as unknown as Record<string, unknown>

  it('proxies /contacts to HEADLESSLY service binding', async () => {
    const res = await app.request('https://apis.do/contacts', {}, env)
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.path).toBe('/api/contacts')
  })

  it('proxies /contacts/:id to HEADLESSLY', async () => {
    const res = await app.request('https://apis.do/contacts/contact_abc123', {}, env)
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.path).toBe('/api/contacts/contact_abc123')
  })

  it('proxies /deals to HEADLESSLY', async () => {
    const res = await app.request('https://apis.do/deals', {}, env)
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.path).toBe('/api/deals')
  })

  it('returns 503 when HEADLESSLY binding not available', async () => {
    const res = await app.request('https://apis.do/contacts')
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.error).toBe('Entity service unavailable')
  })
})

describe('Static Discovery Routes', () => {
  it('returns database collections without emojis', async () => {
    const res = await app.request('https://apis.do/database')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.collections).toBeDefined()
    expect(body.collections['Users']).toBe('https://apis.do/users')
    for (const key of Object.keys(body.collections)) {
      expect(key).not.toMatch(/[\u{1F000}-\u{1FFFF}]/u)
    }
  })

  it('returns functions discovery', async () => {
    const res = await app.request('https://apis.do/functions')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.discover['Code Functions']).toBe('https://apis.do/functions/code')
  })

  it('returns workflows discovery', async () => {
    const res = await app.request('https://apis.do/workflows')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.discover['All Workflows']).toBe('https://apis.do/workflows/all')
  })

  it('returns agents discovery', async () => {
    const res = await app.request('https://apis.do/agents')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.discover['All Agents']).toBe('https://apis.do/agents/all')
  })

  it('returns integrations discovery', async () => {
    const res = await app.request('https://apis.do/integrations')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.discover['Stripe']).toBe('https://apis.do/stripe')
    expect(body.discover['GitHub']).toBe('https://apis.do/github')
  })

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

  it('returns payments discovery', async () => {
    const res = await app.request('https://apis.do/payments')
    expect(res.ok).toBe(true)

    const body = await res.json()
    expect(body.discover['Payment Methods']).toBe('https://apis.do/payments/methods')
  })
})

describe('Service Catch-All', () => {
  it('redirects known services to their .do domain', async () => {
    const res = await app.request('https://apis.do/analytics', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://analytics.do')
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
