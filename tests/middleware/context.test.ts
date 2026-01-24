import { describe, it, expect } from 'vitest'
import { API } from '../../src/index'

/**
 * Helper to create a mock Cloudflare CF object
 */
function createMockCfRequest(url: string, cf?: Record<string, unknown>): Request {
  const request = new Request(url)
  if (cf) {
    // Attach cf property to the request
    ;(request as unknown as { cf: Record<string, unknown> }).cf = cf
  }
  return request
}

describe('Context Middleware', () => {
  // ============================================================================
  // Request ID generation and setting
  // ============================================================================
  describe('Request ID generation', () => {
    it('should generate and set a request ID in context', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
        },
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.requestId).toBeDefined()
      expect(typeof body.data.requestId).toBe('string')
      expect(body.data.requestId.length).toBeGreaterThan(0)
    })

    it('should use cf-ray header as request ID when present', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
        },
      })

      const res = await app.request('/test', {
        headers: { 'cf-ray': 'test-cf-ray-123' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.requestId).toBe('test-cf-ray-123')
    })

    it('should use x-request-id header as fallback when cf-ray is absent', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
        },
      })

      const res = await app.request('/test', {
        headers: { 'x-request-id': 'custom-request-id-456' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.requestId).toBe('custom-request-id-456')
    })

    it('should prefer cf-ray over x-request-id when both are present', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
        },
      })

      const res = await app.request('/test', {
        headers: {
          'cf-ray': 'cf-ray-wins',
          'x-request-id': 'x-request-id-loses',
        },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.requestId).toBe('cf-ray-wins')
    })

    it('should generate UUID when no request ID headers are present', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
        },
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const body = await res.json()
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(body.data.requestId).toMatch(uuidRegex)
    })
  })

  // ============================================================================
  // Request IDs uniqueness
  // ============================================================================
  describe('Request ID uniqueness', () => {
    it('should generate unique request IDs across multiple requests', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
        },
      })

      const requestIds = new Set<string>()
      const requestCount = 100

      for (let i = 0; i < requestCount; i++) {
        const res = await app.request('/test')
        expect(res.status).toBe(200)
        const body = await res.json()
        requestIds.add(body.data.requestId)
      }

      // All request IDs should be unique
      expect(requestIds.size).toBe(requestCount)
    })
  })

  // ============================================================================
  // Geo properties extraction from CF object
  // ============================================================================
  describe('Geo properties extraction', () => {
    it('should extract geo properties from CF object', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: { geo: c.var.geo } }))
        },
      })

      // Create a request with CF object
      const cfObject = {
        country: 'US',
        city: 'San Francisco',
        continent: 'NA',
        latitude: '37.7749',
        longitude: '-122.4194',
        region: 'California',
        timezone: 'America/Los_Angeles',
      }

      const request = createMockCfRequest('http://localhost/test', cfObject)
      const res = await app.request(request)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.geo).toBeDefined()
      expect(body.data.geo.country).toBe('US')
      expect(body.data.geo.city).toBe('San Francisco')
      expect(body.data.geo.continent).toBe('NA')
      expect(body.data.geo.latitude).toBe('37.7749')
      expect(body.data.geo.longitude).toBe('-122.4194')
      expect(body.data.geo.region).toBe('California')
      expect(body.data.geo.timezone).toBe('America/Los_Angeles')
    })
  })

  // ============================================================================
  // Missing CF object handling
  // ============================================================================
  describe('Missing CF object handling', () => {
    it('should handle missing CF object gracefully', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: { geo: c.var.geo, requestId: c.var.requestId } }))
        },
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const body = await res.json()
      // geo should be undefined when CF object is missing
      expect(body.data.geo).toBeUndefined()
      // Request ID should still be set
      expect(body.data.requestId).toBeDefined()
    })
  })

  // ============================================================================
  // Response header for request ID
  // ============================================================================
  describe('Response header', () => {
    it('should set X-Request-Id in response header', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: { message: 'ok' } }))
        },
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      expect(res.headers.get('X-Request-Id')).toBeDefined()
      expect(res.headers.get('X-Request-Id')!.length).toBeGreaterThan(0)
    })

    it('should set X-Request-Id to match the context requestId', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
        },
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(res.headers.get('X-Request-Id')).toBe(body.data.requestId)
    })

    it('should preserve provided cf-ray in response header', async () => {
      const app = API({
        name: 'test-api',
        routes: (a) => {
          a.get('/test', (c) => c.var.respond({ data: {} }))
        },
      })

      const res = await app.request('/test', {
        headers: { 'cf-ray': 'my-cf-ray-id' },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Request-Id')).toBe('my-cf-ray-id')
    })
  })

  // ============================================================================
  // Edge cases - Partial CF object, null values
  // ============================================================================
  describe('Edge cases', () => {
    describe('Partial CF object', () => {
      it('should handle CF object with only country', async () => {
        const app = API({
          name: 'test-api',
          routes: (a) => {
            a.get('/test', (c) => c.var.respond({ data: { geo: c.var.geo } }))
          },
        })

        const cfObject = {
          country: 'GB',
        }

        const request = createMockCfRequest('http://localhost/test', cfObject)
        const res = await app.request(request)

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.geo).toBeDefined()
        expect(body.data.geo.country).toBe('GB')
        expect(body.data.geo.city).toBeUndefined()
        expect(body.data.geo.continent).toBeUndefined()
        expect(body.data.geo.latitude).toBeUndefined()
        expect(body.data.geo.longitude).toBeUndefined()
        expect(body.data.geo.region).toBeUndefined()
        expect(body.data.geo.timezone).toBeUndefined()
      })

      it('should handle CF object with only coordinates', async () => {
        const app = API({
          name: 'test-api',
          routes: (a) => {
            a.get('/test', (c) => c.var.respond({ data: { geo: c.var.geo } }))
          },
        })

        const cfObject = {
          latitude: '51.5074',
          longitude: '-0.1278',
        }

        const request = createMockCfRequest('http://localhost/test', cfObject)
        const res = await app.request(request)

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.geo).toBeDefined()
        expect(body.data.geo.latitude).toBe('51.5074')
        expect(body.data.geo.longitude).toBe('-0.1278')
        expect(body.data.geo.country).toBeUndefined()
        expect(body.data.geo.city).toBeUndefined()
      })

      it('should handle CF object with mixed properties', async () => {
        const app = API({
          name: 'test-api',
          routes: (a) => {
            a.get('/test', (c) => c.var.respond({ data: { geo: c.var.geo } }))
          },
        })

        const cfObject = {
          country: 'JP',
          city: 'Tokyo',
          timezone: 'Asia/Tokyo',
          // Missing: continent, latitude, longitude, region
        }

        const request = createMockCfRequest('http://localhost/test', cfObject)
        const res = await app.request(request)

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.geo).toBeDefined()
        expect(body.data.geo.country).toBe('JP')
        expect(body.data.geo.city).toBe('Tokyo')
        expect(body.data.geo.timezone).toBe('Asia/Tokyo')
        expect(body.data.geo.continent).toBeUndefined()
        expect(body.data.geo.latitude).toBeUndefined()
        expect(body.data.geo.longitude).toBeUndefined()
        expect(body.data.geo.region).toBeUndefined()
      })
    })

    describe('Null and undefined values in CF object', () => {
      it('should handle CF object with undefined values', async () => {
        const app = API({
          name: 'test-api',
          routes: (a) => {
            a.get('/test', (c) => c.var.respond({ data: { geo: c.var.geo } }))
          },
        })

        const cfObject = {
          country: 'FR',
          city: undefined,
          continent: 'EU',
          latitude: undefined,
          longitude: undefined,
          region: undefined,
          timezone: 'Europe/Paris',
        }

        const request = createMockCfRequest('http://localhost/test', cfObject)
        const res = await app.request(request)

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.geo).toBeDefined()
        expect(body.data.geo.country).toBe('FR')
        expect(body.data.geo.continent).toBe('EU')
        expect(body.data.geo.timezone).toBe('Europe/Paris')
        expect(body.data.geo.city).toBeUndefined()
      })

      it('should handle empty CF object', async () => {
        const app = API({
          name: 'test-api',
          routes: (a) => {
            a.get('/test', (c) => c.var.respond({ data: { geo: c.var.geo } }))
          },
        })

        const cfObject = {}

        const request = createMockCfRequest('http://localhost/test', cfObject)
        const res = await app.request(request)

        expect(res.status).toBe(200)
        const body = await res.json()
        // geo should be set but with all undefined values
        expect(body.data.geo).toBeDefined()
        expect(body.data.geo.country).toBeUndefined()
        expect(body.data.geo.city).toBeUndefined()
      })
    })

    describe('Request ID edge cases', () => {
      it('should handle empty cf-ray header', async () => {
        const app = API({
          name: 'test-api',
          routes: (a) => {
            a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
          },
        })

        const res = await app.request('/test', {
          headers: { 'cf-ray': '' },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        // Empty cf-ray should fall through to x-request-id or UUID
        // Since empty string is falsy, it should generate a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        expect(body.data.requestId).toMatch(uuidRegex)
      })

      it('should handle whitespace-only cf-ray header by generating UUID', async () => {
        const app = API({
          name: 'test-api',
          routes: (a) => {
            a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
          },
        })

        const res = await app.request('/test', {
          headers: { 'cf-ray': '   ' },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        // Hono's header() returns null/undefined for whitespace-only headers,
        // causing fallback to UUID generation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        expect(body.data.requestId).toMatch(uuidRegex)
      })

      it('should handle very long request ID', async () => {
        const app = API({
          name: 'test-api',
          routes: (a) => {
            a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
          },
        })

        const longId = 'x'.repeat(1000)
        const res = await app.request('/test', {
          headers: { 'x-request-id': longId },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.requestId).toBe(longId)
        expect(res.headers.get('X-Request-Id')).toBe(longId)
      })

      it('should handle special characters in request ID', async () => {
        const app = API({
          name: 'test-api',
          routes: (a) => {
            a.get('/test', (c) => c.var.respond({ data: { requestId: c.var.requestId } }))
          },
        })

        const specialId = 'req-123_abc.def-456'
        const res = await app.request('/test', {
          headers: { 'x-request-id': specialId },
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.requestId).toBe(specialId)
      })
    })

    describe('CF object with extra properties', () => {
      it('should only extract known geo properties, ignoring extra CF properties', async () => {
        const app = API({
          name: 'test-api',
          routes: (a) => {
            a.get('/test', (c) => c.var.respond({ data: { geo: c.var.geo } }))
          },
        })

        const cfObject = {
          country: 'AU',
          city: 'Sydney',
          continent: 'OC',
          latitude: '-33.8688',
          longitude: '151.2093',
          region: 'New South Wales',
          timezone: 'Australia/Sydney',
          // Extra CF properties that should not appear in geo
          colo: 'SYD',
          httpProtocol: 'HTTP/2',
          requestPriority: 'weight=256',
          tlsCipher: 'AEAD-AES128-GCM-SHA256',
          tlsVersion: 'TLSv1.3',
          asn: 12345,
          asOrganization: 'Example ISP',
        }

        const request = createMockCfRequest('http://localhost/test', cfObject)
        const res = await app.request(request)

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.geo).toBeDefined()

        // Check standard geo properties are extracted
        expect(body.data.geo.country).toBe('AU')
        expect(body.data.geo.city).toBe('Sydney')
        expect(body.data.geo.continent).toBe('OC')
        expect(body.data.geo.latitude).toBe('-33.8688')
        expect(body.data.geo.longitude).toBe('151.2093')
        expect(body.data.geo.region).toBe('New South Wales')
        expect(body.data.geo.timezone).toBe('Australia/Sydney')

        // Extra CF properties should not be in geo
        expect(body.data.geo.colo).toBeUndefined()
        expect(body.data.geo.httpProtocol).toBeUndefined()
        expect(body.data.geo.asn).toBeUndefined()
      })
    })
  })
})
