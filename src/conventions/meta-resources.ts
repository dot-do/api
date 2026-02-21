/**
 * Meta-Resources Convention
 *
 * Discoverable $-prefixed paths that provide schema, pagination options,
 * facets, and other introspection data for collections and entities.
 *
 * Meta-resource URLs:
 *   /contacts/$schema      → JSON Schema for this type
 *   /contacts/$pageSize    → Clickable page size options
 *   /contacts/$facets      → Filterable fields with clickable value links + counts
 *   /contacts/$pages       → Clickable page number links
 *   /contacts/$sort        → Available sort orders as links
 *   /contacts/$count       → Total count
 *   /contacts/$distinct/status → Unique values with counts
 *   /contact_abc/$history  → Version history (entity only)
 *   /contact_abc/$events   → CDC event stream (entity only)
 */

import type { RespondOptions } from '../types'

// =============================================================================
// Configuration
// =============================================================================

export interface MetaResourceConfig {
  /** Custom page sizes. Default: [5, 10, 25, 50, 100, 500, 1000] */
  pageSizes?: number[]
  /** Sortable fields per collection name */
  sortableFields?: Record<string, string[]>
  /** Default page size for $pages. Default: 25 */
  defaultPageSize?: number
  /** Schema provider: returns JSON Schema for a collection */
  schemaProvider?: (collection: string) => object | null
  /** Count provider: returns total count for a collection */
  countProvider?: (collection: string) => Promise<number>
  /** Distinct provider: returns unique values + counts for a field */
  distinctProvider?: (collection: string, field: string) => Promise<Record<string, number>>
  /** History provider: returns version history for an entity */
  historyProvider?: (entityId: string) => Promise<unknown[]>
  /** Events provider: returns CDC events for an entity */
  eventsProvider?: (entityId: string) => Promise<unknown[]>
  /** Facets provider: returns filterable fields with counts */
  facetsProvider?: (collection: string) => Promise<Record<string, Record<string, number>>>
}

// =============================================================================
// Default values
// =============================================================================

const DEFAULT_PAGE_SIZES = [5, 10, 25, 50, 100, 500, 1000]
const DEFAULT_PAGE_SIZE = 25

// =============================================================================
// Helpers
// =============================================================================

/**
 * Capitalize a field name for display labels (e.g., 'createdAt' -> 'CreatedAt')
 */
function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Build a URL with additional query parameters, preserving existing ones.
 */
function buildUrl(baseUrl: string, params: Record<string, string>): string {
  const clean = baseUrl.replace(/\/+$/, '')
  const [path, existing] = clean.split('?')
  const searchParams = new URLSearchParams(existing || '')
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value)
  }
  return `${path}?${searchParams.toString()}`
}

/**
 * Strip the meta-resource segment from a URL to get the collection base URL.
 * e.g., 'https://crm.do/~acme/contacts/$pageSize' -> 'https://crm.do/~acme/contacts'
 */
export function stripMetaSegment(url: string): string {
  return url.replace(/\/\$[a-zA-Z]+(?:\/[^?]*)?(?:\?|$)/, (match) => {
    return match.endsWith('?') ? '?' : ''
  })
}

// =============================================================================
// Handler Functions
// =============================================================================

/**
 * Handle $pageSize — generates a map of page sizes to clickable URLs.
 */
export function handlePageSize(baseUrl: string, config?: Pick<MetaResourceConfig, 'pageSizes'>): RespondOptions {
  const sizes = config?.pageSizes ?? DEFAULT_PAGE_SIZES
  const clean = baseUrl.replace(/\/+$/, '')
  const data: Record<number, string> = {}

  for (const size of sizes) {
    data[size] = buildUrl(clean, { limit: String(size) })
  }

  return { data, key: 'pageSize' }
}

/**
 * Handle $sort — generates a map of sort labels to clickable URLs.
 */
export function handleSort(
  baseUrl: string,
  config?: Pick<MetaResourceConfig, 'sortableFields'> & { collection?: string },
): RespondOptions {
  const clean = baseUrl.replace(/\/+$/, '')
  const data: Record<string, string> = {}

  // Add field-specific sort options
  const fields = config?.collection && config?.sortableFields?.[config.collection]
  if (fields) {
    for (const field of fields) {
      const label = capitalize(field)
      data[`${label} (A-Z)`] = buildUrl(clean, { sort: `${field}.asc` })
      data[`${label} (Z-A)`] = buildUrl(clean, { sort: `${field}.desc` })
    }
  }

  // Always include temporal sort options
  data['Newest first'] = buildUrl(clean, { sort: 'createdAt.desc' })
  data['Oldest first'] = buildUrl(clean, { sort: 'createdAt.asc' })
  data['Recently updated'] = buildUrl(clean, { sort: 'updatedAt.desc' })

  return { data, key: 'sort' }
}

/**
 * Handle $count — returns total count.
 */
export async function handleCount(countFn: () => Promise<number>): Promise<RespondOptions> {
  const count = await countFn()
  return { data: count, key: 'count' }
}

/**
 * Handle $schema — returns JSON Schema for the collection.
 */
export function handleSchema(
  schemaProvider: ((collection: string) => object | null) | undefined,
  collection: string,
): RespondOptions {
  const schema = schemaProvider ? schemaProvider(collection) : null
  return { data: schema, key: 'schema' }
}

/**
 * Handle $pages — generates a map of page numbers to clickable URLs.
 */
export function handlePages(baseUrl: string, total: number, pageSize?: number): RespondOptions {
  const limit = pageSize ?? DEFAULT_PAGE_SIZE
  const clean = baseUrl.replace(/\/+$/, '')
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const data: Record<number, string> = {}

  for (let page = 1; page <= totalPages; page++) {
    data[page] = buildUrl(clean, { page: String(page), limit: String(limit) })
  }

  return { data, key: 'pages' }
}

/**
 * Handle $distinct — returns unique values with counts for a field.
 */
export async function handleDistinct(
  field: string,
  distinctFn: () => Promise<Record<string, number>>,
): Promise<RespondOptions> {
  const values = await distinctFn()
  return {
    data: { field, values },
    key: 'distinct',
  }
}

/**
 * Handle $facets — returns filterable fields with value counts.
 */
export async function handleFacets(
  facetsFn: () => Promise<Record<string, Record<string, number>>>,
): Promise<RespondOptions> {
  const facets = await facetsFn()
  return { data: facets, key: 'facets' }
}

/**
 * Handle $history — returns version history for an entity.
 */
export async function handleHistory(
  historyFn: () => Promise<unknown[]>,
): Promise<RespondOptions> {
  const history = await historyFn()
  return { data: history, key: 'history' }
}

/**
 * Handle $events — returns CDC event stream for an entity.
 */
export async function handleEvents(
  eventsFn: () => Promise<unknown[]>,
): Promise<RespondOptions> {
  const events = await eventsFn()
  return { data: events, key: 'events' }
}
