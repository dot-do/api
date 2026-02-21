import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { API } from '../../src/index'

/**
 * Custom error class with code property for testing
 */
class CodedError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
    this.name = 'CodedError'
  }
}

describe('Error Middleware', () => {
  let originalConsoleError: typeof console.error
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalConsoleError = console.error
    console.error = vi.fn()
    originalNodeEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    console.error = originalConsoleError
    process.env.NODE_ENV = originalNodeEnv
  })

  // ============================================================================
  // Test 1: Catches thrown errors and returns 500 with error envelope
  // ============================================================================
  describe('catches thrown errors', () => {
    it('should return 500 status when handler throws an error', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/throw', () => {
            throw new Error('Something went wrong')
          })
        },
      })

      const res = await app.request('/throw')
      expect(res.status).toBe(500)
    })

    it('should return error in envelope format', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/throw', () => {
            throw new Error('Oops')
          })
        },
      })

      const res = await app.request('/throw')
      const body = await res.json()

      expect(body.api).toBeDefined()
      expect(body.api.name).toBe('error-test')
      expect(body.error).toBeDefined()
      expect(body.links).toBeDefined()
    })

    it('should handle async handler errors', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/async-throw', async () => {
            await Promise.resolve()
            throw new Error('Async error')
          })
        },
      })

      const res = await app.request('/async-throw')
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.message).toBe('Async error')
    })
  })

  // ============================================================================
  // Test 2: Preserves error message in response
  // ============================================================================
  describe('preserves error message', () => {
    it('should include the error message in the response', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/message', () => {
            throw new Error('Custom error message')
          })
        },
      })

      const res = await app.request('/message')
      const body = await res.json()

      expect(body.error.message).toBe('Custom error message')
    })

    it('should handle empty error message', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/empty', () => {
            throw new Error('')
          })
        },
      })

      const res = await app.request('/empty')
      const body = await res.json()

      expect(body.error.message).toBeDefined()
    })
  })

  // ============================================================================
  // Test 3: Includes error code if present on error object
  // ============================================================================
  describe('includes error code', () => {
    it('should include error code when present on error object', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/coded', () => {
            throw new CodedError('Database error', 'DB_ERROR')
          })
        },
      })

      const res = await app.request('/coded')
      const body = await res.json()

      expect(body.error.code).toBe('DB_ERROR')
      expect(body.error.message).toBe('Database error')
    })

    it('should use INTERNAL_ERROR code when error has no code', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/no-code', () => {
            throw new Error('Regular error')
          })
        },
      })

      const res = await app.request('/no-code')
      const body = await res.json()

      expect(body.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // ============================================================================
  // Test 4: Uses consistent error envelope format from respond helper
  // ============================================================================
  describe('uses consistent error envelope format', () => {
    it('should match the format used by respond helper for errors', async () => {
      const app = API({
        name: 'envelope-test',
        routes: (a) => {
          a.get('/manual-error', (c) =>
            c.var.respond({
              error: { message: 'Manual error', code: 'MANUAL', status: 500 },
              status: 500,
            })
          )
          a.get('/thrown-error', () => {
            throw new Error('Thrown error')
          })
        },
      })

      const manualRes = await app.request('/manual-error')
      const thrownRes = await app.request('/thrown-error')

      const manualBody = await manualRes.json()
      const thrownBody = await thrownRes.json()

      // Both should have same envelope structure
      expect(Object.keys(manualBody).sort()).toEqual(Object.keys(thrownBody).sort())
      expect(manualBody.api).toBeDefined()
      expect(thrownBody.api).toBeDefined()
      expect(manualBody.links).toBeDefined()
      expect(thrownBody.links).toBeDefined()
      expect(manualBody.error).toBeDefined()
      expect(thrownBody.error).toBeDefined()
    })

    it('should include status in error detail', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/throw', () => {
            throw new Error('Server error')
          })
        },
      })

      const res = await app.request('/throw')
      const body = await res.json()

      expect(body.error.status).toBe(500)
    })
  })

  // ============================================================================
  // Test 5: Doesn't expose stack trace in production
  // ============================================================================
  describe('stack trace handling', () => {
    it('should not include stack trace in production', async () => {
      process.env.NODE_ENV = 'production'

      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/throw', () => {
            throw new Error('Production error')
          })
        },
      })

      const res = await app.request('/throw')
      const body = await res.json()

      expect(body.error.stack).toBeUndefined()
      expect(body.error.details).toBeUndefined()
      expect(JSON.stringify(body)).not.toContain('at ')
    })

    it('should not expose stack trace by default', async () => {
      // Without explicitly setting NODE_ENV
      delete process.env.NODE_ENV

      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/throw', () => {
            throw new Error('Default env error')
          })
        },
      })

      const res = await app.request('/throw')
      const body = await res.json()

      expect(body.error.stack).toBeUndefined()
    })
  })

  // ============================================================================
  // Logs errors for debugging
  // ============================================================================
  describe('error logging', () => {
    it('should log errors to console.error', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/throw', () => {
            throw new Error('Logged error')
          })
        },
      })

      await app.request('/throw')

      expect(console.error).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Edge cases
  // ============================================================================
  describe('edge cases', () => {
    it('should handle TypeError', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/type-error', () => {
            const obj: unknown = null
            // This will throw a TypeError
            return (obj as { foo: () => void }).foo()
          })
        },
      })

      const res = await app.request('/type-error')
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle ReferenceError', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/ref-error', () => {
            // Force a reference error by using eval
            throw new ReferenceError('x is not defined')
          })
        },
      })

      const res = await app.request('/ref-error')
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.message).toBe('x is not defined')
    })

    it('should not interfere with successful responses', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/success', (c) => c.var.respond({ data: { ok: true } }))
        },
      })

      const res = await app.request('/success')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.ok).toBe(true)
      expect(body.error).toBeUndefined()
    })

    it('should handle errors in nested async calls', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/nested', async () => {
            const innerAsync = async () => {
              await Promise.resolve()
              throw new Error('Nested async error')
            }
            await innerAsync()
          })
        },
      })

      const res = await app.request('/nested')
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error.message).toBe('Nested async error')
    })

    it('should handle errors with additional properties', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/custom-error', () => {
            const err = new Error('Error with details')
            ;(err as Error & { details: unknown }).details = { field: 'username', reason: 'too short' }
            throw err
          })
        },
      })

      const res = await app.request('/custom-error')
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error.message).toBe('Error with details')
      // Details should not be exposed (security)
      expect(body.error.details).toBeUndefined()
    })
  })

  // ============================================================================
  // Enriched error handler — actionable links
  // ============================================================================
  describe('enriched error with actionable links', () => {
    it('should always include home link in error response', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/throw', () => {
            throw new Error('test')
          })
        },
      })

      const res = await app.request('/throw')
      const body = await res.json()

      expect(body.links).toBeDefined()
      expect(body.links.home).toBeDefined()
    })

    it('should include status link for internal errors', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/throw', () => {
            throw new Error('Server crash')
          })
        },
      })

      const res = await app.request('/throw')
      const body = await res.json()

      expect(body.links).toBeDefined()
      expect(body.links.status).toBeDefined()
    })

    it('should extract context from request URL for link building', async () => {
      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/throw', () => {
            throw new Error('test')
          })
        },
      })

      const res = await app.request('/throw')
      const body = await res.json()

      // The links should be based on the request URL
      expect(body.links.home).toContain('http')
    })

    it('should handle ApiError with status and links', async () => {
      const { ApiError } = await import('../../src/helpers/errors')

      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/not-found', () => {
            throw new ApiError('Contact not found', {
              code: 'NOT_FOUND',
              status: 404,
            })
          })
        },
      })

      const res = await app.request('/not-found')
      expect(res.status).toBe(404)

      const body = await res.json()
      expect(body.error.code).toBe('NOT_FOUND')
      expect(body.error.message).toBe('Contact not found')
      expect(body.links).toBeDefined()
      expect(body.links.home).toBeDefined()
    })

    it('should handle ApiError with custom links', async () => {
      const { ApiError } = await import('../../src/helpers/errors')

      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/forbidden', () => {
            throw new ApiError('Plan required', {
              code: 'FORBIDDEN',
              status: 403,
              links: { upgrade: 'https://billing.do/upgrade' },
            })
          })
        },
      })

      const res = await app.request('/forbidden')
      expect(res.status).toBe(403)

      const body = await res.json()
      expect(body.error.code).toBe('FORBIDDEN')
      expect(body.links.upgrade).toBe('https://billing.do/upgrade')
    })

    it('should handle ApiError with fields for validation errors', async () => {
      const { ApiError } = await import('../../src/helpers/errors')

      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.post('/contacts', () => {
            throw new ApiError('2 fields failed validation', {
              code: 'VALIDATION_ERROR',
              status: 422,
              fields: { email: 'Must be a valid email', name: 'Required' },
            })
          })
        },
      })

      const res = await app.request('/contacts', { method: 'POST' })
      expect(res.status).toBe(422)

      const body = await res.json()
      expect(body.error.fields).toEqual({ email: 'Must be a valid email', name: 'Required' })
    })

    it('should handle ApiError with retryAfter for rate limiting', async () => {
      const { ApiError } = await import('../../src/helpers/errors')

      const app = API({
        name: 'error-test',
        routes: (a) => {
          a.get('/limited', () => {
            throw new ApiError('Rate limit exceeded', {
              code: 'RATE_LIMITED',
              status: 429,
              retryAfter: 1847,
            })
          })
        },
      })

      const res = await app.request('/limited')
      expect(res.status).toBe(429)

      const body = await res.json()
      expect(body.error.retryAfter).toBe(1847)
    })
  })
})
