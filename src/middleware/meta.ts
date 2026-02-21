/**
 * Meta-Resource Middleware
 *
 * Hono middleware that intercepts meta-resource routes (kind: 'meta')
 * and dispatches to the appropriate handler based on the resource name.
 *
 * Uses routeInfo from the router middleware to detect meta-resource requests.
 */

import type { MiddlewareHandler } from 'hono'
import type { ApiEnv } from '../types'
import type { MetaResourceConfig } from '../conventions/meta-resources'
import {
  handlePageSize,
  handleSort,
  handleCount,
  handleSchema,
  handlePages,
  handleDistinct,
  handleFacets,
  handleHistory,
  handleEvents,
} from '../conventions/meta-resources'

/**
 * Known collection-level meta-resources (available on /collection/$resource)
 */
const COLLECTION_META = new Set(['schema', 'pageSize', 'facets', 'pages', 'sort', 'count', 'distinct'])

/**
 * Known entity-level meta-resources (available on /entity_id/$resource)
 */
const ENTITY_META = new Set(['history', 'events'])

/**
 * Create meta-resource middleware.
 *
 * When the router detects a meta-resource route, this middleware dispatches
 * to the correct handler and returns the response. Non-meta routes pass through.
 *
 * @param config - Meta-resource configuration (providers, page sizes, etc.)
 */
export function metaMiddleware(config?: MetaResourceConfig): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const routeInfo = c.var.routeInfo
    if (!routeInfo || routeInfo.route.kind !== 'meta') {
      return next()
    }

    const { resource, collection, entity } = routeInfo.route
    const url = new URL(c.req.url)

    // Build the base URL for the collection (strip the $resource segment)
    const baseUrl = buildBaseUrl(url, resource)

    // --- Collection-level meta-resources ---
    if (collection || (!entity && COLLECTION_META.has(resource))) {
      const col = collection || 'unknown'

      switch (resource) {
        case 'pageSize': {
          const result = handlePageSize(baseUrl, config)
          return c.var.respond(result)
        }

        case 'sort': {
          const result = handleSort(baseUrl, {
            sortableFields: config?.sortableFields,
            collection: col,
          })
          return c.var.respond(result)
        }

        case 'count': {
          if (config?.countProvider) {
            const result = await handleCount(() => config.countProvider!(col))
            return c.var.respond(result)
          }
          return c.var.respond({ data: null, key: 'count' })
        }

        case 'schema': {
          const result = handleSchema(config?.schemaProvider, col)
          return c.var.respond(result)
        }

        case 'pages': {
          if (config?.countProvider) {
            const total = await config.countProvider(col)
            const result = handlePages(baseUrl, total, config?.defaultPageSize)
            return c.var.respond(result)
          }
          return c.var.respond({ data: null, key: 'pages' })
        }

        case 'facets': {
          if (config?.facetsProvider) {
            const result = await handleFacets(() => config.facetsProvider!(col))
            return c.var.respond(result)
          }
          return c.var.respond({ data: null, key: 'facets' })
        }

        case 'distinct': {
          // $distinct needs a sub-path field name — not yet handled by router
          // For now return null
          return c.var.respond({ data: null, key: 'distinct' })
        }

        default: {
          return c.var.respond({
            error: { message: `Unknown meta-resource: $${resource}`, code: 'NOT_FOUND', status: 404 },
            status: 404,
          })
        }
      }
    }

    // --- Entity-level meta-resources ---
    if (entity) {
      const entityId = entity.id

      switch (resource) {
        case 'history': {
          if (config?.historyProvider) {
            const result = await handleHistory(() => config.historyProvider!(entityId))
            return c.var.respond(result)
          }
          return c.var.respond({ data: null, key: 'history' })
        }

        case 'events': {
          if (config?.eventsProvider) {
            const result = await handleEvents(() => config.eventsProvider!(entityId))
            return c.var.respond(result)
          }
          return c.var.respond({ data: null, key: 'events' })
        }

        // Entity also supports some collection-level meta-resources
        case 'schema': {
          const col = entity.collection || entity.type
          const result = handleSchema(config?.schemaProvider, col)
          return c.var.respond(result)
        }

        default: {
          return c.var.respond({
            error: { message: `Unknown meta-resource: $${resource}`, code: 'NOT_FOUND', status: 404 },
            status: 404,
          })
        }
      }
    }

    // Root-level meta-resources (no collection or entity context)
    switch (resource) {
      case 'schema': {
        const result = handleSchema(config?.schemaProvider, '')
        return c.var.respond(result)
      }

      default: {
        return c.var.respond({
          error: { message: `Unknown meta-resource: $${resource}`, code: 'NOT_FOUND', status: 404 },
          status: 404,
        })
      }
    }
  }
}

/**
 * Build the base URL by stripping the $resource segment.
 * e.g., 'https://crm.do/~acme/contacts/$pageSize' -> 'https://crm.do/~acme/contacts'
 */
function buildBaseUrl(url: URL, resource: string): string {
  const path = url.pathname.replace(`/$${resource}`, '')
  return `${url.protocol}//${url.host}${path}`
}
