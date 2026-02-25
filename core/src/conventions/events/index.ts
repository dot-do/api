// .do/api/core/src/conventions/events/index.ts

/**
 * Events Convention
 *
 * Adds event routes to any API() instance via EVENTS service binding.
 * No direct database access — all queries go through EventsService RPC.
 *
 * Routes:
 *   Top-level (when topLevelRoutes: true):
 *     GET /commits, /errors, /traces, /webhooks, /analytics, /ai, /cdc, /tail
 *   Always:
 *     GET /events             -> faceted discovery
 *     GET /events/:type       -> drill into specific type
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv } from '../../types'
import type { EventsConfig, EventCategory, EventsBinding } from './types'
import { DEFAULT_EVENT_CATEGORIES } from './types'
import { inferScope, formatCount, safeInt } from './helpers'
import { buildCursorPagination } from '../../helpers/pagination'

/** Extract ts cursors from event search results (DESC order: first=newest, last=oldest) */
function extractCursors(data: Record<string, unknown>[]): { nextCursor?: string; prevCursor?: string } {
  if (!data.length) return {}
  const last = data[data.length - 1]
  const first = data[0]
  return {
    nextCursor: last?.ts as string | undefined,
    prevCursor: first?.ts as string | undefined,
  }
}
import { requireAuth } from '../../middleware'

export type { EventsConfig, EventCategory, EventsBinding } from './types'
export { DEFAULT_EVENT_CATEGORIES } from './types'

interface ConventionResult {
  routes: Hono<ApiEnv>
  mcpTools: Array<{
    name: string
    description: string
    inputSchema: Record<string, unknown>
    handler: (input: unknown, c: Context) => Promise<unknown>
  }>
}

export function eventsConvention(config: EventsConfig = {}): ConventionResult {
  const app = new Hono<ApiEnv>()
  const bindingName = config.binding || 'EVENTS'
  const topLevel = config.topLevelRoutes !== false
  const defaultSince = config.defaultSince || '7d'

  // Merge categories
  const categories: Record<string, EventCategory> = { ...DEFAULT_EVENT_CATEGORIES }
  if (config.categories) {
    for (const [key, value] of Object.entries(config.categories)) {
      if (value === false) delete categories[key]
      else categories[key] = value
    }
  }

  // Auth middleware — applied only to event routes (not other routes on the host)
  if (config.auth) {
    const authLevel = typeof config.auth === 'string' ? config.auth : undefined
    const authMw = requireAuth(authLevel as any)
    app.use('/events', authMw)
    app.use('/events/*', authMw)
    if (topLevel) {
      for (const name of Object.keys(categories)) {
        app.use(`/${name}`, authMw)
      }
    }
  }

  /** Get EVENTS binding from env */
  function getBinding(env: Record<string, unknown>): EventsBinding | null {
    return (env[bindingName] as EventsBinding) || null
  }

  /** Resolve scope — determines what events a user can see */
  function getScope(c: Context<ApiEnv>): string | string[] | undefined | false {
    const user = c.get('user' as never) as { level?: string; org?: string; authenticated?: boolean } | undefined

    // Anonymous users see nothing
    if (!user?.authenticated) return false

    // L4 (superadmin) sees all events (platform-wide)
    if (user.level === 'L4') {
      const explicitScope = config.scope
      if (explicitScope === '*' || explicitScope === undefined) return undefined
      return explicitScope
    }

    // L1-L3: scope to their org/tenant
    const tenant = c.var.tenant || user?.org
    if (tenant) return tenant

    // Fallback: config scope or hostname-based
    if (config.scope !== undefined && config.scope !== '*') return config.scope
    const hostname = new URL(c.req.url).hostname
    const inferred = inferScope(hostname)
    return inferred === '*' ? undefined : inferred
  }

  // -- Category route handler -------------------------------------------------

  function categoryHandler(categoryName: string, category: EventCategory) {
    return async (c: Context<ApiEnv>) => {
      const binding = getBinding(c.env as unknown as Record<string, unknown>)
      const url = new URL(c.req.url)
      const base = url.origin

      if (!binding) {
        return c.var.respond({
          data: { category: categoryName, label: category.label, description: category.description },
          key: categoryName,
          links: { events: 'https://events.do/' },
        })
      }

      try {
        const scope = getScope(c)
        if (scope === false) return c.json({ error: 'Authentication required' }, 401)
        // Build filters from category definition
        const type = category.types?.length === 1 ? category.types[0] : undefined
        const since = c.req.query('since') || defaultSince
        const source = c.req.query('source')
        const event = c.req.query('event')
        const ns = c.req.query('ns')
        const limit = safeInt(c.req.query('limit'), 20, 1, 1000)
        const after = c.req.query('after')   // cursor: older events (ts <= after)
        const before = c.req.query('before') // cursor: newer events (ts >= before)
        const filters: Record<string, unknown> = {
          type, source, event, ns, limit, cursor: 0,
          since: before || since,
          ...(after && { until: after }),
        }

        const [searchResult, facetResult] = await Promise.all([
          binding.search(filters, scope),
          binding.facets({ dimension: 'event', filters: { type, since, source, event, ns } }, scope),
        ])

        const discover: Record<string, string> = {}
        for (const f of facetResult.facets) {
          discover[`${f.value} (${formatCount(f.count)})`] = `${base}/events?event=${encodeURIComponent(f.value)}`
        }

        const cursors = extractCursors(searchResult.data)
        const pagination = buildCursorPagination({
          url, limit: searchResult.limit, hasMore: searchResult.hasMore,
          nextCursor: searchResult.hasMore ? cursors.nextCursor : undefined,
          prevCursor: after ? cursors.prevCursor : undefined,
        })

        return c.var.respond({
          data: searchResult.data,
          key: 'events',
          total: searchResult.total,
          limit: pagination.limit,
          hasMore: searchResult.hasMore,
          discover,
          links: { ...pagination.links, events: `${base}/events` },
          options: {
            'Last Hour': `${base}/${categoryName}?since=1h`,
            'Last 24 Hours': `${base}/${categoryName}?since=24h`,
            'Last Week': `${base}/${categoryName}?since=7d`,
            'Last 30 Days': `${base}/${categoryName}?since=30d`,
          },
        })
      } catch (err) {
        console.error(`[events/${categoryName}] query failed:`, err)
        return c.json({ error: 'Events service unavailable' }, 503)
      }
    }
  }

  // -- Mount routes -----------------------------------------------------------

  // Top-level category routes
  if (topLevel) {
    for (const [name, cat] of Object.entries(categories)) {
      app.get(`/${name}`, categoryHandler(name, cat))
    }
  }

  // /events/:category aliases (always)
  for (const [name, cat] of Object.entries(categories)) {
    app.get(`/events/${name}`, categoryHandler(name, cat))
  }

  // /events -- faceted discovery OR event data when filters are applied
  app.get('/events', async (c) => {
    const binding = getBinding(c.env as unknown as Record<string, unknown>)
    const url = new URL(c.req.url)
    const base = url.origin

    if (!binding) {
      const disc: Record<string, string> = {}
      for (const [name, cat] of Object.entries(categories)) {
        disc[cat.label] = `${base}/${name}`
      }
      return c.var.respond({ data: disc, key: 'discover' })
    }

    try {
      const t0 = performance.now()
      const scope = getScope(c)
      if (scope === false) return c.json({ error: 'Authentication required' }, 401)
      const type = c.req.query('type')
      const event = c.req.query('event')
      const source = c.req.query('source')
      const ns = c.req.query('ns')
      const since = c.req.query('since') || defaultSince
      const limit = safeInt(c.req.query('limit'), 20, 1, 1000)
      const after = c.req.query('after')   // cursor: older events (ts <= after)
      const before = c.req.query('before') // cursor: newer events (ts >= before)
      const hasFilters = type || event || source || ns

      if (!hasFilters && !after && !before) {
        // No filters → discovery view: type facets + recent events
        const cacheKey = `https://events-discovery-v2/${scope ?? 'global'}/${since}`
        const cache = caches.default
        let searchResult: Awaited<ReturnType<typeof binding.search>> | undefined
        let facetResult: Awaited<ReturnType<typeof binding.facets>> | undefined

        const cached = await cache.match(cacheKey)
        if (cached) {
          const parsed = await cached.json() as { search: typeof searchResult; facets: typeof facetResult }
          searchResult = parsed.search
          facetResult = parsed.facets
          const elapsed = Math.round(performance.now() - t0)
          console.log(`[events] discovery (cached): ${searchResult!.data.length} events, ${facetResult!.facets.length} types, ${elapsed}ms`)
        } else {
          const filters: Record<string, unknown> = { since, limit }
          ;[searchResult, facetResult] = await Promise.all([
            binding.search(filters, scope),
            binding.facets({ dimension: 'type', filters: { since } }, scope),
          ])
          const elapsed = Math.round(performance.now() - t0)
          console.log(`[events] discovery: ${searchResult.data.length} events, ${facetResult.facets.length} types, ${elapsed}ms`)
          // Cache for 5 minutes
          c.executionCtx.waitUntil(
            cache.put(cacheKey, new Response(JSON.stringify({ search: searchResult, facets: facetResult }), {
              headers: { 'Cache-Control': 'max-age=300' },
            })),
          )
        }

        const types: Record<string, string> = {}
        for (const f of facetResult!.facets) {
          types[`${f.value} (${formatCount(f.count)})`] = `${base}/events/${encodeURIComponent(f.value)}`
        }

        const cursors = extractCursors(searchResult!.data)
        const pagination = buildCursorPagination({
          url, limit: searchResult!.limit, hasMore: searchResult!.hasMore,
          nextCursor: searchResult!.hasMore ? cursors.nextCursor : undefined,
        })

        return c.var.respond({
          types,
          data: searchResult!.data,
          key: 'events',
          total: searchResult!.total,
          limit: pagination.limit,
          hasMore: searchResult!.hasMore,
          links: { ...pagination.links },
          options: {
            'Last Hour': `${base}/events?since=1h`,
            'Last 24 Hours': `${base}/events?since=24h`,
            'Last Week': `${base}/events?since=7d`,
            'Last 30 Days': `${base}/events?since=30d`,
          },
        })
      }

      // Filters or cursor applied → return actual event data with cursor pagination
      const filters: Record<string, unknown> = {
        type, event, source, ns, limit, cursor: 0,
        since: before || since,
        ...(after && { until: after }),
      }

      const [searchResult, facetResult] = await Promise.all([
        binding.search(filters, scope),
        binding.facets({ dimension: type ? 'event' : 'type', filters: { type, event, source, since, ns } }, scope),
      ])
      const elapsed = Math.round(performance.now() - t0)
      console.log(`[events] filtered: ${searchResult.data.length} events, ${facetResult.facets.length} facets, ${elapsed}ms`)

      const discover: Record<string, string> = {}
      for (const f of facetResult.facets) {
        if (type) {
          discover[`${f.value} (${formatCount(f.count)})`] = `${base}/events/${encodeURIComponent(type)}?event=${encodeURIComponent(f.value)}`
        } else {
          discover[`${f.value} (${formatCount(f.count)})`] = `${base}/events/${encodeURIComponent(f.value)}`
        }
      }

      const cursors = extractCursors(searchResult.data)
      const pagination = buildCursorPagination({
        url, limit: searchResult.limit, hasMore: searchResult.hasMore,
        nextCursor: searchResult.hasMore ? cursors.nextCursor : undefined,
        prevCursor: after ? cursors.prevCursor : undefined,
      })

      return c.var.respond({
        data: searchResult.data,
        key: 'events',
        total: searchResult.total,
        limit: pagination.limit,
        hasMore: searchResult.hasMore,
        discover,
        links: { ...pagination.links, parent: `${base}/events` },
        options: {
          'Last Hour': `${base}/events?since=1h`,
          'Last 24 Hours': `${base}/events?since=24h`,
          'Last Week': `${base}/events?since=7d`,
          'Last 30 Days': `${base}/events?since=30d`,
        },
      })
    } catch (err) {
      console.error('[events] query failed:', err)
      return c.json({ error: 'Events service unavailable' }, 503)
    }
  })

  // /events/:type -- drill into specific type with actual event data
  app.get('/events/:type', async (c) => {
    const eventType = c.req.param('type')

    // Delegate to category handler if it's a known category
    if (categories[eventType]) {
      return categoryHandler(eventType, categories[eventType])(c)
    }

    const binding = getBinding(c.env as unknown as Record<string, unknown>)
    const url = new URL(c.req.url)
    const base = url.origin

    if (!binding) {
      return c.var.respond({
        data: { type: eventType },
        key: 'type',
        links: { events: `${base}/events` },
      })
    }

    try {
      const scope = getScope(c)
      if (scope === false) return c.json({ error: 'Authentication required' }, 401)
      const since = c.req.query('since') || defaultSince
      const event = c.req.query('event')
      const source = c.req.query('source')
      const ns = c.req.query('ns')
      const limit = safeInt(c.req.query('limit'), 20, 1, 1000)
      const after = c.req.query('after')
      const before = c.req.query('before')

      const filters: Record<string, unknown> = {
        type: eventType, event, source, ns, limit, cursor: 0,
        since: before || since,
        ...(after && { until: after }),
      }

      const [searchResult, facetResult] = await Promise.all([
        binding.search(filters, scope),
        binding.facets({ dimension: 'event', filters: { type: eventType, event, source, ns, since } }, scope),
      ])

      const discover: Record<string, string> = {}
      for (const f of facetResult.facets) {
        discover[`${f.value} (${formatCount(f.count)})`] = `${base}/events/${encodeURIComponent(eventType)}?event=${encodeURIComponent(f.value)}`
      }

      const cursors = extractCursors(searchResult.data)
      const pagination = buildCursorPagination({
        url, limit: searchResult.limit, hasMore: searchResult.hasMore,
        nextCursor: searchResult.hasMore ? cursors.nextCursor : undefined,
        prevCursor: after ? cursors.prevCursor : undefined,
      })

      return c.var.respond({
        data: searchResult.data,
        key: 'events',
        total: searchResult.total,
        limit: pagination.limit,
        hasMore: searchResult.hasMore,
        discover,
        links: { ...pagination.links, parent: `${base}/events` },
        options: {
          'Last Hour': `${base}/events/${eventType}?since=1h`,
          'Last 24 Hours': `${base}/events/${eventType}?since=24h`,
          'Last Week': `${base}/events/${eventType}?since=7d`,
          'Last 30 Days': `${base}/events/${eventType}?since=30d`,
        },
      })
    } catch (err) {
      console.error(`[events/${eventType}] query failed:`, err)
      return c.json({ error: 'Events service unavailable' }, 503)
    }
  })

  // -- MCP tools --------------------------------------------------------------

  const mcpTools = [
    {
      name: 'events_search',
      description: 'Search events by type, name, source, namespace, or time range. Returns event data.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          type: { type: 'string', description: 'Event type (e.g. webhook, cdc, request)' },
          event: { type: 'string', description: 'Event name (e.g. github.push, stripe.invoice.paid)' },
          source: { type: 'string', description: 'Event source (e.g. tail, posthog, ingest)' },
          ns: { type: 'string', description: 'Namespace filter' },
          since: { type: 'string', description: 'Time range (e.g. 1h, 24h, 7d)' },
          limit: { type: 'number', description: 'Max results (default 20, max 1000)' },
        },
      },
      handler: async (input: unknown, c: Context) => {
        const binding = getBinding(c.env as unknown as Record<string, unknown>)
        if (!binding) return { error: 'Events service not bound' }
        const filters = input as Record<string, unknown>
        return binding.search(filters)
      },
    },
    {
      name: 'events_count',
      description: 'Count events matching filters, optionally grouped by type/event/source/ns.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          type: { type: 'string', description: 'Event type filter' },
          since: { type: 'string', description: 'Time range (e.g. 1h, 24h, 7d)' },
          groupBy: { type: 'string', enum: ['type', 'event', 'source', 'ns'] },
        },
      },
      handler: async (input: unknown, c: Context) => {
        const binding = getBinding(c.env as unknown as Record<string, unknown>)
        if (!binding) return { error: 'Events service not bound' }
        const { groupBy, ...filters } = input as Record<string, unknown>
        return binding.count({ filters, groupBy })
      },
    },
    {
      name: 'events_sql',
      description: 'Run a raw SQL query against the events database. For advanced analytics and custom aggregations.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'SQL query' },
          params: { type: 'object', description: 'Query parameters' },
        },
        required: ['query'],
      },
      handler: async (input: unknown, c: Context) => {
        const binding = getBinding(c.env as unknown as Record<string, unknown>)
        if (!binding) return { error: 'Events service not bound' }
        const { query, params } = input as { query: string; params?: Record<string, string | number> }
        return binding.sql(query, params)
      },
    },
  ]

  return { routes: app, mcpTools }
}
