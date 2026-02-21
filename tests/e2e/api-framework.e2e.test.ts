import { describe, it, expect } from 'vitest'

/**
 * E2E tests for @dotdo/api framework features.
 *
 * These tests hit live deployed example workers built with API() to validate
 * that the framework conventions work correctly in production.
 *
 * Prerequisites:
 *   - Example workers deployed (e.g. api.example.com.ai, directory.example.com.ai)
 *
 * Run:
 *   pnpm test:e2e
 */

const API_URL = process.env.API_E2E_URL || 'https://api.example.com.ai'

describe('E2E: @dotdo/api framework', () => {
  describe('response envelope', () => {
    it('returns standard envelope with api block', async () => {
      const res = await fetch(API_URL)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      expect(body.api).toBeDefined()

      const api = body.api as Record<string, unknown>
      expect(typeof api.name).toBe('string')
      expect(typeof api.url).toBe('string')
    })

    it('includes links.self', async () => {
      const res = await fetch(API_URL)
      const body = (await res.json()) as Record<string, unknown>

      expect(body.links).toBeDefined()
      const links = body.links as Record<string, unknown>
      expect(typeof links.self).toBe('string')
      expect(links.self).toContain(new URL(API_URL).hostname)
    })
  })

  describe('CORS', () => {
    it('returns Access-Control-Allow-Origin on preflight', async () => {
      const res = await fetch(API_URL, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://example.com',
          'Access-Control-Request-Method': 'GET',
        },
      })
      expect(res.headers.get('access-control-allow-origin')).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('returns JSON 404 for unknown paths', async () => {
      const res = await fetch(`${API_URL}/__nonexistent_path__`)
      expect(res.status).toBe(404)

      const body = (await res.json()) as Record<string, unknown>
      expect(body.error).toBeDefined()

      const error = body.error as Record<string, unknown>
      expect(error.code).toBe('NOT_FOUND')
    })
  })

  describe('request metadata', () => {
    it('includes X-Request-Id header', async () => {
      const res = await fetch(API_URL)
      expect(res.headers.get('x-request-id')).toBeTruthy()
    })
  })
})
