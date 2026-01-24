import { describe, it, expect } from 'vitest'
import {
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  rateLimited,
  internal
} from '../../src/helpers/errors'
import { API } from '../../src/index'

describe('Error helpers', () => {
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
      const errors = [
        notFound(),
        badRequest('test'),
        unauthorized(),
        forbidden(),
        rateLimited(),
        internal()
      ]

      for (const error of errors) {
        expect(error).toHaveProperty('message')
        expect(error).toHaveProperty('code')
        expect(error).toHaveProperty('status')
      }
    })
  })

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
  })
})
