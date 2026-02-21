import { describe, it, expect } from 'vitest'
import {
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  rateLimited,
  internal,
  validationError,
  conflict,
  paymentRequired,
  buildErrorLinks,
  ErrorCode,
  type ErrorCodeType,
} from '../../src/helpers/errors'
import { API, ErrorCode as ExportedErrorCode } from '../../src/index'

describe('ErrorCode enum', () => {
  it('exports ErrorCode object with expected values', () => {
    expect(ErrorCode).toBeDefined()
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED')
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorCode.RATE_LIMITED).toBe('RATE_LIMITED')
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
    expect(ErrorCode.BAD_REQUEST).toBe('BAD_REQUEST')
    expect(ErrorCode.METHOD_NOT_ALLOWED).toBe('METHOD_NOT_ALLOWED')
    expect(ErrorCode.CONFLICT).toBe('CONFLICT')
    expect(ErrorCode.PAYMENT_REQUIRED).toBe('PAYMENT_REQUIRED')
  })

  it('is exported from src/index.ts', () => {
    expect(ExportedErrorCode).toBeDefined()
    expect(ExportedErrorCode).toBe(ErrorCode)
  })

  it('ErrorCodeType type works with all error code values', () => {
    // Type test: these should compile without errors
    const codes: ErrorCodeType[] = [
      ErrorCode.VALIDATION_ERROR,
      ErrorCode.NOT_FOUND,
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.RATE_LIMITED,
      ErrorCode.INTERNAL_ERROR,
      ErrorCode.BAD_REQUEST,
      ErrorCode.METHOD_NOT_ALLOWED,
      ErrorCode.CONFLICT,
      ErrorCode.PAYMENT_REQUIRED,
    ]
    expect(codes).toHaveLength(10)
  })

  it('error helper functions use ErrorCode values', () => {
    expect(notFound().code).toBe(ErrorCode.NOT_FOUND)
    expect(badRequest('test').code).toBe(ErrorCode.BAD_REQUEST)
    expect(unauthorized().code).toBe(ErrorCode.UNAUTHORIZED)
    expect(forbidden().code).toBe(ErrorCode.FORBIDDEN)
    expect(rateLimited().code).toBe(ErrorCode.RATE_LIMITED)
    expect(internal().code).toBe(ErrorCode.INTERNAL_ERROR)
    expect(validationError({}).code).toBe(ErrorCode.VALIDATION_ERROR)
    expect(conflict().code).toBe(ErrorCode.CONFLICT)
    expect(paymentRequired().code).toBe(ErrorCode.PAYMENT_REQUIRED)
  })
})

describe('Error helpers', () => {
  // ============================================================================
  // Backward compatibility — existing signatures still work
  // ============================================================================
  describe('backward compatibility', () => {
    it('notFound() without context still works', () => {
      const error = notFound()
      expect(error.status).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toBe('Resource not found')
    })

    it('notFound(resource) without context still works', () => {
      const error = notFound('User')
      expect(error.message).toBe('User not found')
    })

    it('badRequest(message) without context still works', () => {
      const error = badRequest('Invalid input')
      expect(error.status).toBe(400)
      expect(error.code).toBe('BAD_REQUEST')
      expect(error.message).toBe('Invalid input')
    })

    it('unauthorized() without context still works', () => {
      const error = unauthorized()
      expect(error.status).toBe(401)
      expect(error.message).toBe('Authentication required')
    })

    it('unauthorized(message) without context still works', () => {
      const error = unauthorized('Invalid token')
      expect(error.message).toBe('Invalid token')
    })

    it('forbidden() without context still works', () => {
      const error = forbidden()
      expect(error.status).toBe(403)
      expect(error.message).toBe('Access denied')
    })

    it('forbidden(message) without context still works', () => {
      const error = forbidden('Insufficient permissions')
      expect(error.message).toBe('Insufficient permissions')
    })

    it('rateLimited() without context still works', () => {
      const error = rateLimited()
      expect(error.status).toBe(429)
      expect(error.message).toBe('Rate limit exceeded')
    })

    it('rateLimited(message) without context still works', () => {
      const error = rateLimited('Too many requests')
      expect(error.message).toBe('Too many requests')
    })

    it('internal() without context still works', () => {
      const error = internal()
      expect(error.status).toBe(500)
      expect(error.message).toBe('Internal server error')
    })

    it('internal(message) without context still works', () => {
      const error = internal('Database connection failed')
      expect(error.message).toBe('Database connection failed')
    })

    it('all helpers without context return consistent structure', () => {
      const errors = [notFound(), badRequest('test'), unauthorized(), forbidden(), rateLimited(), internal()]
      for (const error of errors) {
        expect(error).toHaveProperty('message')
        expect(error).toHaveProperty('code')
        expect(error).toHaveProperty('status')
      }
    })
  })

  // ============================================================================
  // notFound with context
  // ============================================================================
  describe('notFound', () => {
    it('returns 404 with NOT_FOUND code', () => {
      const error = notFound()
      expect(error.status).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
    })

    it('uses default message with Resource prefix', () => {
      const error = notFound()
      expect(error.message).toBe('Resource not found')
    })

    it('accepts custom resource name', () => {
      const error = notFound('User')
      expect(error.message).toBe('User not found')
    })
  })

  // ============================================================================
  // badRequest with context
  // ============================================================================
  describe('badRequest', () => {
    it('returns 400 with BAD_REQUEST code', () => {
      const error = badRequest('Invalid input')
      expect(error.status).toBe(400)
      expect(error.code).toBe('BAD_REQUEST')
    })

    it('accepts custom message', () => {
      const error = badRequest('Missing required field: email')
      expect(error.message).toBe('Missing required field: email')
    })
  })

  // ============================================================================
  // unauthorized with context
  // ============================================================================
  describe('unauthorized', () => {
    it('returns 401 with UNAUTHORIZED code', () => {
      const error = unauthorized()
      expect(error.status).toBe(401)
      expect(error.code).toBe('UNAUTHORIZED')
    })

    it('uses default message', () => {
      const error = unauthorized()
      expect(error.message).toBe('Authentication required')
    })

    it('accepts custom message', () => {
      const error = unauthorized('Invalid token')
      expect(error.message).toBe('Invalid token')
    })
  })

  // ============================================================================
  // forbidden with context
  // ============================================================================
  describe('forbidden', () => {
    it('returns 403 with FORBIDDEN code', () => {
      const error = forbidden()
      expect(error.status).toBe(403)
      expect(error.code).toBe('FORBIDDEN')
    })

    it('uses default message', () => {
      const error = forbidden()
      expect(error.message).toBe('Access denied')
    })

    it('accepts custom message', () => {
      const error = forbidden('Insufficient permissions')
      expect(error.message).toBe('Insufficient permissions')
    })
  })

  // ============================================================================
  // rateLimited with context
  // ============================================================================
  describe('rateLimited', () => {
    it('returns 429 with RATE_LIMITED code', () => {
      const error = rateLimited()
      expect(error.status).toBe(429)
      expect(error.code).toBe('RATE_LIMITED')
    })

    it('uses default message', () => {
      const error = rateLimited()
      expect(error.message).toBe('Rate limit exceeded')
    })

    it('accepts custom message', () => {
      const error = rateLimited('Too many requests, try again in 60 seconds')
      expect(error.message).toBe('Too many requests, try again in 60 seconds')
    })
  })

  // ============================================================================
  // internal with context
  // ============================================================================
  describe('internal', () => {
    it('returns 500 with INTERNAL_ERROR code', () => {
      const error = internal()
      expect(error.status).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
    })

    it('uses default message', () => {
      const error = internal()
      expect(error.message).toBe('Internal server error')
    })

    it('accepts custom message', () => {
      const error = internal('Database connection failed')
      expect(error.message).toBe('Database connection failed')
    })
  })

  // ============================================================================
  // validationError
  // ============================================================================
  describe('validationError', () => {
    it('returns 422 with VALIDATION_ERROR code', () => {
      const error = validationError({ email: 'Must be a valid email address' })
      expect(error.status).toBe(422)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('includes field errors', () => {
      const fields = {
        email: 'Must be a valid email address',
        status: 'Must be one of: Active, Qualified, Churned',
      }
      const error = validationError(fields)
      expect(error.fields).toEqual(fields)
    })

    it('generates message from field count', () => {
      const error = validationError({
        email: 'Invalid',
        name: 'Required',
      })
      expect(error.message).toBe('2 fields failed validation')
    })

    it('handles single field validation', () => {
      const error = validationError({ email: 'Invalid' })
      expect(error.message).toBe('1 field failed validation')
    })

    it('accepts custom message', () => {
      const error = validationError({ email: 'Invalid' }, 'Custom validation message')
      expect(error.message).toBe('Custom validation message')
    })
  })

  // ============================================================================
  // conflict
  // ============================================================================
  describe('conflict', () => {
    it('returns 409 with CONFLICT code', () => {
      const error = conflict()
      expect(error.status).toBe(409)
      expect(error.code).toBe('CONFLICT')
    })

    it('uses default message', () => {
      const error = conflict()
      expect(error.message).toBe('Resource conflict')
    })

    it('accepts custom message', () => {
      const error = conflict('Version mismatch')
      expect(error.message).toBe('Version mismatch')
    })

    it('includes version info when provided', () => {
      const error = conflict('Version mismatch', { yourVersion: 3, currentVersion: 5 })
      expect(error.yourVersion).toBe(3)
      expect(error.currentVersion).toBe(5)
    })
  })

  // ============================================================================
  // paymentRequired
  // ============================================================================
  describe('paymentRequired', () => {
    it('returns 402 with PAYMENT_REQUIRED code', () => {
      const error = paymentRequired()
      expect(error.status).toBe(402)
      expect(error.code).toBe('PAYMENT_REQUIRED')
    })

    it('uses default message', () => {
      const error = paymentRequired()
      expect(error.message).toBe('Payment required')
    })

    it('accepts custom message', () => {
      const error = paymentRequired('Upgrade to access this feature')
      expect(error.message).toBe('Upgrade to access this feature')
    })

    it('includes feature when provided', () => {
      const error = paymentRequired('Upgrade to access analytics', { feature: 'analytics' })
      expect(error.feature).toBe('analytics')
    })
  })

  // ============================================================================
  // Error envelope format
  // ============================================================================
  describe('Error envelope format', () => {
    it('error has message, code, and status properties', () => {
      const error = notFound('Item')
      expect(error).toHaveProperty('message')
      expect(error).toHaveProperty('code')
      expect(error).toHaveProperty('status')
      expect(typeof error.message).toBe('string')
      expect(typeof error.code).toBe('string')
      expect(typeof error.status).toBe('number')
    })

    it('all helpers return consistent structure', () => {
      const errors = [notFound(), badRequest('test'), unauthorized(), forbidden(), rateLimited(), internal(), validationError({}), conflict(), paymentRequired()]

      for (const error of errors) {
        expect(error).toHaveProperty('message')
        expect(error).toHaveProperty('code')
        expect(error).toHaveProperty('status')
      }
    })
  })

  // ============================================================================
  // buildErrorLinks
  // ============================================================================
  describe('buildErrorLinks', () => {
    const baseCtx = { baseUrl: 'https://crm.do', tenant: 'acme', collection: 'contacts' }

    it('notFound links include collection, search, create', () => {
      const links = buildErrorLinks('NOT_FOUND', baseCtx)
      expect(links.home).toBe('https://crm.do/')
      expect(links.collection).toBe('https://crm.do/~acme/contacts')
      expect(links.search).toBe('https://crm.do/~acme/contacts?q=')
      expect(links.create).toBe('https://crm.do/~acme/contacts/create')
    })

    it('notFound links include search with query', () => {
      const links = buildErrorLinks('NOT_FOUND', { ...baseCtx, query: 'xyz' })
      expect(links.search).toBe('https://crm.do/~acme/contacts?q=xyz')
    })

    it('badRequest links include schema', () => {
      const links = buildErrorLinks('BAD_REQUEST', baseCtx)
      expect(links.home).toBe('https://crm.do/')
      expect(links.schema).toBe('https://crm.do/~acme/contacts/$schema')
    })

    it('unauthorized links include login and register', () => {
      const links = buildErrorLinks('UNAUTHORIZED', baseCtx)
      expect(links.home).toBe('https://crm.do/')
      expect(links.login).toBe('https://crm.do/login')
      expect(links.register).toBe('https://crm.do/register')
    })

    it('forbidden links include upgrade', () => {
      const links = buildErrorLinks('FORBIDDEN', baseCtx)
      expect(links.home).toBe('https://crm.do/')
      expect(links.upgrade).toContain('upgrade')
    })

    it('rateLimited links include upgrade', () => {
      const links = buildErrorLinks('RATE_LIMITED', baseCtx)
      expect(links.home).toBe('https://crm.do/')
      expect(links.upgrade).toContain('upgrade')
    })

    it('validationError links include schema', () => {
      const links = buildErrorLinks('VALIDATION_ERROR', baseCtx)
      expect(links.home).toBe('https://crm.do/')
      expect(links.schema).toBe('https://crm.do/~acme/contacts/$schema')
    })

    it('conflict links include current version link', () => {
      const links = buildErrorLinks('CONFLICT', { ...baseCtx, entityId: 'contact_abc' })
      expect(links.home).toBe('https://crm.do/')
      expect(links.current).toBe('https://crm.do/~acme/contact_abc')
    })

    it('paymentRequired links include upgrade', () => {
      const links = buildErrorLinks('PAYMENT_REQUIRED', baseCtx)
      expect(links.home).toBe('https://crm.do/')
      expect(links.upgrade).toContain('upgrade')
    })

    it('internalError links include status and retry', () => {
      const links = buildErrorLinks('INTERNAL_ERROR', baseCtx)
      expect(links.home).toBe('https://crm.do/')
      expect(links.status).toContain('status')
    })

    it('always includes home link', () => {
      const codes = ['NOT_FOUND', 'BAD_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'RATE_LIMITED', 'VALIDATION_ERROR', 'CONFLICT', 'PAYMENT_REQUIRED', 'INTERNAL_ERROR'] as const
      for (const code of codes) {
        const links = buildErrorLinks(code, baseCtx)
        expect(links.home).toBe('https://crm.do/')
      }
    })

    it('works without tenant', () => {
      const links = buildErrorLinks('NOT_FOUND', { baseUrl: 'https://crm.do', collection: 'contacts' })
      expect(links.home).toBe('https://crm.do/')
      expect(links.collection).toBe('https://crm.do/contacts')
    })

    it('works with minimal context (baseUrl only)', () => {
      const links = buildErrorLinks('NOT_FOUND', { baseUrl: 'https://crm.do' })
      expect(links.home).toBe('https://crm.do/')
    })

    it('returns only home for unknown code', () => {
      const links = buildErrorLinks('UNKNOWN_CODE' as any, baseCtx)
      expect(links.home).toBe('https://crm.do/')
    })
  })

  // ============================================================================
  // Integration with respond helper
  // ============================================================================
  describe('Integration with respond helper', () => {
    it('notFound error integrates with respond', async () => {
      const app = API({
        name: 'error-integration-test',
        routes: (a) => {
          a.get('/item/:id', (c) => {
            const error = notFound('Item')
            return c.var.respond({ error, status: error.status })
          })
        },
      })

      const res = await app.request('/item/123')
      expect(res.status).toBe(404)

      const body = await res.json()
      expect(body.error.message).toBe('Item not found')
      expect(body.error.code).toBe('NOT_FOUND')
      expect(body.error.status).toBe(404)
      expect(body.api.name).toBe('error-integration-test')
    })

    it('badRequest error integrates with respond', async () => {
      const app = API({
        name: 'error-integration-test',
        routes: (a) => {
          a.post('/items', (c) => {
            const error = badRequest('Invalid JSON body')
            return c.var.respond({ error, status: error.status })
          })
        },
      })

      const res = await app.request('/items', { method: 'POST' })
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error.message).toBe('Invalid JSON body')
      expect(body.error.code).toBe('BAD_REQUEST')
    })

    it('unauthorized error integrates with respond', async () => {
      const app = API({
        name: 'error-integration-test',
        routes: (a) => {
          a.get('/protected', (c) => {
            const error = unauthorized()
            return c.var.respond({ error, status: error.status })
          })
        },
      })

      const res = await app.request('/protected')
      expect(res.status).toBe(401)

      const body = await res.json()
      expect(body.error.message).toBe('Authentication required')
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('forbidden error integrates with respond', async () => {
      const app = API({
        name: 'error-integration-test',
        routes: (a) => {
          a.delete('/admin/users', (c) => {
            const error = forbidden('Admin access required')
            return c.var.respond({ error, status: error.status })
          })
        },
      })

      const res = await app.request('/admin/users', { method: 'DELETE' })
      expect(res.status).toBe(403)

      const body = await res.json()
      expect(body.error.message).toBe('Admin access required')
      expect(body.error.code).toBe('FORBIDDEN')
    })

    it('rateLimited error integrates with respond', async () => {
      const app = API({
        name: 'error-integration-test',
        routes: (a) => {
          a.get('/api', (c) => {
            const error = rateLimited()
            return c.var.respond({ error, status: error.status })
          })
        },
      })

      const res = await app.request('/api')
      expect(res.status).toBe(429)

      const body = await res.json()
      expect(body.error.message).toBe('Rate limit exceeded')
      expect(body.error.code).toBe('RATE_LIMITED')
    })

    it('internal error integrates with respond', async () => {
      const app = API({
        name: 'error-integration-test',
        routes: (a) => {
          a.get('/crash', (c) => {
            const error = internal()
            return c.var.respond({ error, status: error.status })
          })
        },
      })

      const res = await app.request('/crash')
      expect(res.status).toBe(500)

      const body = await res.json()
      expect(body.error.message).toBe('Internal server error')
      expect(body.error.code).toBe('INTERNAL_ERROR')
    })

    it('validationError integrates with respond', async () => {
      const app = API({
        name: 'error-integration-test',
        routes: (a) => {
          a.post('/contacts', (c) => {
            const error = validationError({
              email: 'Must be a valid email address',
              status: 'Must be one of: Active, Qualified, Churned',
            })
            return c.var.respond({ error, status: error.status })
          })
        },
      })

      const res = await app.request('/contacts', { method: 'POST' })
      expect(res.status).toBe(422)

      const body = await res.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.fields).toEqual({
        email: 'Must be a valid email address',
        status: 'Must be one of: Active, Qualified, Churned',
      })
    })

    it('conflict error integrates with respond', async () => {
      const app = API({
        name: 'error-integration-test',
        routes: (a) => {
          a.put('/contacts/:id', (c) => {
            const error = conflict('Version mismatch', { yourVersion: 3, currentVersion: 5 })
            return c.var.respond({ error, status: error.status })
          })
        },
      })

      const res = await app.request('/contacts/abc', { method: 'PUT' })
      expect(res.status).toBe(409)

      const body = await res.json()
      expect(body.error.code).toBe('CONFLICT')
      expect(body.error.yourVersion).toBe(3)
      expect(body.error.currentVersion).toBe(5)
    })

    it('paymentRequired error integrates with respond', async () => {
      const app = API({
        name: 'error-integration-test',
        routes: (a) => {
          a.get('/premium', (c) => {
            const error = paymentRequired('Upgrade to access analytics', { feature: 'analytics' })
            return c.var.respond({ error, status: error.status })
          })
        },
      })

      const res = await app.request('/premium')
      expect(res.status).toBe(402)

      const body = await res.json()
      expect(body.error.code).toBe('PAYMENT_REQUIRED')
      expect(body.error.feature).toBe('analytics')
    })
  })
})
