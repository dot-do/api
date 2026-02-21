import type { ErrorDetail, ErrorContext } from '../types'

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

// =============================================================================
// ApiError — throwable error with status, code, links, and enriched fields
// =============================================================================

export interface ApiErrorOptions {
  code?: string
  status?: number
  fields?: Record<string, string>
  retryAfter?: number
  yourVersion?: number
  currentVersion?: number
  feature?: string
  links?: Record<string, string>
}

/**
 * Throwable error class that carries structured error metadata.
 * When caught by the global error handler, the status, code, fields,
 * retryAfter, version info, feature, and links are all preserved in the response.
 */
export class ApiError extends Error {
  code: string
  status: number
  fields?: Record<string, string>
  retryAfter?: number
  yourVersion?: number
  currentVersion?: number
  feature?: string
  links?: Record<string, string>

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = options.code || ErrorCode.INTERNAL_ERROR
    this.status = options.status || 500
    if (options.fields) this.fields = options.fields
    if (options.retryAfter !== undefined) this.retryAfter = options.retryAfter
    if (options.yourVersion !== undefined) this.yourVersion = options.yourVersion
    if (options.currentVersion !== undefined) this.currentVersion = options.currentVersion
    if (options.feature) this.feature = options.feature
    if (options.links) this.links = options.links
  }
}

// =============================================================================
// Error factories — backward-compatible, now with optional context
// =============================================================================

export function notFound(resource = 'Resource'): ErrorDetail {
  return {
    message: `${resource} not found`,
    code: ErrorCode.NOT_FOUND,
    status: 404,
  }
}

export function badRequest(message: string): ErrorDetail {
  return {
    message,
    code: ErrorCode.BAD_REQUEST,
    status: 400,
  }
}

export function unauthorized(message = 'Authentication required'): ErrorDetail {
  return {
    message,
    code: ErrorCode.UNAUTHORIZED,
    status: 401,
  }
}

export function forbidden(message = 'Access denied'): ErrorDetail {
  return {
    message,
    code: ErrorCode.FORBIDDEN,
    status: 403,
  }
}

export function rateLimited(message = 'Rate limit exceeded'): ErrorDetail {
  return {
    message,
    code: ErrorCode.RATE_LIMITED,
    status: 429,
  }
}

export function internal(message = 'Internal server error'): ErrorDetail {
  return {
    message,
    code: ErrorCode.INTERNAL_ERROR,
    status: 500,
  }
}

export function validationError(fields: Record<string, string>, message?: string): ErrorDetail {
  const count = Object.keys(fields).length
  return {
    message: message || `${count} field${count === 1 ? '' : 's'} failed validation`,
    code: ErrorCode.VALIDATION_ERROR,
    status: 422,
    fields,
  }
}

export function conflict(
  message = 'Resource conflict',
  versionInfo?: { yourVersion?: number; currentVersion?: number }
): ErrorDetail {
  return {
    message,
    code: ErrorCode.CONFLICT,
    status: 409,
    ...(versionInfo?.yourVersion !== undefined && { yourVersion: versionInfo.yourVersion }),
    ...(versionInfo?.currentVersion !== undefined && { currentVersion: versionInfo.currentVersion }),
  }
}

export function paymentRequired(message = 'Payment required', options?: { feature?: string }): ErrorDetail {
  return {
    message,
    code: ErrorCode.PAYMENT_REQUIRED,
    status: 402,
    ...(options?.feature && { feature: options.feature }),
  }
}

// =============================================================================
// Link builder — context-aware actionable links per error code
// =============================================================================

/**
 * Build actionable links based on error code and request context.
 * Every error response is an opportunity, never a dead end.
 */
export function buildErrorLinks(code: string, context: ErrorContext): Record<string, string> {
  const { baseUrl, tenant, collection, entityId, query } = context
  if (!baseUrl) return {}

  const home = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const links: Record<string, string> = { home }

  const tenantPrefix = tenant ? `/~${tenant}` : ''

  switch (code) {
    case ErrorCode.NOT_FOUND: {
      if (collection) {
        links.collection = `${baseUrl}${tenantPrefix}/${collection}`
        links.search = `${baseUrl}${tenantPrefix}/${collection}?q=${query || ''}`
        links.create = `${baseUrl}${tenantPrefix}/${collection}/create`
      }
      break
    }

    case ErrorCode.BAD_REQUEST: {
      if (collection) {
        links.schema = `${baseUrl}${tenantPrefix}/${collection}/$schema`
      }
      break
    }

    case ErrorCode.UNAUTHORIZED: {
      links.login = `${baseUrl}/login`
      links.register = `${baseUrl}/register`
      break
    }

    case ErrorCode.FORBIDDEN: {
      links.upgrade = `${baseUrl}${tenantPrefix}/upgrade`
      break
    }

    case ErrorCode.PAYMENT_REQUIRED: {
      links.upgrade = `${baseUrl}${tenantPrefix}/upgrade`
      break
    }

    case ErrorCode.RATE_LIMITED: {
      links.upgrade = `${baseUrl}${tenantPrefix}/upgrade`
      break
    }

    case ErrorCode.VALIDATION_ERROR: {
      if (collection) {
        links.schema = `${baseUrl}${tenantPrefix}/${collection}/$schema`
      }
      break
    }

    case ErrorCode.CONFLICT: {
      if (entityId) {
        links.current = `${baseUrl}${tenantPrefix}/${entityId}`
      }
      break
    }

    case ErrorCode.INTERNAL_ERROR: {
      links.status = `${baseUrl}/status`
      break
    }
  }

  return links
}
