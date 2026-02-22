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
    it('returns discovery links (not nested in data)', async () => {
      const res = await fetch(APIS_DO_URL)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      expect(body.api).toBeDefined()

      // Discovery links in envelope.links
      const links = body.links as Record<string, string>
      expect(links.services).toMatch(/^https:\/\/apis\.do\//)
      expect(links.categories).toMatch(/^https:\/\/apis\.do\//)
      expect(links.events).toMatch(/^https:\/\/apis\.do\//)
      expect(links.mcp).toMatch(/^https:\/\/apis\.do\//)

      // No data wrapper — landing is pure discovery
      expect(body.data).toBeUndefined()
    })

    it('includes links and user', async () => {
      const res = await fetch(APIS_DO_URL)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.links).toBeDefined()
      expect(body.user).toBeDefined()
    })
  })

  describe('service registry', () => {
    it('lists all services under semantic key', async () => {
      const res = await fetch(`${APIS_DO_URL}/services`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.services as unknown[]
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThan(300)
      expect(body.total).toBe(list.length)
    })

    it('filters by category', async () => {
      const res = await fetch(`${APIS_DO_URL}/services?category=ai`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.services as Array<{ category: string }>
      expect(list.every((s) => s.category === 'ai')).toBe(true)
    })

    it('searches by query', async () => {
      const res = await fetch(`${APIS_DO_URL}/services?q=database`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.services as unknown[]
      expect(list.length).toBeGreaterThan(0)
    })
  })

  describe('categories', () => {
    it('lists categories under semantic key', async () => {
      const res = await fetch(`${APIS_DO_URL}/categories`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.categories as Array<{ slug: string }>
      expect(list.length).toBeGreaterThan(5)
      expect(body.total).toBe(list.length)
    })

    it('returns category detail', async () => {
      const res = await fetch(`${APIS_DO_URL}/categories/infrastructure`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const cat = body.category as Record<string, unknown>
      expect(cat.slug).toBe('infrastructure')
      expect(cat.services).toBeDefined()
    })
  })

  describe('backward-compat: /apis', () => {
    it('lists available APIs under semantic key', async () => {
      const res = await fetch(`${APIS_DO_URL}/apis`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.apis as unknown[]
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThan(300)
    })

    it('supports search via q parameter', async () => {
      const res = await fetch(`${APIS_DO_URL}/apis?q=database`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const list = body.apis as unknown[]
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThan(0)
    })
  })

  describe('service-scoped discovery', () => {
    it('returns events service with dynamic key and links', async () => {
      const res = await fetch(`${APIS_DO_URL}/events`)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      const svc = body.events as Record<string, unknown>
      expect(svc.name).toBe('events')
      const links = body.links as Record<string, string>
      expect(links.also).toBe('https://events.do/api')
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
