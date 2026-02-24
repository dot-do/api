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

  /** Get EVENTS binding from env */
  function getBinding(env: Record<string, unknown>): EventsBinding | null {
    return (env[bindingName] as EventsBinding) || null
  }

  /** Resolve scope */
  function getScope(hostname: string): string | string[] | '*' {
    if (config.scope !== undefined) return config.scope
    return inferScope(hostname)
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
        const scope = getScope(url.hostname)
        // Build filters from category definition
        const type = category.types?.length === 1 ? category.types[0] : undefined
        const filters: Record<string, unknown> = {
          type,
          since: c.req.query('since') || defaultSince,
          source: c.req.query('source'),
          event: c.req.query('event'),
          ns: c.req.query('ns'),
        }

        // Get facets for this category
        const [facetResult, countResult] = await Promise.all([
          binding.facets({ dimension: 'event', filters }, scope !== '*' ? (scope as string | string[]) : undefined),
          binding.count({ filters }, scope !== '*' ? (scope as string | string[]) : undefined),
        ])

        const data: Record<string, string> = {}
        for (const f of facetResult.facets) {
          data[`${f.value} (${formatCount(f.count)})`] = `${base}/events?event=${encodeURIComponent(f.value)}`
        }

        return c.var.respond({
          data,
          key: 'discover',
          total: countResult.count,
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

  // /events -- faceted discovery
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
      const scope = getScope(url.hostname)
      const filters: Record<string, unknown> = {
        type: c.req.query('type'),
        event: c.req.query('event'),
        source: c.req.query('source'),
        since: c.req.query('since') || defaultSince,
        ns: c.req.query('ns'),
        limit: safeInt(c.req.query('limit'), 20, 1, 1000),
        offset: safeInt(c.req.query('offset'), 0, 0, 1_000_000),
      }

      const facetResult = await binding.facets({ dimension: 'type', filters }, scope !== '*' ? (scope as string | string[]) : undefined)

      const data: Record<string, string> = {}
      for (const f of facetResult.facets) {
        data[`${f.value} (${formatCount(f.count)})`] = `${base}/events?type=${encodeURIComponent(f.value)}`
      }

      return c.var.respond({
        data,
        key: 'discover',
        total: facetResult.total,
        links: { self: url.toString() },
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

  // /events/:type -- drill into specific type
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
      const scope = getScope(url.hostname)
      const facetResult = await binding.facets(
        {
          dimension: 'event',
          filters: {
            type: eventType,
            since: c.req.query('since') || defaultSince,
          },
        },
        scope !== '*' ? (scope as string | string[]) : undefined,
      )

      const data: Record<string, string> = {}
      for (const f of facetResult.facets) {
        data[`${f.value} (${formatCount(f.count)})`] = `${base}/events?type=${encodeURIComponent(eventType)}&event=${encodeURIComponent(f.value)}`
      }

      return c.var.respond({
        data,
        key: 'discover',
        total: facetResult.total,
        links: { self: url.toString(), parent: `${base}/events` },
        options: {
          'Last Hour': `${base}/events/${eventType}?since=1h`,
          'Last 24 Hours': `${base}/events/${eventType}?since=24h`,
          'Last Week': `${base}/events/${eventType}?since=7d`,
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
