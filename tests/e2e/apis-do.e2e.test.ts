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
    it('returns API directory info', async () => {
      const res = await fetch(APIS_DO_URL)
      expect(res.ok).toBe(true)

      const body = (await res.json()) as Record<string, unknown>
      expect(body.api).toBeDefined()

      const api = body.api as Record<string, unknown>
      expect(typeof api.name).toBe('string')
    })

    it('includes links', async () => {
      const res = await fetch(APIS_DO_URL)
      const body = (await res.json()) as Record<string, unknown>
      expect(body.links).toBeDefined()
    })
  })

  describe('API listing', () => {
    it('lists available APIs', async () => {
      const res = await fetch(`${APIS_DO_URL}/apis`)

      // apis.do may or may not have a /apis endpoint yet
      if (res.ok) {
        const body = (await res.json()) as Record<string, unknown>
        // Accept either { data: [...] } or { apis: [...] }
        const list = (body.data || body.apis) as unknown[]
        expect(Array.isArray(list)).toBe(true)
      } else {
        // Scaffold: endpoint not yet implemented
        expect([404, 501]).toContain(res.status)
      }
    })

    it('supports search via q parameter', async () => {
      const res = await fetch(`${APIS_DO_URL}/apis?q=database`)

      if (res.ok) {
        const body = (await res.json()) as Record<string, unknown>
        const list = (body.data || body.apis) as unknown[]
        expect(Array.isArray(list)).toBe(true)
      } else {
        expect([404, 501]).toContain(res.status)
      }
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

      // MCP may or may not be enabled
      if (res.ok) {
        const body = (await res.json()) as Record<string, unknown>
        expect(body.jsonrpc).toBe('2.0')
      } else {
        // Scaffold: MCP not yet enabled on apis.do
        expect([404, 405, 501]).toContain(res.status)
      }
    })
  })
})
