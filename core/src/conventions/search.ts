/**
 * Cross-Type Search Convention
 *
 * Handles cross-type search detected by the router (kind: 'search').
 * When the router detects /search, this convention executes a search
 * across multiple entity types, grouping results by type into semantic
 * payload keys (contacts, deals, activities, etc.).
 *
 * URL examples:
 *   GET /~tenant/search?q=alice              -> cross-type search, map format
 *   GET /~tenant/search?q=alice&array        -> cross-type search, array format
 *   GET /~tenant/search?q=alice&type=contacts -> narrowed to contacts only
 *   GET /~tenant/contacts/$facets            -> faceted search for contacts
 *
 * Two output modes:
 *   - **Map format** (default): each entity type is a separate key in the
 *     response, with values as `{ displayName: url }` maps.
 *   - **Array format** (?array): a single `results` key containing all items
 *     in a flat array, each with a `type` field.
 *
 * Faceted search at `/collection/$facets` returns filterable fields with
 * clickable value links + counts:
 *   { status: { Active: { count: 523, url: '...' } } }
 */

import { Hono } from 'hono'
import type { ApiEnv, Options } from '../types'
import { isArrayMode } from '../helpers/format'

// =============================================================================
// Types
// =============================================================================

/**
 * A single search result item.
 */
export interface SearchResult {
  id: string
  name?: string
  title?: string
  [key: string]: unknown
}

/**
 * Options passed to the search provider callback.
 */
export interface SearchOptions {
  /** Entity types to narrow search to */
  types?: string[]
  /** Maximum results per type */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Search provider callback: given a query and options, returns results grouped by type.
 * Keys are plural collection names (e.g., 'contacts', 'deals').
 * Values are arrays of search result items.
 */
export type SearchProvider = (query: string, options: SearchOptions) => Promise<Record<string, SearchResult[]>>

/**
 * Facet provider callback: returns filterable fields with value counts for a collection.
 * Keys are field names (e.g., 'status', 'stage').
 * Values are maps of field value to count.
 */
export type FacetProvider = () => Promise<Record<string, Record<string, number>>>

/**
 * Configuration for the search convention.
 */
export interface SearchConfig {
  /** Search provider callback — executes cross-type search */
  searchProvider: SearchProvider
  /** Facet providers per collection name */
  facetProviders?: Record<string, FacetProvider>
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Resolve the display name for a search result.
 */
function resolveDisplayName(item: SearchResult): string {
  if (typeof item.name === 'string' && item.name) return item.name
  if (typeof item.title === 'string' && item.title) return item.title
  if (typeof item.id === 'string' && item.id) return item.id
  return ''
}

/**
 * Build an entity URL from base URL, tenant, and entity ID.
 */
function buildEntityUrl(baseUrl: string, tenant: string | undefined, entityId: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  if (tenant) {
    return `${base}/~${tenant}/${entityId}`
  }
  return `${base}/${entityId}`
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
 * Transform search results into map format: { displayName: url } per type.
 */
function toSearchMapFormat(
  results: Record<string, SearchResult[]>,
  baseUrl: string,
  tenant?: string,
): Record<string, Record<string, string>> {
  const formatted: Record<string, Record<string, string>> = {}
  for (const [type, items] of Object.entries(results)) {
    const map: Record<string, string> = {}
    for (const item of items) {
      const displayName = resolveDisplayName(item)
      const url = buildEntityUrl(baseUrl, tenant, item.id)
      map[displayName] = url
    }
    formatted[type] = map
  }
  return formatted
}

/**
 * Transform search results into flat array format with type field.
 */
function toSearchArrayFormat(
  results: Record<string, SearchResult[]>,
  baseUrl: string,
  tenant?: string,
): Array<{ $id: string; id: string; name: string; type: string }> {
  const flat: Array<{ $id: string; id: string; name: string; type: string }> = []
  for (const [type, items] of Object.entries(results)) {
    for (const item of items) {
      flat.push({
        $id: buildEntityUrl(baseUrl, tenant, item.id),
        id: item.id,
        name: resolveDisplayName(item),
        type,
      })
    }
  }
  return flat
}

/**
 * Count total results across all types.
 */
function countTotal(results: Record<string, SearchResult[]>): number {
  let total = 0
  for (const items of Object.values(results)) {
    total += items.length
  }
  return total
}

/**
 * Build narrowing option links for search results.
 */
function buildNarrowingOptions(
  results: Record<string, SearchResult[]>,
  selfUrl: string,
  arrayMode: boolean,
): Options {
  const options: Options = {}

  // Format toggle
  if (arrayMode) {
    // Remove 'array' param to show map mode
    const url = new URL(selfUrl)
    url.searchParams.delete('array')
    options.map = url.toString()
  } else {
    const url = new URL(selfUrl)
    url.searchParams.set('array', '')
    // URLSearchParams encodes empty values as key=, we want just the key
    options.array = url.toString().replace('array=', 'array')
  }

  // Type narrowing links
  const types = Object.keys(results)
  for (const type of types) {
    const label = `Only ${type}`
    const url = new URL(selfUrl)
    url.searchParams.set('type', type)
    // Preserve array mode if active
    if (!arrayMode) {
      url.searchParams.delete('array')
    }
    options[label] = url.toString()
  }

  return options
}

/**
 * Transform raw facet data into the format with counts and clickable URLs.
 */
function formatFacets(
  rawFacets: Record<string, Record<string, number>>,
  collectionBaseUrl: string,
): Record<string, Record<string, { count: number; url: string }>> {
  const formatted: Record<string, Record<string, { count: number; url: string }>> = {}
  for (const [field, values] of Object.entries(rawFacets)) {
    formatted[field] = {}
    for (const [value, count] of Object.entries(values)) {
      formatted[field][value] = {
        count,
        url: buildUrl(collectionBaseUrl, { [field]: value }),
      }
    }
  }
  return formatted
}

// =============================================================================
// Convention
// =============================================================================

/**
 * Creates a Hono sub-app that handles cross-type search and faceted search.
 *
 * It intercepts:
 * 1. `routeInfo.route.kind === 'search'` for cross-type search
 * 2. `routeInfo.route.kind === 'meta' && route.resource === 'facets'` for faceted search
 *
 * Cross-type search executes the provided searchProvider and returns results
 * either grouped by type (map mode) or as a flat array (array mode).
 *
 * Faceted search calls the registered facetProvider for the collection and
 * returns field values with counts and clickable filter URLs.
 */
export function searchConvention(config: SearchConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()
  const { searchProvider, facetProviders } = config

  // Handle cross-type search: GET /search?q=term
  app.get('*', async (c, next) => {
    const routeInfo = c.var.routeInfo
    if (!routeInfo || routeInfo.route.kind !== 'search') {
      return next()
    }

    const url = new URL(c.req.url)
    const query = url.searchParams.get('q')

    if (!query) {
      return c.var.respond({
        error: {
          message: 'Missing required query parameter: q',
          code: 'MISSING_QUERY',
        },
        status: 400,
      })
    }

    // Build search options from query params
    const searchOpts: SearchOptions = {}

    const typeParam = url.searchParams.get('type')
    if (typeParam) {
      searchOpts.types = typeParam.split(',').map((t) => t.trim())
    }

    const limitParam = url.searchParams.get('limit')
    if (limitParam) {
      searchOpts.limit = parseInt(limitParam, 10)
    }

    const offsetParam = url.searchParams.get('offset')
    if (offsetParam) {
      searchOpts.offset = parseInt(offsetParam, 10)
    }

    try {
      const results = await searchProvider(query, searchOpts)
      const baseUrl = `${url.protocol}//${url.host}`
      const tenant = routeInfo.tenant.tenant !== 'default' ? routeInfo.tenant.tenant : undefined
      const arrayMode = isArrayMode(url)
      const total = countTotal(results)
      const options = buildNarrowingOptions(results, url.toString(), arrayMode)

      if (arrayMode) {
        // Array mode: flat results with type field
        const data = toSearchArrayFormat(results, baseUrl, tenant)
        return c.var.respond({
          data,
          key: 'results',
          total,
          options,
        })
      } else {
        // Map mode: each entity type gets its own top-level key in the envelope.
        // Since respond() only supports a single payload key, we build the
        // envelope directly to achieve multiple semantic keys (contacts, deals, etc.)
        const formatted = toSearchMapFormat(results, baseUrl, tenant)
        const selfUrl = url.toString()
        const apiConfig = c.var.apiConfig
        const apiBaseUrl = `${url.protocol}//${url.host}${apiConfig?.basePath || ''}`

        const envelope: Record<string, unknown> = {
          api: {
            name: apiConfig?.name,
            ...(apiConfig?.description && { description: apiConfig.description }),
            url: apiBaseUrl,
          },
          total,
          ...formatted,
          links: {
            self: selfUrl,
            home: apiBaseUrl,
          },
          options,
        }

        return c.json(envelope)
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'SEARCH_ERROR' },
        status: 500,
      })
    }
  })

  // Handle faceted search: GET /collection/$facets
  app.get('*', async (c, next) => {
    const routeInfo = c.var.routeInfo
    if (!routeInfo || routeInfo.route.kind !== 'meta' || routeInfo.route.resource !== 'facets') {
      return next()
    }

    const route = routeInfo.route
    const collection = route.collection
    if (!collection) {
      return next()
    }

    const provider = facetProviders?.[collection]
    if (!provider) {
      return c.var.respond({
        error: {
          message: `No facets provider configured for collection '${collection}'`,
          code: 'FACETS_NOT_FOUND',
        },
        status: 404,
      })
    }

    try {
      const rawFacets = await provider()
      const url = new URL(c.req.url)
      const baseUrl = `${url.protocol}//${url.host}`
      const tenant = routeInfo.tenant.tenant !== 'default' ? routeInfo.tenant.tenant : undefined
      const tenantPrefix = tenant ? `/~${tenant}` : ''
      const collectionBaseUrl = `${baseUrl}${tenantPrefix}/${collection}`

      const formatted = formatFacets(rawFacets, collectionBaseUrl)

      return c.var.respond({
        data: formatted,
        key: 'facets',
      })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'FACETS_ERROR' },
        status: 500,
      })
    }
  })

  return app
}
