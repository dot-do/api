import type { Context, ErrorHandler } from 'hono'
import type { ApiEnv, ApiConfig, ErrorDetail } from '../types'
import { ApiError, buildErrorLinks } from '../helpers/errors'

/**
 * Creates a global error handler for Hono's app.onError()
 * that catches unhandled errors and returns a consistent error envelope response.
 *
 * Enriches every error with actionable links — errors are never dead ends.
 *
 * Usage:
 *   const app = new Hono()
 *   app.onError(createErrorHandler(config))
 */
export function createErrorHandler(config: ApiConfig): ErrorHandler<ApiEnv> {
  return (err: Error, c: Context<ApiEnv>): Response => {
    // Log error for debugging
    console.error('Unhandled error:', err)

    // Extract error information
    const message = getErrorMessage(err)
    const code = getErrorCode(err)
    const status = getErrorStatus(err)

    const errorDetail: ErrorDetail = {
      message,
      code,
      status,
    }

    // Carry through structured fields from ApiError
    if (err instanceof ApiError) {
      if (err.fields) errorDetail.fields = err.fields
      if (err.retryAfter !== undefined) errorDetail.retryAfter = err.retryAfter
      if (err.yourVersion !== undefined) errorDetail.yourVersion = err.yourVersion
      if (err.currentVersion !== undefined) errorDetail.currentVersion = err.currentVersion
      if (err.feature) errorDetail.feature = err.feature
    }

    // Build context for actionable links
    const url = new URL(c.req.url)
    const baseUrl = `${url.protocol}//${url.host}${config.basePath || ''}`

    const tenant = c.var?.tenant
    const routeInfo = c.var?.routeInfo
    const collection = routeInfo && 'collection' in routeInfo ? (routeInfo as { collection?: string }).collection : undefined
    const entityId = routeInfo && 'entity' in routeInfo ? ((routeInfo as { entity?: { id?: string } }).entity?.id) : undefined

    // Build actionable links based on error code and context
    const contextLinks = buildErrorLinks(code, {
      baseUrl,
      tenant,
      collection,
      entityId,
      query: url.searchParams.get('q') || undefined,
    })

    // Merge with any custom links from ApiError
    const apiErrorLinks = err instanceof ApiError ? err.links : undefined

    const links = {
      self: url.toString(),
      ...contextLinks,
      ...apiErrorLinks,
    }

    // Use the respond helper if available (set by responseMiddleware)
    const respond = c.var.respond
    if (respond) {
      return respond({
        error: errorDetail,
        links,
        status,
      })
    }

    // Fallback if respond helper is not available
    // Build a minimal envelope matching the respond helper format
    return c.json(
      {
        api: {
          name: config.name,
          ...(config.description && { description: config.description }),
          url: baseUrl,
          ...(config.version && { version: config.version }),
        },
        links,
        error: errorDetail,
      },
      status as 100
    )
  }
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message || 'Internal server error'
  }
  if (typeof err === 'string') {
    return err || 'Internal server error'
  }
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message) || 'Internal server error'
  }
  return 'Internal server error'
}

/**
 * Extract error code from error object if present
 */
function getErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: unknown }).code
    if (typeof code === 'string') {
      return code
    }
  }
  return 'INTERNAL_ERROR'
}

/**
 * Extract HTTP status from error object if present (e.g. ApiError)
 */
function getErrorStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: unknown }).status
    if (typeof status === 'number' && status >= 400 && status < 600) {
      return status
    }
  }
  return 500
}
