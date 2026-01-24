import type { Context, ErrorHandler } from 'hono'
import type { ApiEnv, ApiConfig, ErrorDetail } from '../types'

/**
 * Creates a global error handler for Hono's app.onError()
 * that catches unhandled errors and returns a consistent error envelope response.
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

    const errorDetail: ErrorDetail = {
      message,
      code,
      status: 500,
    }

    // Use the respond helper if available (set by responseMiddleware)
    const respond = c.var.respond
    if (respond) {
      return respond({
        error: errorDetail,
        status: 500,
      })
    }

    // Fallback if respond helper is not available
    // Build a minimal envelope matching the respond helper format
    const url = new URL(c.req.url)

    return c.json(
      {
        api: {
          name: config.name,
          description: config.description,
          url: `${url.protocol}//${url.host}${config.basePath || ''}`,
          version: config.version,
        },
        links: {
          self: url.toString(),
        },
        error: errorDetail,
      },
      500
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
