import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { metaMiddleware } from '../../src/middleware/meta'
import { routerMiddleware } from '../../src/router'
import { responseMiddleware } from '../../src/response'
import type { ApiEnv } from '../../src/types'
import type { MetaResourceConfig } from '../../src/conventions/meta-resources'

function createApp(config?: MetaResourceConfig) {
  const app = new Hono<ApiEnv>()
  app.use('*', responseMiddleware({ name: 'crm.do' }))
  app.use('*', routerMiddleware())
  app.use('*', metaMiddleware(config))
  // Fallback for non-meta routes
  app.all('*', (c) => {
    return c.var.respond({ data: { fallthrough: true } })
  })
  return app
}

describe('Meta Middleware', () => {
  // ============================================================================
  // $pageSize
  // ============================================================================
  describe('$pageSize dispatch', () => {
    it('returns page size options for collection', async () => {
      const app = createApp()
      const res = await app.request('https://crm.do/~acme/contacts/$pageSize')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.api.name).toBe('crm.do')
      expect(body.pageSize).toBeDefined()
      expect(body.pageSize['25']).toContain('limit=25')
    })
  })

  // ============================================================================
  // $sort
  // ============================================================================
  describe('$sort dispatch', () => {
    it('returns sort options for collection', async () => {
      const app = createApp()
      const res = await app.request('https://crm.do/~acme/contacts/$sort')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.sort).toBeDefined()
      expect(body.sort['Newest first']).toContain('sort=createdAt.desc')
    })

    it('includes custom sortable fields', async () => {
      const app = createApp({
        sortableFields: { contacts: ['name', 'email'] },
      })
      const res = await app.request('https://crm.do/~acme/contacts/$sort')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.sort['Name (A-Z)']).toContain('sort=name.asc')
      expect(body.sort['Email (A-Z)']).toContain('sort=email.asc')
    })
  })

  // ============================================================================
  // $count
  // ============================================================================
  describe('$count dispatch', () => {
    it('returns count from provider', async () => {
      const app = createApp({
        countProvider: async () => 847,
      })
      const res = await app.request('https://crm.do/~acme/contacts/$count')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.count).toBe(847)
    })

    it('returns null count when no provider configured', async () => {
      const app = createApp()
      const res = await app.request('https://crm.do/~acme/contacts/$count')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.count).toBeNull()
    })
  })

  // ============================================================================
  // $schema
  // ============================================================================
  describe('$schema dispatch', () => {
    it('returns schema from provider', async () => {
      const mockSchema = {
        type: 'object',
        properties: { name: { type: 'string' } },
      }
      const app = createApp({
        schemaProvider: () => mockSchema,
      })
      const res = await app.request('https://crm.do/~acme/contacts/$schema')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.schema).toEqual(mockSchema)
    })

    it('returns null schema when no provider', async () => {
      const app = createApp()
      const res = await app.request('https://crm.do/~acme/contacts/$schema')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.schema).toBeNull()
    })
  })

  // ============================================================================
  // $pages
  // ============================================================================
  describe('$pages dispatch', () => {
    it('returns page links from provider', async () => {
      const app = createApp({
        countProvider: async () => 100,
      })
      const res = await app.request('https://crm.do/~acme/contacts/$pages')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.pages).toBeDefined()
      expect(body.pages['1']).toContain('page=1')
    })
  })

  // ============================================================================
  // Unknown meta-resource
  // ============================================================================
  describe('unknown meta-resource', () => {
    it('returns 404 for unknown meta-resource', async () => {
      const app = createApp()
      const res = await app.request('https://crm.do/~acme/contacts/$unknown')
      expect(res.status).toBe(404)

      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.message).toContain('unknown')
    })
  })

  // ============================================================================
  // Non-meta routes pass through
  // ============================================================================
  describe('non-meta routes', () => {
    it('passes through collection routes', async () => {
      const app = createApp()
      const res = await app.request('https://crm.do/~acme/contacts')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.data.fallthrough).toBe(true)
    })

    it('passes through entity routes', async () => {
      const app = createApp()
      const res = await app.request('https://crm.do/~acme/contact_abc')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.data.fallthrough).toBe(true)
    })
  })

  // ============================================================================
  // Entity-level meta-resources
  // ============================================================================
  describe('entity-level meta-resources', () => {
    it('returns 404 for $history (entity meta) without historyProvider', async () => {
      const app = createApp()
      const res = await app.request('https://crm.do/~acme/contact_abc/$history')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.history).toBeNull()
    })

    it('returns 404 for $events (entity meta) without eventsProvider', async () => {
      const app = createApp()
      const res = await app.request('https://crm.do/~acme/contact_abc/$events')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.events).toBeNull()
    })
  })

  // ============================================================================
  // Custom config
  // ============================================================================
  describe('custom config', () => {
    it('uses custom page sizes', async () => {
      const app = createApp({ pageSizes: [10, 20, 50] })
      const res = await app.request('https://crm.do/~acme/contacts/$pageSize')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(Object.keys(body.pageSize)).toEqual(['10', '20', '50'])
    })
  })
})
