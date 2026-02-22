import { describe, it, expect } from 'vitest'

/**
 * E2E tests for the apis.do managed service.
 *
 * apis.do is the central directory of all .do APIs, built with @dotdo/api.
 * These tests validate the live service responds correctly.
 *
 * Prerequisites:
 *   - apis.do deployed and accessible
 *
 * Run:
 *   pnpm test:e2e
 */

const APIS_DO_URL = process.env.APIS_DO_URL || 'https://apis.do'

describe('E2E: apis.do', () => {
  describe('root endpoint', () => {
    it('returns clickable-links discovery', async () => {
      const res = await fetch(APIS_DO_URL)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      expect(body.api).toBeDefined()

      const data = body.data as Record<string, unknown>
      expect(data.api).toBe('apis.do')
      expect(data.platform).toBeDefined()
      expect(data.events).toBeDefined()
      expect(data.compute).toBeDefined()
      expect(data.transports).toBeDefined()

      // All links should be full URLs
      const platform = data.platform as Record<string, string>
      expect(platform.services).toMatch(/^https:\/\/apis\.do\//)
    })

    it('includes links', async () => {
      const res = await fetch(APIS_DO_URL)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.links).toBeDefined()
    })
  })

  describe('service registry', () => {
    it('lists all services', async () => {
      const res = await fetch(`${APIS_DO_URL}/services`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.data as unknown[]
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThan(300)
    })

    it('filters by category', async () => {
      const res = await fetch(`${APIS_DO_URL}/services?category=ai`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.data as Array<{ category: string }>
      expect(list.every((s) => s.category === 'ai')).toBe(true)
    })

    it('searches by query', async () => {
      const res = await fetch(`${APIS_DO_URL}/services?q=database`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.data as unknown[]
      expect(list.length).toBeGreaterThan(0)
    })
  })

  describe('categories', () => {
    it('lists categories', async () => {
      const res = await fetch(`${APIS_DO_URL}/categories`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.data as Array<{ slug: string }>
      expect(list.length).toBeGreaterThan(5)
    })

    it('returns category detail', async () => {
      const res = await fetch(`${APIS_DO_URL}/categories/infrastructure`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const data = body.data as Record<string, unknown>
      expect(data.slug).toBe('infrastructure')
      expect(data.services).toBeDefined()
    })
  })

  describe('backward-compat: /apis', () => {
    it('lists available APIs', async () => {
      const res = await fetch(`${APIS_DO_URL}/apis`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.data as unknown[]
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThan(300)
    })

    it('supports search via q parameter', async () => {
      const res = await fetch(`${APIS_DO_URL}/apis?q=database`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.data as unknown[]
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThan(0)
    })
  })

  describe('service-scoped discovery', () => {
    it('returns events service page', async () => {
      const res = await fetch(`${APIS_DO_URL}/events`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const data = body.data as Record<string, unknown>
      expect(data.api).toBe('events')
      expect(data.also).toBe('https://events.do/api')
    })
  })

  describe('MCP endpoint', () => {
    it('responds to MCP discovery', async () => {
      const res = await fetch(`${APIS_DO_URL}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '0.0.1' },
          },
        }),
      })

      if (res.ok) {
        const body = (await res.json()) as Record<string, unknown>
        expect(body.jsonrpc).toBe('2.0')
      } else {
        expect([404, 405, 501]).toContain(res.status)
      }
    })
  })
})
