import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { parseRoute, routerMiddleware } from '../src/router'
import type { RouteInfo, ParsedRoute } from '../src/router'

// =============================================================================
// Unit tests for parseRoute (pure function, no Hono context needed)
// =============================================================================

describe('parseRoute', () => {
  describe('collection routes', () => {
    it('detects plural collection names', () => {
      const route = parseRoute('/contacts')
      expect(route.kind).toBe('collection')
      if (route.kind === 'collection') {
        expect(route.collection).toBe('contacts')
      }
    })

    it('detects collection from known list', () => {
      const route = parseRoute('/deals', { collections: ['contacts', 'deals', 'leads'] })
      expect(route.kind).toBe('collection')
      if (route.kind === 'collection') {
        expect(route.collection).toBe('deals')
      }
    })

    it('detects collection names without trailing slash', () => {
      const route = parseRoute('contacts')
      expect(route.kind).toBe('collection')
    })

    it('detects single-word paths as collection', () => {
      const route = parseRoute('/users')
      expect(route.kind).toBe('collection')
      if (route.kind === 'collection') {
        expect(route.collection).toBe('users')
      }
    })
  })

  describe('entity routes', () => {
    it('detects entity IDs with type_sqid pattern', () => {
      const route = parseRoute('/contact_abc')
      expect(route.kind).toBe('entity')
      if (route.kind === 'entity') {
        expect(route.entity.type).toBe('contact')
        expect(route.entity.collection).toBe('contacts')
        expect(route.entity.id).toBe('contact_abc')
        expect(route.entity.sqid).toBe('abc')
      }
    })

    it('detects entity IDs with mixed-case sqid', () => {
      const route = parseRoute('/deal_kRziM')
      expect(route.kind).toBe('entity')
      if (route.kind === 'entity') {
        expect(route.entity.type).toBe('deal')
        expect(route.entity.id).toBe('deal_kRziM')
      }
    })

    it('detects camelCase entity types', () => {
      const route = parseRoute('/featureFlag_x9z')
      expect(route.kind).toBe('entity')
      if (route.kind === 'entity') {
        expect(route.entity.type).toBe('featureFlag')
        expect(route.entity.collection).toBe('featureFlags')
      }
    })
  })

  describe('entity action routes', () => {
    it('detects entity action (verb)', () => {
      const route = parseRoute('/contact_abc/qualify')
      expect(route.kind).toBe('entity-action')
      if (route.kind === 'entity-action') {
        expect(route.entity.id).toBe('contact_abc')
        expect(route.action).toBe('qualify')
      }
    })

    it('detects entity action with camelCase verb', () => {
      const route = parseRoute('/deal_kRziM/markAsWon')
      expect(route.kind).toBe('entity-action')
      if (route.kind === 'entity-action') {
        expect(route.entity.type).toBe('deal')
        expect(route.action).toBe('markAsWon')
      }
    })
  })

  describe('collection action routes', () => {
    it('detects create action on collection', () => {
      const route = parseRoute('/contacts/create')
      expect(route.kind).toBe('collection-action')
      if (route.kind === 'collection-action') {
        expect(route.collection).toBe('contacts')
        expect(route.action).toBe('create')
      }
    })

    it('detects import action on collection', () => {
      const route = parseRoute('/leads/import')
      expect(route.kind).toBe('collection-action')
      if (route.kind === 'collection-action') {
        expect(route.collection).toBe('leads')
        expect(route.action).toBe('import')
      }
    })
  })

  describe('meta-resource routes', () => {
    it('detects $schema on collection', () => {
      const route = parseRoute('/contacts/$schema')
      expect(route.kind).toBe('meta')
      if (route.kind === 'meta') {
        expect(route.resource).toBe('schema')
        expect(route.collection).toBe('contacts')
        expect(route.entity).toBeUndefined()
      }
    })

    it('detects $history on entity', () => {
      const route = parseRoute('/contact_abc/$history')
      expect(route.kind).toBe('meta')
      if (route.kind === 'meta') {
        expect(route.resource).toBe('history')
        expect(route.entity?.id).toBe('contact_abc')
        expect(route.collection).toBeUndefined()
      }
    })

    it('detects root-level meta-resource', () => {
      const route = parseRoute('/$schema')
      expect(route.kind).toBe('meta')
      if (route.kind === 'meta') {
        expect(route.resource).toBe('schema')
      }
    })

    it('detects $events on entity', () => {
      const route = parseRoute('/deal_kRziM/$events')
      expect(route.kind).toBe('meta')
      if (route.kind === 'meta') {
        expect(route.resource).toBe('events')
        expect(route.entity?.type).toBe('deal')
      }
    })
  })

  describe('function call routes', () => {
    it('detects simple function call', () => {
      const route = parseRoute('/score(contact_abc)')
      expect(route.kind).toBe('function')
      if (route.kind === 'function') {
        expect(route.fn.name).toBe('score')
        expect(route.fn.args).toHaveLength(1)
        expect(route.fn.args[0]?.value).toBe('contact_abc')
        expect(route.fn.args[0]?.type).toBe('entity')
      }
    })

    it('detects dotted function name', () => {
      const route = parseRoute('/papa.parse(https://example.com/data.csv)')
      expect(route.kind).toBe('function')
      if (route.kind === 'function') {
        expect(route.fn.name).toBe('papa.parse')
        expect(route.fn.args[0]?.type).toBe('url')
      }
    })

    it('detects function with multiple args', () => {
      const route = parseRoute('/merge(contact_abc,contact_def)')
      expect(route.kind).toBe('function')
      if (route.kind === 'function') {
        expect(route.fn.name).toBe('merge')
        expect(route.fn.args).toHaveLength(2)
      }
    })

    it('detects function with named args', () => {
      const route = parseRoute('/query(limit=10,offset=0)')
      expect(route.kind).toBe('function')
      if (route.kind === 'function') {
        expect(route.fn.name).toBe('query')
        expect(route.fn.kwargs).toEqual({ limit: '10', offset: '0' })
      }
    })
  })

  describe('search routes', () => {
    it('detects search path', () => {
      const route = parseRoute('/search')
      expect(route.kind).toBe('search')
    })

    it('detects search with query params (path only)', () => {
      // Query params are not part of the path, router only sees /search
      const route = parseRoute('/search')
      expect(route.kind).toBe('search')
    })
  })

  describe('unknown routes', () => {
    it('returns unknown for empty path', () => {
      const route = parseRoute('/')
      expect(route.kind).toBe('unknown')
      if (route.kind === 'unknown') {
        expect(route.segments).toEqual([])
      }
    })

    it('returns unknown for empty string', () => {
      const route = parseRoute('')
      expect(route.kind).toBe('unknown')
    })
  })

  describe('edge cases', () => {
    it('handles paths with leading and trailing slashes', () => {
      const route = parseRoute('///contacts///')
      expect(route.kind).toBe('collection')
      if (route.kind === 'collection') {
        expect(route.collection).toBe('contacts')
      }
    })

    it('prioritizes entity ID over collection for type_sqid pattern', () => {
      const route = parseRoute('/contact_abc')
      expect(route.kind).toBe('entity')
    })

    it('prioritizes function call over everything', () => {
      const route = parseRoute('/score(contact_abc)')
      expect(route.kind).toBe('function')
    })
  })
})

// =============================================================================
// Integration tests with Hono middleware
// =============================================================================

describe('routerMiddleware', () => {
  function createApp(config?: Parameters<typeof routerMiddleware>[0]) {
    const app = new Hono()
    app.use('*', routerMiddleware(config))
    app.all('*', (c) => {
      const routeInfo = c.get('routeInfo') as RouteInfo
      const tenant = c.get('tenant') as string
      return c.json({ routeInfo, tenant })
    })
    return app
  }

  describe('tenant resolution', () => {
    it('extracts tenant from path prefix', async () => {
      const app = createApp()
      const res = await app.request('/~acme/contacts')
      const body = await res.json() as { routeInfo: RouteInfo; tenant: string }

      expect(body.tenant).toBe('acme')
      expect(body.routeInfo.tenant.source).toBe('path')
      expect(body.routeInfo.route.kind).toBe('collection')
    })

    it('extracts tenant from x-tenant header', async () => {
      const app = createApp()
      const res = await app.request('/contacts', {
        headers: { 'x-tenant': 'beta-org' },
      })
      const body = await res.json() as { routeInfo: RouteInfo; tenant: string }

      expect(body.tenant).toBe('beta-org')
      expect(body.routeInfo.tenant.source).toBe('header')
    })

    it('extracts tenant from subdomain', async () => {
      const app = createApp()
      const res = await app.request('https://mycompany.headless.ly/contacts')
      const body = await res.json() as { routeInfo: RouteInfo; tenant: string }

      expect(body.tenant).toBe('mycompany')
      expect(body.routeInfo.tenant.source).toBe('subdomain')
    })

    it('falls back to default tenant', async () => {
      const app = createApp()
      const res = await app.request('http://localhost/contacts')
      const body = await res.json() as { routeInfo: RouteInfo; tenant: string }

      expect(body.tenant).toBe('default')
      expect(body.routeInfo.tenant.source).toBe('default')
    })

    it('path tenant takes priority over header', async () => {
      const app = createApp()
      const res = await app.request('/~path-org/contacts', {
        headers: { 'x-tenant': 'header-org' },
      })
      const body = await res.json() as { routeInfo: RouteInfo; tenant: string }

      expect(body.tenant).toBe('path-org')
      expect(body.routeInfo.tenant.source).toBe('path')
    })

    it('header takes priority over subdomain', async () => {
      const app = createApp()
      const res = await app.request('https://subdomain-org.headless.ly/contacts', {
        headers: { 'x-tenant': 'header-org' },
      })
      const body = await res.json() as { routeInfo: RouteInfo; tenant: string }

      expect(body.tenant).toBe('header-org')
      expect(body.routeInfo.tenant.source).toBe('header')
    })
  })

  describe('route parsing with tenant', () => {
    it('parses collection after tenant prefix', async () => {
      const app = createApp()
      const res = await app.request('/~acme/contacts')
      const body = await res.json() as { routeInfo: RouteInfo }

      expect(body.routeInfo.route.kind).toBe('collection')
      if (body.routeInfo.route.kind === 'collection') {
        expect(body.routeInfo.route.collection).toBe('contacts')
      }
    })

    it('parses entity ID after tenant prefix', async () => {
      const app = createApp()
      const res = await app.request('/~acme/contact_abc')
      const body = await res.json() as { routeInfo: RouteInfo }

      expect(body.routeInfo.route.kind).toBe('entity')
      if (body.routeInfo.route.kind === 'entity') {
        expect(body.routeInfo.route.entity.id).toBe('contact_abc')
      }
    })

    it('parses entity action after tenant prefix', async () => {
      const app = createApp()
      const res = await app.request('/~acme/contact_abc/qualify')
      const body = await res.json() as { routeInfo: RouteInfo }

      expect(body.routeInfo.route.kind).toBe('entity-action')
      if (body.routeInfo.route.kind === 'entity-action') {
        expect(body.routeInfo.route.entity.id).toBe('contact_abc')
        expect(body.routeInfo.route.action).toBe('qualify')
      }
    })

    it('parses meta-resource after tenant prefix', async () => {
      const app = createApp()
      const res = await app.request('/~acme/contacts/$schema')
      const body = await res.json() as { routeInfo: RouteInfo }

      expect(body.routeInfo.route.kind).toBe('meta')
      if (body.routeInfo.route.kind === 'meta') {
        expect(body.routeInfo.route.resource).toBe('schema')
        expect(body.routeInfo.route.collection).toBe('contacts')
      }
    })

    it('parses function call (no tenant prefix needed)', async () => {
      const app = createApp()
      const res = await app.request('/score(contact_abc)')
      const body = await res.json() as { routeInfo: RouteInfo }

      expect(body.routeInfo.route.kind).toBe('function')
    })

    it('parses search route after tenant prefix', async () => {
      const app = createApp()
      const res = await app.request('/~acme/search')
      const body = await res.json() as { routeInfo: RouteInfo }

      expect(body.routeInfo.route.kind).toBe('search')
    })

    it('sets remaining path after tenant extraction', async () => {
      const app = createApp()
      const res = await app.request('/~acme/contacts')
      const body = await res.json() as { routeInfo: RouteInfo }

      expect(body.routeInfo.path).toBe('/contacts')
    })

    it('passes original path when no tenant prefix', async () => {
      const app = createApp()
      const res = await app.request('/contacts')
      const body = await res.json() as { routeInfo: RouteInfo }

      expect(body.routeInfo.path).toBe('/contacts')
    })
  })

  describe('with configured collections', () => {
    it('recognizes configured collection names', async () => {
      const app = createApp({ collections: ['contacts', 'deals', 'leads'] })
      const res = await app.request('/deals')
      const body = await res.json() as { routeInfo: RouteInfo }

      expect(body.routeInfo.route.kind).toBe('collection')
    })
  })
})
