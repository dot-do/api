import type { ErrorDetail } from '../types'

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
} as const

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode]

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
