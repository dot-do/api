import { API, parseEntityId } from '@dotdo/api'
import { buildRegistry, searchServices, getService, getCategory, listCategories } from './registry'
import { formatCount } from './clickhouse'

declare module '@dotdo/api' {
  interface Bindings extends Cloudflare.Env {
    HEADLESSLY?: Fetcher
  }
}

const registry = buildRegistry()
const base = 'https://apis.do'

// ── Entity types for proxy to headlessly-api ──────────────────────────────────
const ENTITY_PLURALS = new Set([
  'users',
  'api-keys',
  'organizations',
  'contacts',
  'leads',
  'deals',
  'activities',
  'pipelines',
  'customers',
  'products',
  'plans',
  'prices',
  'subscriptions',
  'invoices',
  'payments',
  'projects',
  'issues',
  'comments',
  'content',
  'assets',
  'sites',
  'tickets',
  // 'events' — handled by eventsConvention via EVENTS service binding, not entity proxy
  'metrics',
  'funnels',
  'goals',
  'campaigns',
  'segments',
  'forms',
  'experiments',
  'feature-flags',
  'workflows',
  'integrations',
  'agents',
  'messages',
])

// ── App ───────────────────────────────────────────────────────────────────────

const app = API({
  name: 'apis.do',
  description: 'Managed API Gateway for the .do ecosystem',
  version: '0.4.0',
  auth: { mode: 'optional' },
  mcp: { name: 'apis.do', version: '0.4.0' },
  events: {
    scope: '*',
    topLevelRoutes: false,
    auth: 'admin',
  },
  landing: (c) => {
    return c.var.respond({
      data: {
        'Search APIs': `${base}/search?q=database`,
        [`All Services (${registry.services.length})`]: `${base}/services`,
        'Browse Categories': `${base}/categories`,
        'Event Streams': `${base}/events`,
        'Functions': `${base}/functions`,
        'Workflows': `${base}/workflows`,
        'Agents': `${base}/agents`,
        'Database': `${base}/database`,
        'Payments': `${base}/payments`,
        'Integrations': `${base}/integrations`,
        'Identity & Auth': `${base}/oauth`,
      },
      key: 'discover',
      links: {
        mcp: `${base}/mcp`,
        rpc: `${base}/rpc`,
        sdk: `${base}/sdk`,
      },
      actions: {
        'Toggle Link Domains': `${base}/?domains=true`,
      },
    })
  },
  functions: {
    functions: [
      {
        name: 'search',
        description: 'Search .do APIs by name or category',
        input: { type: 'object', properties: { q: { type: 'string' } } },
        handler: async (input) => {
          const q = (input as { q?: string })?.q?.toLowerCase() || ''
          return q ? searchServices(registry, q) : registry.services
        },
      },
    ],
  },
  routes: (app) => {
    // ==================== Search ====================

    app.get('/search', (c) => {
      const q = c.req.query('q')?.toLowerCase() || ''
      if (!q) {
        return c.var.respond({
          data: {
            'Search Services': `${base}/search?q=database`,
            'Search by Category': `${base}/search?q=ai`,
            'Search Agents': `${base}/search?q=agent`,
            'Search Functions': `${base}/search?q=function`,
          },
          key: 'discover',
        })
      }
      const results = searchServices(registry, q)
      return c.var.respond({
        data: results,
        key: 'results',
        total: results.length,
        options: {
          'Services Only': `${base}/services?q=${q}`,
          'By Category': `${base}/categories`,
        },
      })
    })

    // ==================== Service Registry ====================

    app.get('/services', (c) => {
      const q = c.req.query('q')?.toLowerCase()
      const cat = c.req.query('category')
      let results = registry.services
      if (q) results = searchServices(registry, q)
      if (cat) results = results.filter((s) => s.category === cat)
      return c.var.respond({
        data: results,
        key: 'services',
        total: results.length,
        options: {
          'By Category': `${base}/categories`,
          'AI Services': `${base}/services?category=ai`,
          'Infrastructure': `${base}/services?category=infrastructure`,
          'Compute': `${base}/services?category=compute`,
          'Events': `${base}/services?category=events`,
          'Identity': `${base}/services?category=identity`,
        },
      })
    })

    app.get('/services/:name', (c) => {
      const svc = getService(registry, c.req.param('name'))
      if (!svc) return c.notFound()
      return c.var.respond({
        data: svc,
        key: 'service',
        links: {
          api: `${base}/${svc.name}`,
          also: `https://${svc.domain}/api`,
          events: `${base}/${svc.name}/events`,
          category: `${base}/categories/${svc.category}`,
        },
      })
    })

    app.get('/categories', (c) => {
      const cats = listCategories(registry).map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        url: `${base}/categories/${cat.slug}`,
        count: cat.services.length,
      }))
      return c.var.respond({ data: cats, key: 'categories', total: cats.length })
    })

    app.get('/categories/:slug', (c) => {
      const cat = getCategory(registry, c.req.param('slug'))
      if (!cat) return c.notFound()
      return c.var.respond({
        data: {
          ...cat,
          services: cat.services.map((s) => ({
            ...s,
            api: `${base}/${s.name}`,
            also: `https://${s.domain}/api`,
          })),
        },
        key: 'category',
      })
    })

    app.get('/apis', (c) => {
      const q = c.req.query('q')?.toLowerCase()
      const results = q ? searchServices(registry, q) : registry.services
      return c.var.respond({ data: results, key: 'apis', total: results.length })
    })

    // ==================== Static Discovery Routes ====================

    app.get('/database', (c) => {
      return c.var.respond({
        data: {
          'Schemas': `${base}/database/schemas`,
          'Collections': `${base}/database/collections`,
          'Queries': `${base}/database/queries`,
          'Migrations': `${base}/database/migrations`,
        },
        key: 'discover',
        links: { also: 'https://database.do/api', docs: 'https://docs.headless.ly/database' },
        actions: {
          'Create Collection': `POST ${base}/database/collections`,
          'Run Query': `POST ${base}/database/queries`,
        },
      })
    })

    app.get('/functions', (c) => {
      return c.var.respond({
        data: {
          'Code Functions': `${base}/functions/code`,
          'Generative (AI)': `${base}/functions/generative`,
          'Agentic Functions': `${base}/functions/agentic`,
          'Human-in-the-Loop': `${base}/functions/human`,
        },
        key: 'discover',
        links: { also: 'https://functions.do/api', docs: 'https://docs.headless.ly/functions' },
        actions: { 'Execute Function': `POST ${base}/functions/{name}` },
      })
    })

    app.get('/workflows', (c) => {
      return c.var.respond({
        data: {
          'All Workflows': `${base}/workflows/all`,
          'Triggers': `${base}/workflows/triggers`,
          'Recent Runs': `${base}/workflows/runs`,
        },
        key: 'discover',
        links: { also: 'https://workflows.do/api', docs: 'https://docs.headless.ly/workflows' },
        actions: { 'Execute Workflow': `POST ${base}/workflows/{name}` },
      })
    })

    app.get('/agents', (c) => {
      return c.var.respond({
        data: {
          'All Agents': `${base}/agents/all`,
          'Priya (Sales)': 'https://priya.do/api',
          'Tom (Engineering)': 'https://tom.do/api',
          'Ralph (Research)': 'https://ralph.do/api',
        },
        key: 'discover',
        links: { also: 'https://agents.do/api', docs: 'https://docs.headless.ly/agents', events: `${base}/events/agent` },
        actions: { 'Create Agent': `POST ${base}/agents` },
      })
    })

    app.get('/integrations', (c) => {
      return c.var.respond({
        data: {
          'Stripe': `${base}/stripe`,
          'GitHub': `${base}/github`,
          'ClickHouse': `${base}/clickhouse`,
          'Slack': `${base}/slack`,
          'Email': `${base}/emails`,
        },
        key: 'discover',
        links: { also: 'https://integrations.do/api', docs: 'https://docs.headless.ly/integrations', events: `${base}/events/integration` },
      })
    })

    // ==================== Integration Namespaces ====================

    app.get('/stripe', async (c) => {
      let eventFacets: Record<string, string> = {}
      try {
        const result = await c.env.EVENTS.sql(
          "SELECT event, count() AS cnt FROM events WHERE type = 'webhook' AND event LIKE 'stripe.%' AND ts >= now() - INTERVAL 7 DAY GROUP BY event ORDER BY cnt DESC LIMIT 10",
        )
        for (const row of result.data) {
          eventFacets[`${row.event} (${formatCount(Number(row.cnt))})`] = `${base}/events?event=${row.event}`
        }
      } catch (err) {
        console.error('[stripe] EVENTS facet query failed:', err)
      }

      return c.var.respond({
        data: {
          'Customers': `${base}/stripe/customers`,
          'Invoices': `${base}/stripe/invoices`,
          'Subscriptions': `${base}/stripe/subscriptions`,
          'Payments': `${base}/stripe/payments`,
          'Products': `${base}/stripe/products`,
          'Prices': `${base}/stripe/prices`,
          ...(Object.keys(eventFacets).length ? { '---': '---', ...eventFacets } : {}),
        },
        key: 'discover',
        links: { also: 'https://stripe.do/api', events: `${base}/events/integration/stripe`, webhooks: `${base}/stripe/webhooks` },
      })
    })

    app.get('/github', async (c) => {
      let eventFacets: Record<string, string> = {}
      try {
        const result = await c.env.EVENTS.sql(
          "SELECT event, count() AS cnt FROM events WHERE type = 'webhook' AND event LIKE 'github.%' AND ts >= now() - INTERVAL 7 DAY GROUP BY event ORDER BY cnt DESC LIMIT 10",
        )
        for (const row of result.data) {
          eventFacets[`${row.event} (${formatCount(Number(row.cnt))})`] = `${base}/events?event=${row.event}`
        }
      } catch (err) {
        console.error('[github] EVENTS facet query failed:', err)
      }

      return c.var.respond({
        data: {
          'Repositories': `${base}/github/repos`,
          'Commits': `${base}/github/commits`,
          'Pull Requests': `${base}/github/pulls`,
          'Issues': `${base}/github/issues`,
          'Actions': `${base}/github/actions`,
          ...(Object.keys(eventFacets).length ? { '---': '---', ...eventFacets } : {}),
        },
        key: 'discover',
        links: { also: 'https://github.do/api', events: `${base}/events/integration/github`, webhooks: `${base}/github/webhooks` },
      })
    })

    app.get('/payments', (c) => {
      return c.var.respond({
        data: {
          'Payment Methods': `${base}/payments/methods`,
          'Invoices': `${base}/payments/invoices`,
          'Subscriptions': `${base}/payments/subscriptions`,
          'Revenue': `${base}/payments/revenue`,
          'Pricing Plans': `${base}/payments/plans`,
        },
        key: 'discover',
        links: { also: 'https://payments.do/api', stripe: `${base}/stripe`, docs: 'https://docs.headless.ly/payments' },
      })
    })

    // ==================== Entity Proxy (HEADLESSLY service binding) ====================

    for (const plural of ENTITY_PLURALS) {
      // GET /contacts, GET /contacts/:id etc.
      app.get(`/${plural}`, async (c) => {
        if (!c.env?.HEADLESSLY) return c.json({ error: 'Entity service unavailable' }, 503)
        const url = new URL(c.req.url)
        url.pathname = `/api${url.pathname}`
        const headers = new Headers(c.req.raw.headers)
        if (!headers.has('x-tenant')) headers.set('x-tenant', 'default')
        return c.env?.HEADLESSLY.fetch(new Request(url.toString(), { method: 'GET', headers }))
      })

      app.get(`/${plural}/:id`, async (c) => {
        if (!c.env?.HEADLESSLY) return c.json({ error: 'Entity service unavailable' }, 503)
        const url = new URL(c.req.url)
        url.pathname = `/api${url.pathname}`
        const headers = new Headers(c.req.raw.headers)
        if (!headers.has('x-tenant')) headers.set('x-tenant', 'default')
        return c.env?.HEADLESSLY.fetch(new Request(url.toString(), { method: 'GET', headers }))
      })

      // POST/PUT/DELETE proxy
      for (const method of ['POST', 'PUT', 'DELETE'] as const) {
        app.on(method, [`/${plural}`, `/${plural}/:id`], async (c) => {
          if (!c.env?.HEADLESSLY) return c.json({ error: 'Entity service unavailable' }, 503)
          const url = new URL(c.req.url)
          url.pathname = `/api${url.pathname}`
          const headers = new Headers(c.req.raw.headers)
          if (!headers.has('x-tenant')) headers.set('x-tenant', 'default')
          return c.env?.HEADLESSLY.fetch(new Request(url.toString(), { method, headers, body: c.req.raw.body }))
        })
      }
    }

    // ==================== Auth Proxy ====================

    app.all('/login', (c) => c.env.AUTH_HTTP.fetch(c.req.raw))
    app.all('/callback', (c) => c.env.AUTH_HTTP.fetch(c.req.raw))
    app.all('/logout', (c) => c.env.AUTH_HTTP.fetch(c.req.raw))
    app.all('/.well-known/*', (c) => c.env.AUTH_HTTP.fetch(c.req.raw))
    app.all('/oauth/*', (c) => c.env.AUTH_HTTP.fetch(c.req.raw))
    app.all('/verify', (c) => c.env.AUTH_HTTP.fetch(c.req.raw))
    app.all('/claim/*', (c) => c.env.AUTH_HTTP.fetch(c.req.raw))
    app.all('/device', (c) => c.env.AUTH_HTTP.fetch(c.req.raw))
    app.all('/admin-portal', (c) => c.env.AUTH_HTTP.fetch(c.req.raw))

    // ==================== Self-Describing ID + Service Catch-All ====================
    // Handles three patterns:
    //   1. request_<ray>-<colo>  → Request trace lookup (ClickHouse)
    //   2. <type>_<sqid>         → Entity lookup (HEADLESSLY proxy)
    //   3. <name>                → Service registry lookup

    app.get('/:id', async (c) => {
      const id = c.req.param('id')

      // 1. Request trace (request_* — contains hyphens so doesn't match isEntityId)
      if (id.startsWith('request_')) {
        const rawRay = id.slice('request_'.length) // e.g. '9d2ed000983652a6-ORD' or '9d2ed000983652a6'
        const cfRay = rawRay.includes('-') ? rawRay.split('-')[0] : rawRay // strip colo suffix — ClickHouse stores ray without colo

        try {
          // Query headlessly.events — data is a String column with full headers
          // (platform.events uses JSON type which prunes headers)
          const result = await c.env.EVENTS.sql(
            `SELECT id, ns, ts, type, event, source, data
             FROM headlessly.events
             WHERE JSONExtractString(data, 'event', 'request', 'headers', 'cf-ray') = {cfRay:String}
             ORDER BY ts DESC
             LIMIT 50`,
            { cfRay },
          )
          if (result.data.length) {
            // Parse the data string into JSON for each row
            const events = result.data.map((r) => {
              try { return { ...r, data: JSON.parse(r.data as string) } } catch { return r }
            })
            return c.var.respond({
              $type: 'Request',
              $id: id,
              data: events.length === 1 ? events[0] : events,
              key: events.length === 1 ? 'request' : 'trace',
              total: events.length,
              links: { events: `${base}/events` },
            })
          }
        } catch (err) {
          console.error('[request] EVENTS trace lookup failed:', err)
        }

        return c.var.respond({
          $type: 'Request',
          $id: id,
          data: { id, cfRay },
          key: 'request',
          links: { events: `${base}/events` },
        })
      }

      // 2. Entity ID (type_sqid format — e.g. contact_abc, deal_kRziM)
      const parsed = parseEntityId(id)
      if (parsed) {
        try {
          const result = await c.env.EVENTS.sql(
            `SELECT id, type, name, data, ns, updatedAt, updatedBy, v
             FROM data
             WHERE id = {id:String}
             ORDER BY v DESC
             LIMIT 1`,
            { id: parsed.id },
          )
          if (result.data.length) {
            const row = result.data[0]!
            return c.var.respond({
              $type: parsed.type,
              $id: parsed.id,
              data: row.data ?? row,
              key: parsed.type,
              links: {
                collection: `${base}/${parsed.collection}`,
              },
            })
          }
        } catch (err) {
          console.error(`[entity] EVENTS lookup failed for ${parsed.id}:`, err)
        }
        return c.notFound()
      }

      // 3. Service registry lookup (fallback)
      const svc = getService(registry, id)
      if (!svc) return c.notFound()

      return c.var.respond({
        data: {
          name: svc.name,
          domain: svc.domain,
          description: svc.description,
          category: svc.category,
          status: svc.status,
        },
        key: svc.name,
        links: {
          api: `${base}/${svc.name}`,
          also: `https://${svc.domain}/api`,
          events: `${base}/events`,
          category: `${base}/categories/${svc.category}`,
        },
      })
    })
  },
})

export default app
