import { API, parseEntityId, authLevelMiddleware, requireAuth } from '@dotdo/api'
import type { ApiEnv } from '@dotdo/api'
import type { Context, Hono, Next } from 'hono'

/** EventsService RPC stub — wrangler types only see generic Service, but the real binding exposes sql() */
type EventsRPC = { sql: (query: string, params?: Record<string, unknown>) => Promise<{ data: Record<string, unknown>[] }> }
import { getAllNouns } from 'digital-objects'
import { buildRegistry, searchServices, getService, getCategory, listCategories } from './registry'
import { formatCount } from './clickhouse'
import { buildNavigator } from './primitives'
import { resolve } from './aliases'
import { resolveType, STRIPE_PREFIXES } from './type-synonyms'

// Side-effect: register all 35 nouns in the global noun registry
import '@headlessly/sdk'

declare module '@dotdo/api' {
  interface Bindings extends Cloudflare.Env {}
}

const registry = buildRegistry()
const base = 'https://apis.do'

/** Extract tenant from request context */
const extractTenant = (c: { req: { header: (name: string) => string | undefined } }) => c.req.header('x-tenant') ?? 'default'

// ── App ───────────────────────────────────────────────────────────────────────

const app = API({
  name: 'apis.do',
  description: 'Managed API Gateway for the .do ecosystem',
  version: '0.5.0',
  auth: { mode: 'optional' },
  mcp: { name: 'apis.do', version: '0.5.0' },
  database: {
    nounRegistry: getAllNouns,
    objects: 'OBJECTS',
    database: 'DATABASE',
    namespace: extractTenant,
    idFormat: 'sqid',
    mcp: true,
    rest: { basePath: '/api' },
  },
  events: {
    scope: '*',
    topLevelRoutes: false,
    auth: 'superadmin',
  },
  landing: (c: Context<ApiEnv>) => {
    const useDomains = c.req.query('domains') !== undefined
    const nav = buildNavigator(base, !useDomains)
    return c.var.respond({
      ...nav,
      actions: {
        [useDomains ? 'Show Local Paths' : 'Show .do Domains']: useDomains ? `${base}/` : `${base}/?domains`,
      },
    })
  },
  functions: {
    functions: [
      {
        name: 'search',
        description: 'Search .do APIs by name or category',
        input: { type: 'object', properties: { q: { type: 'string' } } },
        handler: async (input: unknown) => {
          const q = (input as { q?: string })?.q?.toLowerCase() || ''
          return q ? searchServices(registry, q) : registry.services
        },
      },
    ],
  },
  routes: (app: Hono<ApiEnv>) => {
    // ==================== Alias Resolution ====================
    // Redirect abbreviated paths to canonical names (e.g., /db → /database, /fn → /functions)
    app.use('/:name{[a-z][a-z0-9-]*}', async (c: Context<ApiEnv>, next: Next) => {
      const name = c.req.param('name')
      const canonical = resolve(name)
      if (canonical !== name) {
        const url = new URL(c.req.url)
        url.pathname = url.pathname.replace(`/${name}`, `/${canonical}`)
        return c.redirect(url.toString(), 302)
      }
      await next()
    })

    // ==================== Auth-Gating for /api/* (database convention routes) ====================

    app.use('/api/*', authLevelMiddleware())
    app.post('/api/*', requireAuth())
    app.put('/api/*', requireAuth())
    app.delete('/api/*', requireAuth())

    // ==================== Identity / Debug ====================

    app.get('/me', (c: Context<ApiEnv>) => {
      const user = c.get('user' as never) as { authenticated: boolean } | undefined
      if (!user?.authenticated) {
        return c.var.respond({
          error: { message: 'Not authenticated', code: 'UNAUTHORIZED', status: 401 },
          links: { login: `${base}/login` },
          status: 401,
        })
      }
      return c.var.respond({ data: user, key: 'user' })
    })

    // ==================== Search ====================

    app.get('/search', (c: Context<ApiEnv>) => {
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

    app.get('/services', (c: Context<ApiEnv>) => {
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

    app.get('/services/:name', (c: Context<ApiEnv>) => {
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

    app.get('/categories', (c: Context<ApiEnv>) => {
      const cats = listCategories(registry).map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        url: `${base}/categories/${cat.slug}`,
        count: cat.services.length,
      }))
      return c.var.respond({ data: cats, key: 'categories', total: cats.length })
    })

    app.get('/categories/:slug', (c: Context<ApiEnv>) => {
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

    app.get('/apis', (c: Context<ApiEnv>) => {
      const q = c.req.query('q')?.toLowerCase()
      const results = q ? searchServices(registry, q) : registry.services
      return c.var.respond({ data: results, key: 'apis', total: results.length })
    })

    // ==================== Integration Namespaces ====================

    app.get('/stripe', async (c: Context<ApiEnv>) => {
      let eventFacets: Record<string, string> = {}
      try {
        const result = await (c.env.EVENTS as unknown as EventsRPC).sql(
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

    app.get('/github', async (c: Context<ApiEnv>) => {
      let eventFacets: Record<string, string> = {}
      try {
        const result = await (c.env.EVENTS as unknown as EventsRPC).sql(
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

    // ==================== Auth Proxy ====================

    app.all('/login', (c: Context<ApiEnv>) => c.env.OAUTH.fetch(c.req.raw))
    app.all('/callback', (c: Context<ApiEnv>) => c.env.OAUTH.fetch(c.req.raw))
    app.all('/logout', (c: Context<ApiEnv>) => c.env.OAUTH.fetch(c.req.raw))
    app.all('/.well-known/*', (c: Context<ApiEnv>) => c.env.OAUTH.fetch(c.req.raw))
    app.all('/oauth/*', (c: Context<ApiEnv>) => c.env.OAUTH.fetch(c.req.raw))
    app.all('/verify', (c: Context<ApiEnv>) => c.env.OAUTH.fetch(c.req.raw))
    app.all('/claim/*', (c: Context<ApiEnv>) => c.env.OAUTH.fetch(c.req.raw))
    app.all('/device', (c: Context<ApiEnv>) => c.env.OAUTH.fetch(c.req.raw))
    app.all('/admin-portal', (c: Context<ApiEnv>) => c.env.OAUTH.fetch(c.req.raw))

    // ==================== Self-Describing ID + Service Catch-All ====================
    // Handles three patterns:
    //   1. request_<ray>-<colo> / req_<ray>  → Request trace lookup (ClickHouse)
    //   2. <type>_<sqid>                      → Entity lookup (type-specific routing)
    //   3. <name>                             → Service registry lookup

    app.get('/:id', async (c: Context<ApiEnv>) => {
      const id = c.req.param('id')

      // 1. Request trace (request_* or req_* — contains hyphens so doesn't match isEntityId)
      if (id.startsWith('request_') || id.startsWith('req_')) {
        const prefix = id.startsWith('request_') ? 'request_' : 'req_'
        const rawRay = id.slice(prefix.length) // e.g. '9d2ed000983652a6-ORD' or '9d2ed000983652a6'
        const cfRay = rawRay.includes('-') ? rawRay.split('-')[0] : rawRay // strip colo suffix — ClickHouse stores ray without colo

        // Check cache first (cf-ray lookups are expensive — full table scan on JSON column)
        const rayCacheKey = `${base}/_cache/ray/${cfRay}`
        try {
          const cached = await caches.default.match(new Request(rayCacheKey))
          if (cached) {
            const data = await cached.json()
            return c.var.respond(data as Record<string, unknown>)
          }
        } catch {
          /* fall through */
        }

        try {
          const result = await (c.env.EVENTS as unknown as EventsRPC).sql(
            `SELECT id, ns, ts, type, event, source, data
             FROM platform.events
             WHERE source = 'tail'
               AND data.event.request.headers.\`cf-ray\`::String = {cfRay:String}
             ORDER BY id DESC
             LIMIT 50`,
            { cfRay },
          )
          if (result.data.length) {
            // Deduplicate (ReplacingMergeTree may not have merged yet)
            const seen = new Set<string>()
            const unique = result.data.filter((r: Record<string, unknown>) => {
              const rid = (r as Record<string, unknown>).id as string
              if (seen.has(rid)) return false
              seen.add(rid)
              return true
            })
            const body = {
              $type: 'Request' as const,
              $id: id,
              data: unique.length === 1 ? unique[0] : unique,
              key: unique.length === 1 ? 'request' : 'trace',
              total: unique.length,
              links: { events: `${base}/events` },
            }
            // Cache for 1 hour
            try {
              await caches.default.put(
                new Request(rayCacheKey),
                new Response(JSON.stringify(body), { headers: { 'Cache-Control': 'max-age=3600' } }),
              )
            } catch {
              /* non-fatal */
            }
            return c.var.respond(body)
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

      // 2. Entity ID (type_sqid format — e.g. contact_abc, deal_kRziM, org_xxx)
      const parsed = parseEntityId(id)
      if (parsed) {
        const canonicalType = resolveType(parsed.type)

        // 2a. org_* / user_* → resolve from AUTH RPC (source of truth for identity)
        if ((canonicalType === 'organization' || canonicalType === 'user') && c.env.AUTH) {
          try {
            if (canonicalType === 'organization') {
              const org = await (c.env.AUTH as unknown as { getOrganization: (id: string) => Promise<Record<string, unknown> | null> }).getOrganization(
                parsed.id,
              )
              if (org) {
                return c.var.respond({
                  $type: 'Organization',
                  $id: parsed.id,
                  data: org,
                  key: 'organization',
                })
              }
            }
          } catch (err) {
            console.error(`[entity] AUTH RPC failed for ${parsed.id}:`, err)
          }
        }

        // 2b. Stripe-native IDs → route to PAYMENTS
        if (STRIPE_PREFIXES.has(parsed.type) && c.env.PAYMENTS) {
          try {
            const url = new URL(c.req.url)
            url.pathname = `/api/${id}`
            return c.env.PAYMENTS.fetch(new Request(url.toString(), { method: 'GET', headers: c.req.raw.headers }))
          } catch (err) {
            console.error(`[entity] PAYMENTS fetch failed for ${id}:`, err)
          }
        }

        // 2c. Everything else → internal redirect to /api/:collection/:id (database convention)
        const url = new URL(c.req.url)
        url.pathname = `/api/${parsed.collection}/${parsed.id}`
        return app.fetch(new Request(url.toString(), c.req.raw))
      }

      // 3. Known service name → service detail
      const svc = getService(registry, id)
      if (svc) {
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
      }

      // 4. Unknown → 404
      return c.notFound()
    })
  },
})

export default app
