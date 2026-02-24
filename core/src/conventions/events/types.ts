// .do/api/core/src/conventions/events/types.ts

/**
 * Events Convention Types
 *
 * Abstract configuration — no ClickHouse knowledge.
 * Routes call env.EVENTS.* RPC methods via service binding.
 */

/**
 * Category definition — maps a curated name to event filters.
 */
export interface EventCategory {
  label: string
  description?: string
  /** Filter by event type(s) */
  types?: string[]
  /** Filter by event name pattern (passed as `event` filter with LIKE) */
  eventPattern?: string
}

/**
 * Default curated event categories.
 */
export const DEFAULT_EVENT_CATEGORIES: Record<string, EventCategory> = {
  commits: {
    label: 'Commit Events',
    description: 'Git commits and pushes from GitHub webhooks',
    types: ['webhook'],
    eventPattern: 'github.push%',
  },
  errors: {
    label: 'Error Events',
    description: 'Application errors and exceptions',
    types: ['error', 'exception'],
  },
  traces: {
    label: 'Trace Events',
    description: 'HTTP requests, RPC calls, and distributed traces',
    types: ['request', 'rpc', 'trace'],
  },
  webhooks: {
    label: 'Webhook Events',
    description: 'Inbound webhooks from integrations (Stripe, GitHub, etc.)',
    types: ['webhook'],
  },
  analytics: {
    label: 'Analytics Events',
    description: 'User behavior events (pageviews, custom tracking, identity)',
    types: ['pageview', 'track', 'identify', 'page', '$pageview', '$pageleave'],
  },
  ai: {
    label: 'AI Events',
    description: 'LLM calls, completions, token usage, and AI gateway logs',
    types: ['ai.call'],
  },
  cdc: {
    label: 'Data Change Events',
    description: 'Change Data Capture — entity mutations with before/after state',
    types: ['cdc'],
  },
  tail: {
    label: 'Worker Trace Events',
    description: 'Cloudflare Worker execution traces',
    types: ['request', 'rpc', 'cron', 'queue', 'alarm'],
  },
}

/**
 * Events convention configuration.
 *
 * The convention calls env[binding].search(), .facets(), .count(), .sql()
 * via WorkerEntrypoint RPC — no direct database access.
 */
export interface EventsConfig {
  /**
   * Service binding name for the EventsService.
   * Default: 'EVENTS'
   */
  binding?: string

  /**
   * Scope filter — controls which events this service sees.
   * Passed to EventsService as the `scope` parameter.
   * - '*' or undefined: no scope filter (sees all events)
   * - string: filter by namespace
   * - string[]: filter by multiple namespaces
   *
   * Auto-detected from hostname when not specified.
   */
  scope?: string | string[] | '*'

  /**
   * Override or extend default event categories.
   * Set a category to `false` to disable it.
   */
  categories?: Record<string, EventCategory | false>

  /**
   * Mount curated categories as top-level routes (e.g. /commits, /errors).
   * Default: true
   */
  topLevelRoutes?: boolean

  /**
   * Default time range when no `since` param is provided.
   * Default: '7d'
   */
  defaultSince?: string

  /**
   * Authentication level required for event routes.
   * - 'superadmin': only platform superadmin (L4) — .do org
   * - 'admin': org admin (L3+) can view events for their tenant, superadmin sees all
   * - 'claimed': authenticated users see tenant-scoped events
   * - true: any authenticated user, tenant-scoped
   * - false/undefined: no auth required (NOT RECOMMENDED for production)
   *
   * When auth is enabled, non-superadmin users are automatically scoped to
   * their tenant namespace via c.var.tenant.
   */
  auth?: 'superadmin' | 'admin' | 'claimed' | boolean
}

/**
 * Shape of the EVENTS service binding (WorkerEntrypoint RPC).
 * Matches EventsService methods on events.do.
 */
export interface EventsBinding {
  ingest(events: Array<Record<string, unknown>>): Promise<void>
  search(
    filters?: Record<string, unknown>,
    scope?: string | string[],
  ): Promise<{
    data: Record<string, unknown>[]
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }>
  facets(
    options: Record<string, unknown>,
    scope?: string | string[],
  ): Promise<{
    facets: Array<{ value: string; count: number }>
    total: number
  }>
  count(
    options?: Record<string, unknown>,
    scope?: string | string[],
  ): Promise<{
    count: number
    groups?: Array<{ value: string; count: number }>
  }>
  sql(
    query: string,
    params?: Record<string, string | number>,
    database?: string,
  ): Promise<{
    data: Record<string, unknown>[]
    rows: number
    elapsed: number
  }>
}
