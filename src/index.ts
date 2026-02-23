import { API, authLevelMiddleware, requireAuth } from '@dotdo/api'
import { buildRegistry, searchServices, getService, getCategory, listCategories } from './registry'
import { chQuery, formatCount, getChCredentials } from './clickhouse'

declare module '@dotdo/api' {
  interface Bindings extends Cloudflare.Env {
    CLICKHOUSE_URL?: string
    CLICKHOUSE_PASSWORD?: string
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
  // 'events' — handled by ClickHouse analytics routes, not entity proxy
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

// ── ClickHouse event category filters ─────────────────────────────────────────
const EVENT_CATEGORIES: Record<string, { types: string[]; like?: string; label: string }> = {
  system: { types: ['request', 'rpc', 'trace'], label: 'System Events' },
  data: { types: ['cdc'], label: 'Data Events (CDC)' },
  integration: { types: ['webhook'], label: 'Integration Events' },
  agent: { types: [], like: 'llm.%', label: 'Agent Events' },
  user: { types: ['pageview', 'track', 'identify', 'page'], label: 'User Events' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeInt(val: string | undefined, fallback: number, min: number, max: number): number {
  const n = parseInt(val || String(fallback), 10)
  return Math.min(Math.max(isNaN(n) ? fallback : n, min), max)
}

function parseSince(since: string | null): string | null {
  if (!since) return null
  const match = since.match(/^(\d+)(h|d|m)$/)
  if (!match) return null
  const [, num, unit] = match
  const intervals: Record<string, string> = { h: 'HOUR', d: 'DAY', m: 'MINUTE' }
  return `now() - INTERVAL ${num} ${intervals[unit]}`
}

function buildEventConditions(
  opts: { type?: string | null; event?: string | null; source?: string | null; since?: string | null; excludeTail?: boolean },
  extraConditions: string[] = [],
): { where: string; params: Record<string, string | number> } {
  const conditions: string[] = [...extraConditions]
  const params: Record<string, string | number> = {}

  if (opts.type) {
    params.type = opts.type
    conditions.push('type = {type:String}')
  }
  if (opts.event) {
    params.event = opts.event
    conditions.push('event = {event:String}')
  }
  if (opts.source) {
    params.source = opts.source
    conditions.push('source = {source:String}')
  } else if (opts.excludeTail !== false) {
    conditions.push("source != 'tail'")
  }

  const sinceExpr = parseSince(opts.since)
  if (sinceExpr) {
    conditions.push(`ts >= ${sinceExpr}`)
  } else if (!opts.since) {
    conditions.push('ts >= now() - INTERVAL 7 DAY')
  }

  return { where: conditions.length ? conditions.join(' AND ') : '1=1', params }
}

async function queryEventsFacets(
  env: Record<string, unknown>,
  where: string,
  params: Record<string, string | number>,
): Promise<{ total: number; facets: Record<string, string> }> {
  const [countData, facetData] = await Promise.all([
    chQuery(env, `SELECT count() AS total FROM events WHERE ${where}`, params),
    chQuery(env, `SELECT type, count() AS cnt FROM events WHERE ${where} GROUP BY type ORDER BY cnt DESC LIMIT 20`, params),
  ])

  const total = Number(countData[0]?.total ?? 0)
  const facets: Record<string, string> = {}
  for (const row of facetData) {
    const t = String(row.type)
    const cnt = Number(row.cnt)
    facets[`${t} (${formatCount(cnt)})`] = `${base}/events?type=${t}`
  }

  return { total, facets }
}

async function querySubFacets(
  env: Record<string, unknown>,
  where: string,
  params: Record<string, string | number>,
): Promise<Record<string, string>> {
  const facetData = await chQuery(env, `SELECT event, count() AS cnt FROM events WHERE ${where} GROUP BY event ORDER BY cnt DESC LIMIT 20`, params)
  const facets: Record<string, string> = {}
  for (const row of facetData) {
    const e = String(row.event)
    const cnt = Number(row.cnt)
    facets[`${e} (${formatCount(cnt)})`] = `${base}/events?event=${e}`
  }
  return facets
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = API({
  name: 'apis.do',
  description: 'Managed API Gateway for the .do ecosystem',
  version: '0.4.0',
  auth: { mode: 'optional' },
  mcp: { name: 'apis.do', version: '0.4.0' },
  landing: async (c) => {
    // Try to fetch live event type facets from ClickHouse
    let eventFacets: Record<string, string> | null = null
    try {
      if (getChCredentials(c.env)) {
        const facetData = await chQuery(
          c.env,
          'SELECT type, count() AS cnt FROM events WHERE ts >= now() - INTERVAL 7 DAY GROUP BY type ORDER BY cnt DESC LIMIT 10',
        )
        eventFacets = {}
        for (const row of facetData) {
          const t = String(row.type)
          const cnt = Number(row.cnt)
          eventFacets[`${t} (${formatCount(cnt)})`] = `${base}/events?type=${t}`
        }
      }
    } catch {
      // Graceful degradation — show discover without counts
    }

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
        ...(eventFacets ? { '---': '---', ...eventFacets } : {}),
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
    app.use('*', authLevelMiddleware())

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

    // ==================== Events — Live from ClickHouse ====================
    // Events require verified org (L3) + admin role.
    // Future: allow tenant-scoped event access for non-admin org members.
    app.use('/events/*', requireAuth('verified'))
    app.use('/events', requireAuth('verified'))

    // After L3 gate, check admin role via AUTH RPC binding
    const requireEventsAdmin = async (c: any, next: any) => {
      const token = c.req.header('authorization')?.replace('Bearer ', '') || c.req.header('cookie')?.match(/(?:auth|wos-session)=([^;]+)/)?.[1]
      if (token && c.env?.AUTH?.isAdmin) {
        const isAdmin = await c.env.AUTH.isAdmin(token)
        if (!isAdmin) {
          return c.json({ error: 'Admin access required — event data is restricted to organization administrators' }, 403)
        }
      }
      return next()
    }
    app.use('/events/*', requireEventsAdmin)
    app.use('/events', requireEventsAdmin)

    app.get('/events', async (c) => {
      if (!getChCredentials(c.env)) {
        return c.var.respond({
          data: {
            'System Events': `${base}/events/system`,
            'Data Events (CDC)': `${base}/events/data`,
            'Integration Events': `${base}/events/integration`,
            'Agent Events': `${base}/events/agent`,
            'User Events': `${base}/events/user`,
          },
          key: 'discover',
          links: { also: 'https://events.do/api', docs: 'https://docs.headless.ly/events' },
        })
      }

      try {
        const limit = safeInt(c.req.query('limit'), 20, 1, 1000)
        const offset = safeInt(c.req.query('offset'), 0, 0, 1_000_000)
        const { where, params } = buildEventConditions({
          type: c.req.query('type'),
          event: c.req.query('event'),
          source: c.req.query('source'),
          since: c.req.query('since'),
        })

        const { total, facets } = await queryEventsFacets(c.env, where, params)

        const links: Record<string, string> = {
          also: 'https://events.do/api',
          docs: 'https://docs.headless.ly/events',
        }
        if (offset + limit < total) {
          links.next = `${base}/events?limit=${limit}&offset=${offset + limit}${c.req.query('type') ? `&type=${c.req.query('type')}` : ''}${c.req.query('since') ? `&since=${c.req.query('since')}` : ''}`
        }
        if (offset > 0) {
          links.prev = `${base}/events?limit=${limit}&offset=${Math.max(0, offset - limit)}${c.req.query('type') ? `&type=${c.req.query('type')}` : ''}${c.req.query('since') ? `&since=${c.req.query('since')}` : ''}`
        }

        return c.var.respond({
          data: facets,
          key: 'discover',
          total,
          limit,
          links,
          options: {
            'Last Hour': `${base}/events?since=1h`,
            'Last 24 Hours': `${base}/events?since=24h`,
            'Last Week': `${base}/events?since=7d`,
            'Last 30 Days': `${base}/events?since=30d`,
          },
        })
      } catch (err) {
        console.error('[events] ClickHouse query failed:', err)
        return c.json({ error: 'ClickHouse Cloud unavailable' }, 503)
      }
    })

    // Event sub-categories
    for (const [category, config] of Object.entries(EVENT_CATEGORIES)) {
      app.get(`/events/${category}`, async (c) => {
        if (!getChCredentials(c.env)) {
          return c.json({ error: 'ClickHouse not configured' }, 503)
        }

        try {
          const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 1000)
          const offset = parseInt(c.req.query('offset') || '0', 10)

          const extraConditions: string[] = []
          if (config.types.length) {
            extraConditions.push(`type IN (${config.types.map((t) => `'${t}'`).join(', ')})`)
          }
          if (config.like) {
            extraConditions.push(`type LIKE '${config.like}'`)
          }

          const { where, params } = buildEventConditions(
            {
              event: c.req.query('event'),
              source: c.req.query('source'),
              since: c.req.query('since'),
            },
            extraConditions,
          )

          const [{ total, facets }, subFacets] = await Promise.all([
            queryEventsFacets(c.env, where, params),
            querySubFacets(c.env, where, params),
          ])

          return c.var.respond({
            data: Object.keys(subFacets).length ? subFacets : facets,
            key: 'discover',
            total,
            limit,
            links: {
              parent: `${base}/events`,
              also: `https://events.do/api/${category}`,
            },
            options: {
              'Last Hour': `${base}/events/${category}?since=1h`,
              'Last 24 Hours': `${base}/events/${category}?since=24h`,
              'Last Week': `${base}/events/${category}?since=7d`,
            },
          })
        } catch (err) {
          console.error(`[events/${category}] ClickHouse query failed:`, err)
          return c.json({ error: 'ClickHouse Cloud unavailable' }, 503)
        }
      })
    }

    // Integration drill-down by provider
    app.get('/events/integration/:provider', async (c) => {
      const provider = c.req.param('provider')

      if (!getChCredentials(c.env)) {
        const svc = getService(registry, provider)
        return c.var.respond({
          data: { provider, description: svc?.description || `${provider} integration events`, status: svc ? 'connected' : 'available' },
          key: 'integration',
          links: { parent: `${base}/events/integration`, also: `https://${provider}.do/api/events` },
        })
      }

      try {
        const { where, params } = buildEventConditions(
          { since: c.req.query('since') },
          ['type = {_wh_type:String}', 'event LIKE {_providerPrefix:String}'],
        )
        params._wh_type = 'webhook'
        params._providerPrefix = `${provider}.%`

        const subFacets = await querySubFacets(c.env, where, params)
        const countData = await chQuery(c.env, `SELECT count() AS total FROM events WHERE ${where}`, params)
        const total = Number(countData[0]?.total ?? 0)

        return c.var.respond({
          data: subFacets,
          key: 'discover',
          total,
          links: {
            parent: `${base}/events/integration`,
            also: `https://${provider}.do/api/events`,
            webhooks: `${base}/${provider}/webhooks`,
          },
          options: {
            'Last Hour': `${base}/events/integration/${provider}?since=1h`,
            'Last 24 Hours': `${base}/events/integration/${provider}?since=24h`,
            'Last Week': `${base}/events/integration/${provider}?since=7d`,
          },
        })
      } catch (err) {
        console.error(`[events/integration/${provider}] ClickHouse query failed:`, err)
        return c.json({ error: 'ClickHouse Cloud unavailable' }, 503)
      }
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
        if (getChCredentials(c.env)) {
          const facetData = await chQuery(
            c.env,
            "SELECT event, count() AS cnt FROM events WHERE type = 'webhook' AND event LIKE 'stripe.%' AND ts >= now() - INTERVAL 7 DAY GROUP BY event ORDER BY cnt DESC LIMIT 10",
          )
          for (const row of facetData) {
            eventFacets[`${row.event} (${formatCount(Number(row.cnt))})`] = `${base}/events?event=${row.event}`
          }
        }
      } catch (err) {
        console.error('[stripe] ClickHouse facet query failed:', err)
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
        if (getChCredentials(c.env)) {
          const facetData = await chQuery(
            c.env,
            "SELECT event, count() AS cnt FROM events WHERE type = 'webhook' AND event LIKE 'github.%' AND ts >= now() - INTERVAL 7 DAY GROUP BY event ORDER BY cnt DESC LIMIT 10",
          )
          for (const row of facetData) {
            eventFacets[`${row.event} (${formatCount(Number(row.cnt))})`] = `${base}/events?event=${row.event}`
          }
        }
      } catch (err) {
        console.error('[github] ClickHouse facet query failed:', err)
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

    // ==================== Service-Scoped Catch-All ====================

    app.get('/:service', (c) => {
      const name = c.req.param('service')
      const svc = getService(registry, name)
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
