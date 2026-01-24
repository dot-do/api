import type { ErrorDetail } from '../types'

export function notFound(resource = 'Resource'): ErrorDetail {
  return {
    message: `${resource} not found`,
    code: 'NOT_FOUND',
    status: 404,
  }
}

export function badRequest(message: string): ErrorDetail {
  return {
    message,
    code: 'BAD_REQUEST',
    status: 400,
  }
}

export function unauthorized(message = 'Authentication required'): ErrorDetail {
  return {
    message,
    code: 'UNAUTHORIZED',
    status: 401,
  }
}

export function forbidden(message = 'Access denied'): ErrorDetail {
  return {
    message,
    code: 'FORBIDDEN',
    status: 403,
  }
}

export function rateLimited(message = 'Rate limit exceeded'): ErrorDetail {
  return {
    message,
    code: 'RATE_LIMITED',
    status: 429,
  }
}

export function internal(message = 'Internal server error'): ErrorDetail {
  return {
    message,
    code: 'INTERNAL_ERROR',
    status: 500,
  }
}
