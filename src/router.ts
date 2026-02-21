/**
 * Self-Describing ID URL Router
 *
 * A Hono middleware that parses URL paths into structured route information
 * using self-describing entity IDs. The router SETS context variables for
 * downstream conventions to consume — it does not handle responses itself.
 *
 * URL structure:
 * - /~tenant/contacts           -> collection list (plural)
 * - /~tenant/contact_abc        -> entity lookup (type_sqid)
 * - /~tenant/contact_abc/qualify -> entity action (type_sqid/verb)
 * - /~tenant/contacts/create    -> collection action
 * - /~tenant/contacts/$schema   -> meta-resource on collection
 * - /~tenant/contact_abc/$history -> meta-resource on entity
 * - /score(contact_abc)         -> function call
 * - /~tenant/search?q=alice     -> cross-type search
 */

import type { MiddlewareHandler } from 'hono'
import type { ApiEnv } from './types'
import { extractTenantFromPath, resolveTenant, type TenantResolution } from './helpers/tenant'
import { parseEntityId, isEntityId, type ParsedEntityId } from './helpers/id-parser'
import { parseFunctionCall, isFunctionCall, type ParsedFunctionCall } from './helpers/function-parser'

// =============================================================================
// Route Types
// =============================================================================

/**
 * Discriminated union of all route types the router can detect
 */
export type ParsedRoute =
  | CollectionRoute
  | EntityRoute
  | EntityActionRoute
  | CollectionActionRoute
  | MetaRoute
  | FunctionCallRoute
  | SearchRoute
  | UnknownRoute

export interface CollectionRoute {
  kind: 'collection'
  /** Plural collection name (e.g., 'contacts') */
  collection: string
}

export interface EntityRoute {
  kind: 'entity'
  /** Parsed entity ID */
  entity: ParsedEntityId
}

export interface EntityActionRoute {
  kind: 'entity-action'
  /** Parsed entity ID */
  entity: ParsedEntityId
  /** Action/verb name (e.g., 'qualify') */
  action: string
}

export interface CollectionActionRoute {
  kind: 'collection-action'
  /** Plural collection name */
  collection: string
  /** Action name (e.g., 'create') */
  action: string
}

export interface MetaRoute {
  kind: 'meta'
  /** Meta-resource name without $ prefix (e.g., 'schema', 'history') */
  resource: string
  /** If on an entity, the parsed entity ID */
  entity?: ParsedEntityId
  /** If on a collection, the collection name */
  collection?: string
}

export interface FunctionCallRoute {
  kind: 'function'
  /** Parsed function call */
  fn: ParsedFunctionCall
}

export interface SearchRoute {
  kind: 'search'
}

export interface UnknownRoute {
  kind: 'unknown'
  /** The path segments that could not be classified */
  segments: string[]
}

// =============================================================================
// Route Info (set on context)
// =============================================================================

/**
 * Complete parsed route info set on Hono context by the router middleware
 */
export interface RouteInfo {
  /** Resolved tenant */
  tenant: TenantResolution
  /** Parsed route details */
  route: ParsedRoute
  /** The path after tenant extraction (used for downstream routing) */
  path: string
}

// =============================================================================
// Router Configuration
// =============================================================================

export interface RouterConfig {
  /**
   * Known plural collection names.
   * When not provided, the router uses heuristic detection:
   * any path segment ending in 's' that is not an entity ID.
   */
  collections?: string[]

  /**
   * Known singular type prefixes for entity IDs.
   * When not provided, any segment matching type_sqid pattern is treated as an entity ID.
   */
  typePrefixes?: string[]

  /**
   * Base domains for subdomain tenant extraction.
   * Default: ['headless.ly', 'workers.do']
   */
  baseDomains?: string[]

  /**
   * System subdomains that should NOT be treated as tenants.
   */
  systemSubdomains?: string[]
}

// =============================================================================
// Route Parsing
// =============================================================================

/**
 * Parse a path (after tenant extraction) into a ParsedRoute.
 *
 * @param path - The remaining path after tenant prefix removal
 * @param config - Router configuration
 * @returns Parsed route
 */
export function parseRoute(path: string, config?: RouterConfig): ParsedRoute {
  // Normalize: remove leading/trailing slashes, then split
  const normalizedPath = path.replace(/^\/+|\/+$/g, '')

  // Empty path after tenant extraction = root
  if (!normalizedPath) {
    return { kind: 'unknown', segments: [] }
  }

  // Function call detection BEFORE splitting by slashes.
  // Function args may contain URLs with slashes (e.g., papa.parse(https://example.com/data.csv))
  // so we need to detect the function call on the full normalized path first.
  if (isFunctionCall(normalizedPath)) {
    // Extract the function call portion: everything from start to the last closing paren
    // The function call is the entire path segment (no sub-paths after function calls)
    const fn = parseFunctionCall(normalizedPath)
    if (fn) return { kind: 'function', fn }
  }

  const segments = normalizedPath.split('/')

  const first = segments[0]!
  const second = segments[1]

  // Function call: contains parentheses in the first segment (fallback for edge cases)
  if (isFunctionCall(first)) {
    const fn = parseFunctionCall(first)
    if (fn) return { kind: 'function', fn }
  }

  // Search: first segment is 'search'
  if (first === 'search') {
    return { kind: 'search' }
  }

  // Entity ID: matches type_sqid pattern
  if (isEntityId(first)) {
    const entity = parseEntityId(first)
    if (entity) {
      // No second segment = entity lookup
      if (!second) {
        return { kind: 'entity', entity }
      }

      // Second segment starts with $ = meta-resource on entity
      if (second.startsWith('$')) {
        return { kind: 'meta', resource: second.slice(1), entity }
      }

      // Second segment = action on entity
      return { kind: 'entity-action', entity, action: second }
    }
  }

  // Collection: matches known plural or is a non-entity, non-meta path segment
  const isKnownCollection = config?.collections?.includes(first)
  const isLikelyCollection = !isEntityId(first) && !first.startsWith('$') && /^[a-zA-Z][a-zA-Z0-9]*$/.test(first)

  if (isKnownCollection || isLikelyCollection) {
    const collection = first

    if (!second) {
      return { kind: 'collection', collection }
    }

    // $meta on collection
    if (second.startsWith('$')) {
      return { kind: 'meta', resource: second.slice(1), collection }
    }

    // Action on collection (e.g., contacts/create)
    return { kind: 'collection-action', collection, action: second }
  }

  // Meta-resource at root level (e.g., /$schema)
  if (first.startsWith('$')) {
    return { kind: 'meta', resource: first.slice(1) }
  }

  return { kind: 'unknown', segments }
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * Create the router middleware.
 *
 * Sets the following context variables:
 * - `routeInfo` - Complete parsed route info
 * - `tenant` - Resolved tenant slug (string)
 * - `tenantSource` - Where the tenant was resolved from
 *
 * @param config - Router configuration
 * @returns Hono middleware handler
 */
export function routerMiddleware(config?: RouterConfig): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    // Resolve tenant
    const tenant = resolveTenant(c, {
      baseDomains: config?.baseDomains,
      systemSubdomains: config?.systemSubdomains,
    })

    // Extract remaining path (after tenant prefix)
    const pathResult = extractTenantFromPath(c.req.path)
    const remainingPath = pathResult ? pathResult.remainingPath : c.req.path

    // Parse route from remaining path
    const route = parseRoute(remainingPath, config)

    // Set context variables
    const routeInfo: RouteInfo = {
      tenant,
      route,
      path: remainingPath,
    }

    c.set('routeInfo', routeInfo)
    c.set('tenant', tenant.tenant)
    c.set('tenantSource', tenant.source)

    await next()
  }
}
