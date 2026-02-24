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

  /** Resolve scope — admin users see all, regular users scoped to tenant */
  function getScope(c: Context<ApiEnv>): string | string[] | undefined {
    const user = c.get('user' as never) as { level?: string; tenant?: string } | undefined
    const isAdmin = user?.level === 'L3'

    // Admin sees all events
    if (isAdmin) {
      const explicitScope = config.scope
      if (explicitScope === '*' || explicitScope === undefined) return undefined
      return explicitScope
    }

    // Non-admin: scope to tenant
    const tenant = c.var.tenant || user?.tenant
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
        // Build filters from category definition
        const type = category.types?.length === 1 ? category.types[0] : undefined
        const since = c.req.query('since') || defaultSince
        const source = c.req.query('source')
        const event = c.req.query('event')
        const ns = c.req.query('ns')
        const limit = safeInt(c.req.query('limit'), 20, 1, 1000)
        const offset = safeInt(c.req.query('offset'), 0, 0, 1_000_000)
        const filters: Record<string, unknown> = { type, since, source, event, ns, limit, offset }

        const [searchResult, facetResult] = await Promise.all([
          binding.search(filters, scope),
          binding.facets({ dimension: 'event', filters: { type, since, source, event, ns } }, scope),
        ])

        const discover: Record<string, string> = {}
        for (const f of facetResult.facets) {
          discover[`${f.value} (${formatCount(f.count)})`] = `${base}/events?event=${encodeURIComponent(f.value)}`
        }

        return c.var.respond({
          data: searchResult.data,
          key: 'events',
          total: searchResult.total,
          limit: searchResult.limit,
          offset: searchResult.offset,
          hasMore: searchResult.hasMore,
          discover,
          links: { self: url.toString(), events: `${base}/events` },
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
      const scope = getScope(c)
      const type = c.req.query('type')
      const event = c.req.query('event')
      const source = c.req.query('source')
      const ns = c.req.query('ns')
      const since = c.req.query('since') || defaultSince
      const limit = safeInt(c.req.query('limit'), 20, 1, 1000)
      const offset = safeInt(c.req.query('offset'), 0, 0, 1_000_000)
      const hasFilters = type || event || source || ns

      const filters: Record<string, unknown> = { type, event, source, since, ns, limit, offset }

      if (!hasFilters) {
        // No filters → faceted discovery by type + recent events
        const [facetResult, searchResult] = await Promise.all([
          binding.facets({ dimension: 'type', filters }, scope),
          binding.search({ since, limit: 10 }, scope),
        ])
        const data: Record<string, string> = {}
        for (const f of facetResult.facets) {
          data[`${f.value} (${formatCount(f.count)})`] = `${base}/events/${encodeURIComponent(f.value)}`
        }
        return c.var.respond({
          data,
          key: 'discover',
          total: facetResult.total,
          recent: searchResult.data,
          links: { self: url.toString() },
          options: {
            'Last Hour': `${base}/events?since=1h`,
            'Last 24 Hours': `${base}/events?since=24h`,
            'Last Week': `${base}/events?since=7d`,
            'Last 30 Days': `${base}/events?since=30d`,
          },
        })
      }

      // Filters applied → return actual event data
      const [searchResult, facetResult] = await Promise.all([
        binding.search(filters, scope),
        binding.facets({ dimension: type ? 'event' : 'type', filters: { type, event, source, since, ns } }, scope),
      ])

      const discover: Record<string, string> = {}
      for (const f of facetResult.facets) {
        if (type) {
          // Drilling into a type — show sub-events as query param filter
          discover[`${f.value} (${formatCount(f.count)})`] = `${base}/events/${encodeURIComponent(type)}?event=${encodeURIComponent(f.value)}`
        } else {
          // No type filter — link to path-based type routes
          discover[`${f.value} (${formatCount(f.count)})`] = `${base}/events/${encodeURIComponent(f.value)}`
        }
      }

      const qs = new URLSearchParams()
      if (type) qs.set('type', type)
      if (event) qs.set('event', event)
      if (source) qs.set('source', source)
      if (ns) qs.set('ns', ns)
      const qsStr = qs.toString()
      const qsSuffix = qsStr ? `?${qsStr}&` : '?'

      return c.var.respond({
        data: searchResult.data,
        key: 'events',
        total: searchResult.total,
        limit: searchResult.limit,
        offset: searchResult.offset,
        hasMore: searchResult.hasMore,
        discover,
        links: { self: url.toString(), parent: `${base}/events` },
        options: {
          'Last Hour': `${base}/events${qsSuffix}since=1h`,
          'Last 24 Hours': `${base}/events${qsSuffix}since=24h`,
          'Last Week': `${base}/events${qsSuffix}since=7d`,
          'Last 30 Days': `${base}/events${qsSuffix}since=30d`,
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
      const since = c.req.query('since') || defaultSince
      const event = c.req.query('event')
      const source = c.req.query('source')
      const ns = c.req.query('ns')
      const limit = safeInt(c.req.query('limit'), 20, 1, 1000)
      const offset = safeInt(c.req.query('offset'), 0, 0, 1_000_000)

      const filters: Record<string, unknown> = { type: eventType, event, source, ns, since, limit, offset }

      const [searchResult, facetResult] = await Promise.all([
        binding.search(filters, scope),
        binding.facets({ dimension: 'event', filters: { type: eventType, event, source, ns, since } }, scope),
      ])

      const discover: Record<string, string> = {}
      for (const f of facetResult.facets) {
        discover[`${f.value} (${formatCount(f.count)})`] = `${base}/events/${encodeURIComponent(eventType)}?event=${encodeURIComponent(f.value)}`
      }

      return c.var.respond({
        data: searchResult.data,
        key: 'events',
        total: searchResult.total,
        limit: searchResult.limit,
        offset: searchResult.offset,
        hasMore: searchResult.hasMore,
        discover,
        links: { self: url.toString(), parent: `${base}/events` },
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
