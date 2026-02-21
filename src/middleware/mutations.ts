/**
 * Mutation middleware for GET confirmation flow.
 *
 * Intercepts GET requests to entity-action and collection-action routes.
 * For known mutation actions (create, update, delete, revert) or verbs:
 * - Without `?confirm`: returns a confirmation preview
 * - With valid `?confirm=hash`: passes through to execute the mutation
 * - POST requests bypass confirmation entirely
 */

import type { MiddlewareHandler } from 'hono'
import type { ApiEnv } from '../types'
import {
  generateConfirmHash,
  validateConfirmHash,
  buildConfirmPreview,
  type ConfirmParams,
} from '../helpers/confirm'

// =============================================================================
// Types
// =============================================================================

export interface MutationConfig {
  /** Secret for HMAC signing of confirm hashes */
  secret?: string
  /** TTL in milliseconds for confirm hashes (default: 5 minutes) */
  ttl?: number
  /**
   * When provided, only these actions trigger confirmation.
   * When omitted, all entity-action and collection-action routes
   * with known mutation verbs require confirmation.
   */
  actions?: string[]
}

// =============================================================================
// Default mutation actions
// =============================================================================

const DEFAULT_MUTATION_ACTIONS = new Set(['create', 'update', 'delete', 'revert'])

// =============================================================================
// Middleware
// =============================================================================

/**
 * Create mutation middleware that adds GET confirmation flow.
 *
 * @param config - Mutation configuration
 * @returns Hono middleware handler
 */
export function mutationMiddleware(config?: MutationConfig): MiddlewareHandler<ApiEnv> {
  const secret = config?.secret || 'default-mutation-secret'
  const ttl = config?.ttl
  const customActions = config?.actions ? new Set(config.actions) : null

  return async (c, next) => {
    // Only intercept GET requests — POST/PUT/PATCH/DELETE bypass confirmation
    if (c.req.method !== 'GET') {
      await next()
      return
    }

    // Need routeInfo from the router middleware
    const routeInfo = c.var.routeInfo
    if (!routeInfo) {
      await next()
      return
    }

    const route = routeInfo.route

    // Only intercept action routes (entity-action or collection-action)
    if (route.kind !== 'entity-action' && route.kind !== 'collection-action') {
      await next()
      return
    }

    const action = route.action

    // Check if this action should trigger confirmation
    const isMutation = customActions ? customActions.has(action) : DEFAULT_MUTATION_ACTIONS.has(action) || isVerbAction(action)

    if (!isMutation) {
      await next()
      return
    }

    // Extract query params as data (excluding 'confirm')
    const url = new URL(c.req.url)
    const allParams = Object.fromEntries(url.searchParams)
    const confirmHash = allParams.confirm
    const { confirm: _, ...data } = allParams

    // Resolve type from route
    const type = route.kind === 'collection-action' ? singularize(route.collection) : route.entity?.type

    const tenant = routeInfo.tenant.tenant

    const confirmParams: ConfirmParams = {
      action,
      type,
      data,
      tenant,
      userId: (c.var.user as { id?: string })?.id,
      secret,
      ttl,
    }

    // If there's a confirm hash, validate and execute
    if (confirmHash) {
      const valid = await validateConfirmHash(confirmHash, confirmParams)

      if (!valid) {
        return c.var.respond({
          error: {
            message: 'Invalid or expired confirmation hash. Please request a new confirmation.',
            code: 'BAD_REQUEST',
            status: 400,
          },
          status: 400,
        })
      }

      // Valid hash — fall through to the actual handler
      await next()
      return
    }

    // No confirm hash — return confirmation preview
    const hash = await generateConfirmHash(confirmParams)

    // Build the base URL for the execute link (current URL without confirm param)
    const baseUrl = url.toString()

    // Build cancel URL (the collection or entity URL without the action)
    let cancelUrl: string
    if (route.kind === 'collection-action') {
      cancelUrl = `${url.protocol}//${url.host}/~${tenant}/${route.collection}`
    } else {
      // entity-action: cancel goes back to the entity
      cancelUrl = `${url.protocol}//${url.host}/~${tenant}/${route.entity.type}_${route.entity.sqid}`
    }

    const preview = buildConfirmPreview({
      action,
      type,
      data,
      baseUrl,
      cancelUrl,
      hash,
    })

    // Build the context and type URLs
    const $context = tenant ? `https://headless.ly/~${tenant}` : undefined
    const collection = route.kind === 'collection-action' ? route.collection : undefined
    const $type = collection ? `${url.protocol}//${url.host}/~${tenant}/${collection}` : undefined

    return c.var.respond({
      key: 'confirm',
      data: preview,
      $context,
      $type,
    })
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if an action looks like a verb (not a standard CRUD action).
 * Verbs are any action that isn't a standard REST/meta operation.
 */
function isVerbAction(action: string): boolean {
  // Meta resources start with $
  if (action.startsWith('$')) return false

  // Standard non-mutation actions that should NOT trigger confirmation
  const readActions = new Set(['list', 'get', 'find', 'search', 'count', 'export', 'schema'])
  if (readActions.has(action)) return false

  // Everything else that's not a default mutation is likely a verb
  if (DEFAULT_MUTATION_ACTIONS.has(action)) return false

  // If it's a lowercase alphabetic string, treat it as a verb
  return /^[a-z][a-zA-Z]*$/.test(action)
}

/**
 * Naive singularize — strips trailing 's'.
 * Good enough for Contact(s), Lead(s), Deal(s), etc.
 */
function singularize(plural: string): string {
  if (plural.endsWith('ies')) return plural.slice(0, -3) + 'y'
  if (plural.endsWith('ses') || plural.endsWith('xes') || plural.endsWith('zes')) return plural.slice(0, -2)
  if (plural.endsWith('s') && !plural.endsWith('ss')) return plural.slice(0, -1)
  return plural
}
