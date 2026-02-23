import { describe, it, expect, beforeAll } from 'vitest'
import { API } from '../../src/index'
import { parseFilters, canonicalizeFilter, parseSort, canonicalizeSort } from '../../src/helpers/filters'
import { parseRoute } from '../../src/router'
import { toMapFormat, toArrayFormat, formatCollection, isArrayMode } from '../../src/helpers/format'
import { buildOptions } from '../../src/helpers/options'
import { parseEntityId, isEntityId } from '../../src/helpers/id-parser'
import { parseFunctionCall, isFunctionCall } from '../../src/helpers/function-parser'
import type { Hono } from 'hono'
import type { ApiEnv } from '../../src/types'

/**
 * Comprehensive E2E-style tests for @dotdo/api framework features.
 *
 * These tests create real Hono apps via the API() factory and exercise
 * the full request/response lifecycle through app.request() — validating
 * response envelopes, URL routing, filter parsing, format toggling,
 * function-call URLs, error handling, and CORS headers.
 *
 * Run:
 *   pnpm test -- tests/e2e/api-framework.e2e.test.ts
 *   pnpm test:e2e
 */

// =============================================================================
// Shared test app — exercises all major conventions
// =============================================================================

let app: Hono<ApiEnv>

beforeAll(() => {
  app = API({
    name: 'test.do',
    description: 'Comprehensive E2E test API',
    version: '1.0.0',
    auth: { mode: 'none' },

    routes: (a) => {
      // Health check
      a.get('/health', (c) => c.var.respond({ data: { status: 'ok' } }))

      // Echo endpoint — returns request details
      a.get('/echo', (c) => {
        const url = new URL(c.req.url)
        return c.var.respond({
          data: {
            method: c.req.method,
            path: url.pathname,
            query: Object.fromEntries(url.searchParams),
            headers: Object.fromEntries(c.req.raw.headers),
          },
        })
      })

      // POST echo
      a.post('/echo', async (c) => {
        const body = await c.req.json()
        return c.var.respond({ data: { received: body }, status: 201 })
      })

      // Error endpoint
      a.get('/error', (c) => {
        return c.var.respond({
          error: { message: 'Intentional test error', code: 'TEST_ERROR', status: 500 },
          status: 500,
        })
      })

      // Custom key endpoint
      a.get('/widgets', (c) => {
        return c.var.respond({
          data: [{ id: 'widget_abc', name: 'Widget A' }, { id: 'widget_def', name: 'Widget B' }],
          key: 'widgets',
          total: 2,
          limit: 25,
          page: 1,
        })
      })

      // Links endpoint
      a.get('/with-links', (c) => {
        return c.var.respond({
          data: { id: 'item_abc' },
          links: {
            docs: 'https://test.do/docs',
            collection: 'https://test.do/items',
          },
        })
      })

      // Actions endpoint
      a.get('/with-actions', (c) => {
        return c.var.respond({
          data: { id: 'item_abc' },
          actions: {
            edit: 'https://test.do/items/item_abc/edit',
            delete: 'https://test.do/items/item_abc',
          },
        })
      })

      // Legacy actions (method + href)
      a.get('/with-legacy-actions', (c) => {
        return c.var.respond({
          data: { id: 'item_abc' },
          actions: {
            create: { method: 'POST', href: '/items' },
            update: { method: 'PUT', href: 'https://external.com/items/1' },
          },
        })
      })

      // Options endpoint
      a.get('/with-options', (c) => {
        return c.var.respond({
          data: [],
          options: {
            array: 'https://test.do/contacts?array',
            schema: 'https://test.do/contacts/$schema',
          },
        })
      })

      // User context
      a.get('/with-user', (c) => {
        return c.var.respond({
          data: { greeting: 'hello' },
          user: { authenticated: true, level: 'L2', name: 'Alice', tenant: 'acme' },
        })
      })

      // Legacy user info
      a.get('/with-legacy-user', (c) => {
        return c.var.respond({
          data: { greeting: 'hello' },
          user: { id: 'u1', email: 'alice@example.com', name: 'Alice' },
        })
      })

      // MDXLD identifiers
      a.get('/with-mdxld', (c) => {
        return c.var.respond({
          data: { name: 'Alice' },
          key: 'contact',
          $context: 'https://headless.ly/~acme',
          $type: 'https://headless.ly/~acme/contacts',
          $id: 'https://headless.ly/~acme/contacts/contact_abc',
        })
      })

      // Pagination
      a.get('/paginated', (c) => {
        return c.var.respond({
          data: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })),
          total: 100,
          limit: 10,
          page: 1,
          links: {
            next: 'https://test.do/paginated?page=2&limit=10',
            last: 'https://test.do/paginated?page=10&limit=10',
          },
        })
      })

      // Meta-compatible backward compat
      a.get('/with-meta', (c) => {
        return c.var.respond({
          data: [],
          meta: { total: 200, limit: 50, offset: 0 },
        })
      })

      // Throw an error (for global error handler)
      a.get('/throw', () => {
        throw new Error('Unexpected failure')
      })

      // Empty data
      a.get('/empty', (c) => {
        return c.var.respond({ data: null })
      })

      // 204-style no-content
      a.delete('/items/:id', (c) => {
        return c.var.respond({ data: { deleted: true }, status: 200 })
      })
    },
  })
})

// =============================================================================
// 1. Response Envelope Shape
// =============================================================================

describe('Response Envelope Shape', () => {
  it('returns the standard envelope with api, links, and data blocks', async () => {
    const res = await app.request('http://test.do/')
    expect(res.status).toBe(200)

    const body = await res.json()

    // api block
    expect(body.api).toBeDefined()
    expect(body.api.name).toBe('test.do')
    expect(body.api.description).toBe('Comprehensive E2E test API')
    expect(body.api.version).toBe('1.0.0')
    expect(body.api.url).toBe('http://test.do')

    // links block
    expect(body.links).toBeDefined()
    expect(body.links.self).toBe('http://test.do/')
    expect(body.links.home).toBe('http://test.do')

    // data block — root returns API info
    expect(body.data).toBeDefined()
    expect(body.data.name).toBe('test.do')

    // success field should never exist in the new envelope
    expect(body.success).toBeUndefined()
  })

  it('returns Content-Type application/json', async () => {
    const res = await app.request('/')
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('supports custom semantic key instead of data', async () => {
    const res = await app.request('/widgets')
    const body = await res.json()

    expect(body.widgets).toBeDefined()
    expect(Array.isArray(body.widgets)).toBe(true)
    expect(body.widgets).toHaveLength(2)
    expect(body.data).toBeUndefined()
  })

  it('includes pagination fields at top level', async () => {
    const res = await app.request('/widgets')
    const body = await res.json()

    expect(body.total).toBe(2)
    expect(body.limit).toBe(25)
    expect(body.page).toBe(1)
  })

  it('includes HATEOAS links in response', async () => {
    const res = await app.request('http://test.do/with-links')
    const body = await res.json()

    expect(body.links.self).toBe('http://test.do/with-links')
    expect(body.links.home).toBe('http://test.do')
    expect(body.links.docs).toBe('https://test.do/docs')
    expect(body.links.collection).toBe('https://test.do/items')
  })

  it('includes actions block with URL strings', async () => {
    const res = await app.request('/with-actions')
    const body = await res.json()

    expect(body.actions).toBeDefined()
    expect(body.actions.edit).toBe('https://test.do/items/item_abc/edit')
    expect(body.actions.delete).toBe('https://test.do/items/item_abc')
  })

  it('normalizes legacy actions (method + href) to URL strings', async () => {
    const res = await app.request('http://test.do/with-legacy-actions')
    const body = await res.json()

    // Relative href should resolve against base
    expect(typeof body.actions.create).toBe('string')
    expect(body.actions.create).toContain('/items')

    // Absolute href should pass through
    expect(body.actions.update).toBe('https://external.com/items/1')
  })

  it('includes options block', async () => {
    const res = await app.request('/with-options')
    const body = await res.json()

    expect(body.options).toBeDefined()
    expect(body.options.array).toBe('https://test.do/contacts?array')
    expect(body.options.schema).toBe('https://test.do/contacts/$schema')
  })

  it('includes user block with UserContext', async () => {
    const res = await app.request('/with-user')
    const body = await res.json()

    expect(body.user).toBeDefined()
    expect(body.user.authenticated).toBe(true)
    expect(body.user.level).toBe('L2')
    expect(body.user.name).toBe('Alice')
    expect(body.user.tenant).toBe('acme')
  })

  it('normalizes legacy UserInfo to UserContext', async () => {
    const res = await app.request('/with-legacy-user')
    const body = await res.json()

    expect(body.user).toBeDefined()
    expect(body.user.authenticated).toBe(true)
    expect(body.user.id).toBe('u1')
    expect(body.user.email).toBe('alice@example.com')
  })

  it('includes MDXLD identifiers ($context, $type, $id)', async () => {
    const res = await app.request('/with-mdxld')
    const body = await res.json()

    expect(body.$context).toBe('https://headless.ly/~acme')
    expect(body.$type).toBe('https://headless.ly/~acme/contacts')
    expect(body.$id).toBe('https://headless.ly/~acme/contacts/contact_abc')
    expect(body.contact).toEqual({ name: 'Alice' })
  })

  it('omits MDXLD fields when not provided', async () => {
    const res = await app.request('/health')
    const body = await res.json()

    expect(body.$context).toBeUndefined()
    expect(body.$type).toBeUndefined()
    expect(body.$id).toBeUndefined()
  })

  it('promotes total/limit from meta to top-level (backward compat)', async () => {
    const res = await app.request('/with-meta')
    const body = await res.json()

    expect(body.total).toBe(200)
    expect(body.limit).toBe(50)
  })

  it('includes pagination links (next, last)', async () => {
    const res = await app.request('http://test.do/paginated')
    const body = await res.json()

    expect(body.total).toBe(100)
    expect(body.limit).toBe(10)
    expect(body.page).toBe(1)
    expect(body.links.next).toBe('https://test.do/paginated?page=2&limit=10')
    expect(body.links.last).toBe('https://test.do/paginated?page=10&limit=10')
  })

  it('preserves reading order: api first, user last', async () => {
    const res = await app.request('/with-user')
    const body = await res.json()
    const keys = Object.keys(body)

    expect(keys[0]).toBe('api')
    expect(keys[keys.length - 1]).toBe('user')
  })

  it('handles null data', async () => {
    const res = await app.request('/empty')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data).toBeNull()
  })

  it('sets custom HTTP status code', async () => {
    const res = await app.request('/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    })
    expect(res.status).toBe(201)
  })
})

// =============================================================================
// 2. URL Routing (parseRoute)
// =============================================================================

describe('URL Routing', () => {
  describe('collection routes', () => {
    it('detects plural collection names', () => {
      const route = parseRoute('/contacts')
      expect(route.kind).toBe('collection')
      if (route.kind === 'collection') {
        expect(route.collection).toBe('contacts')
      }
    })

    it('detects single-segment collection paths', () => {
      const route = parseRoute('/deals')
      expect(route.kind).toBe('collection')
      if (route.kind === 'collection') {
        expect(route.collection).toBe('deals')
      }
    })

    it('detects known collections', () => {
      const route = parseRoute('/items', { collections: ['items'] })
      expect(route.kind).toBe('collection')
    })
  })

  describe('entity routes', () => {
    it('detects entity IDs (type_sqid pattern)', () => {
      const route = parseRoute('/contact_abc')
      expect(route.kind).toBe('entity')
      if (route.kind === 'entity') {
        expect(route.entity.type).toBe('contact')
        expect(route.entity.sqid).toBe('abc')
        expect(route.entity.id).toBe('contact_abc')
        expect(route.entity.collection).toBe('contacts')
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

  describe('entity-action routes', () => {
    it('detects entity + action', () => {
      const route = parseRoute('/contact_abc/qualify')
      expect(route.kind).toBe('entity-action')
      if (route.kind === 'entity-action') {
        expect(route.entity.id).toBe('contact_abc')
        expect(route.action).toBe('qualify')
      }
    })
  })

  describe('collection-action routes', () => {
    it('detects collection + action', () => {
      const route = parseRoute('/contacts/create')
      expect(route.kind).toBe('collection-action')
      if (route.kind === 'collection-action') {
        expect(route.collection).toBe('contacts')
        expect(route.action).toBe('create')
      }
    })

    it('detects collection + import action', () => {
      const route = parseRoute('/contacts/import')
      expect(route.kind).toBe('collection-action')
      if (route.kind === 'collection-action') {
        expect(route.collection).toBe('contacts')
        expect(route.action).toBe('import')
      }
    })
  })

  describe('meta-resource routes', () => {
    it('detects collection meta-resources', () => {
      const route = parseRoute('/contacts/$schema')
      expect(route.kind).toBe('meta')
      if (route.kind === 'meta') {
        expect(route.resource).toBe('schema')
        expect(route.collection).toBe('contacts')
      }
    })

    it('detects entity meta-resources', () => {
      const route = parseRoute('/contact_abc/$history')
      expect(route.kind).toBe('meta')
      if (route.kind === 'meta') {
        expect(route.resource).toBe('history')
        expect(route.entity?.id).toBe('contact_abc')
      }
    })

    it('detects collection $pageSize', () => {
      const route = parseRoute('/contacts/$pageSize')
      expect(route.kind).toBe('meta')
      if (route.kind === 'meta') {
        expect(route.resource).toBe('pageSize')
        expect(route.collection).toBe('contacts')
      }
    })

    it('detects collection $facets', () => {
      const route = parseRoute('/contacts/$facets')
      expect(route.kind).toBe('meta')
      if (route.kind === 'meta') {
        expect(route.resource).toBe('facets')
        expect(route.collection).toBe('contacts')
      }
    })

    it('detects root-level $schema', () => {
      const route = parseRoute('/$schema')
      expect(route.kind).toBe('meta')
      if (route.kind === 'meta') {
        expect(route.resource).toBe('schema')
        expect(route.entity).toBeUndefined()
        expect(route.collection).toBeUndefined()
      }
    })
  })

  describe('function-call routes', () => {
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

    it('detects multi-arg function call', () => {
      const route = parseRoute('/merge(contact_abc,contact_def)')
      expect(route.kind).toBe('function')
      if (route.kind === 'function') {
        expect(route.fn.name).toBe('merge')
        expect(route.fn.args).toHaveLength(2)
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

    it('detects function call with named arguments', () => {
      const route = parseRoute('/score(contact_abc,threshold=80)')
      expect(route.kind).toBe('function')
      if (route.kind === 'function') {
        expect(route.fn.name).toBe('score')
        expect(route.fn.args).toHaveLength(1)
        expect(route.fn.kwargs.threshold).toBe('80')
      }
    })
  })

  describe('search route', () => {
    it('detects search path', () => {
      const route = parseRoute('/search')
      expect(route.kind).toBe('search')
    })
  })

  describe('unknown routes', () => {
    it('returns unknown for empty path', () => {
      const route = parseRoute('/')
      expect(route.kind).toBe('unknown')
    })
  })
})

// =============================================================================
// 3. Map/Array Toggle (format helpers)
// =============================================================================

describe('Map/Array Format Toggle', () => {
  const items = [
    { id: 'contact_abc', name: 'Alice Johnson' },
    { id: 'contact_def', name: 'Bob Smith' },
  ]
  const opts = { baseUrl: 'https://crm.do', tenant: 'acme', collection: 'contacts' }

  describe('toMapFormat', () => {
    it('returns displayName -> URL map', () => {
      const result = toMapFormat(items, opts)

      expect(result['Alice Johnson']).toBe('https://crm.do/~acme/contact_abc')
      expect(result['Bob Smith']).toBe('https://crm.do/~acme/contact_def')
    })

    it('uses id when no name/title is present', () => {
      const noNameItems = [{ id: 'contact_xyz', status: 'active' }]
      const result = toMapFormat(noNameItems, opts)
      expect(result['contact_xyz']).toBe('https://crm.do/~acme/contact_xyz')
    })

    it('works without tenant', () => {
      const result = toMapFormat(items, { baseUrl: 'https://crm.do', collection: 'contacts' })
      expect(result['Alice Johnson']).toBe('https://crm.do/contact_abc')
    })
  })

  describe('toArrayFormat', () => {
    it('returns structured array with $id, id, name', () => {
      const result = toArrayFormat(items, opts)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        $id: 'https://crm.do/~acme/contact_abc',
        id: 'contact_abc',
        name: 'Alice Johnson',
      })
    })
  })

  describe('formatCollection', () => {
    it('returns map by default', () => {
      const result = formatCollection(items, { ...opts, array: false })
      expect(typeof result).toBe('object')
      expect(Array.isArray(result)).toBe(false)
    })

    it('returns array when array=true', () => {
      const result = formatCollection(items, { ...opts, array: true })
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('isArrayMode', () => {
    it('returns true when ?array is present', () => {
      expect(isArrayMode(new URL('https://crm.do/contacts?array'))).toBe(true)
      expect(isArrayMode(new URL('https://crm.do/contacts?array='))).toBe(true)
      expect(isArrayMode(new URL('https://crm.do/contacts?array=true'))).toBe(true)
    })

    it('returns false when ?array is absent', () => {
      expect(isArrayMode(new URL('https://crm.do/contacts'))).toBe(false)
      expect(isArrayMode(new URL('https://crm.do/contacts?limit=10'))).toBe(false)
    })
  })
})

// =============================================================================
// 4. Filter Parsing (dual syntax)
// =============================================================================

describe('Filter Parsing', () => {
  describe('dot-suffix syntax', () => {
    it('parses status.eq=Active', () => {
      const params = new URLSearchParams('status.eq=Active')
      const { filter } = parseFilters(params)
      expect(filter.status).toEqual({ $eq: 'Active' })
    })

    it('parses amount.gt=10000', () => {
      const params = new URLSearchParams('amount.gt=10000')
      const { filter } = parseFilters(params)
      expect(filter.amount).toEqual({ $gt: 10000 })
    })

    it('parses amount.gte=10000', () => {
      const params = new URLSearchParams('amount.gte=10000')
      const { filter } = parseFilters(params)
      expect(filter.amount).toEqual({ $gte: 10000 })
    })

    it('parses amount.lt=50000', () => {
      const params = new URLSearchParams('amount.lt=50000')
      const { filter } = parseFilters(params)
      expect(filter.amount).toEqual({ $lt: 50000 })
    })

    it('parses amount.lte=50000', () => {
      const params = new URLSearchParams('amount.lte=50000')
      const { filter } = parseFilters(params)
      expect(filter.amount).toEqual({ $lte: 50000 })
    })

    it('parses status.not=Churned', () => {
      const params = new URLSearchParams('status.not=Churned')
      const { filter } = parseFilters(params)
      expect(filter.status).toEqual({ $ne: 'Churned' })
    })

    it('parses status.ne=Churned', () => {
      const params = new URLSearchParams('status.ne=Churned')
      const { filter } = parseFilters(params)
      expect(filter.status).toEqual({ $ne: 'Churned' })
    })

    it('parses status.in=Active,Qualified', () => {
      const params = new URLSearchParams('status.in=Active,Qualified')
      const { filter } = parseFilters(params)
      expect(filter.status).toEqual({ $in: ['Active', 'Qualified'] })
    })

    it('parses status.nin=Churned,Lost', () => {
      const params = new URLSearchParams('status.nin=Churned,Lost')
      const { filter } = parseFilters(params)
      expect(filter.status).toEqual({ $nin: ['Churned', 'Lost'] })
    })

    it('parses name.contains=alice', () => {
      const params = new URLSearchParams('name.contains=alice')
      const { filter } = parseFilters(params)
      expect(filter.name).toEqual({ $regex: 'alice' })
    })

    it('parses name.starts=Al', () => {
      const params = new URLSearchParams('name.starts=Al')
      const { filter } = parseFilters(params)
      expect(filter.name).toEqual({ $regex: '^Al' })
    })

    it('parses name.ends=son', () => {
      const params = new URLSearchParams('name.ends=son')
      const { filter } = parseFilters(params)
      expect(filter.name).toEqual({ $regex: 'son$' })
    })

    it('parses email.exists=true', () => {
      const params = new URLSearchParams('email.exists=true')
      const { filter } = parseFilters(params)
      expect(filter.email).toEqual({ $exists: true })
    })

    it('parses email.exists=false', () => {
      const params = new URLSearchParams('email.exists=false')
      const { filter } = parseFilters(params)
      expect(filter.email).toEqual({ $exists: false })
    })

    it('parses amount.between=1000,5000', () => {
      const params = new URLSearchParams('amount.between=1000,5000')
      const { filter } = parseFilters(params)
      expect(filter.amount).toEqual({ $gte: 1000, $lte: 5000 })
    })

    it('parses name.regex=^Al.*son$', () => {
      const params = new URLSearchParams('name.regex=^Al.*son$')
      const { filter } = parseFilters(params)
      expect(filter.name).toEqual({ $regex: '^Al.*son$' })
    })
  })

  describe('symbolic syntax', () => {
    it('parses status=Active (plain equality)', () => {
      const params = new URLSearchParams('status=Active')
      const { filter } = parseFilters(params)
      expect(filter.status).toEqual({ $eq: 'Active' })
    })

    it('parses status=Active,Qualified (comma -> $in)', () => {
      const params = new URLSearchParams('status=Active,Qualified')
      const { filter } = parseFilters(params)
      expect(filter.status).toEqual({ $in: ['Active', 'Qualified'] })
    })

    it('coerces numeric values', () => {
      const params = new URLSearchParams('score=85')
      const { filter } = parseFilters(params)
      expect(filter.score).toEqual({ $eq: 85 })
    })

    it('coerces boolean values', () => {
      const params = new URLSearchParams('active=true')
      const { filter } = parseFilters(params)
      expect(filter.active).toEqual({ $eq: true })
    })

    it('coerces numeric arrays when all numeric', () => {
      const params = new URLSearchParams('amount.in=100,200,300')
      const { filter } = parseFilters(params)
      expect(filter.amount).toEqual({ $in: [100, 200, 300] })
    })
  })

  describe('reserved params are skipped', () => {
    it('does not treat page as a filter', () => {
      const params = new URLSearchParams('page=2&status=Active')
      const { filter } = parseFilters(params)
      expect(filter.page).toBeUndefined()
      expect(filter.status).toEqual({ $eq: 'Active' })
    })

    it('does not treat limit, sort, q, fields as filters', () => {
      const params = new URLSearchParams('limit=10&sort=-name&q=alice&fields=name,email&status=Active')
      const { filter } = parseFilters(params)
      expect(filter.limit).toBeUndefined()
      expect(filter.sort).toBeUndefined()
      expect(filter.q).toBeUndefined()
      expect(filter.fields).toBeUndefined()
      expect(filter.status).toEqual({ $eq: 'Active' })
    })
  })

  describe('sort parsing', () => {
    it('parses prefix syntax: -name', () => {
      const sort = parseSort('-name')
      expect(sort).toEqual({ name: -1 })
    })

    it('parses prefix syntax: name (ascending)', () => {
      const sort = parseSort('name')
      expect(sort).toEqual({ name: 1 })
    })

    it('parses dot-suffix: name.asc', () => {
      const sort = parseSort('name.asc')
      expect(sort).toEqual({ name: 1 })
    })

    it('parses dot-suffix: name.desc', () => {
      const sort = parseSort('name.desc')
      expect(sort).toEqual({ name: -1 })
    })

    it('parses multi-field sort', () => {
      const sort = parseSort('-createdAt,name')
      expect(sort).toEqual({ createdAt: -1, name: 1 })
    })

    it('parses multi-field dot-suffix', () => {
      const sort = parseSort('createdAt.desc,name.asc')
      expect(sort).toEqual({ createdAt: -1, name: 1 })
    })

    it('extracts sort from parseFilters', () => {
      const params = new URLSearchParams('sort=-createdAt,name&status=Active')
      const { sort, filter } = parseFilters(params)
      expect(sort).toEqual({ createdAt: -1, name: 1 })
      expect(filter.status).toEqual({ $eq: 'Active' })
    })
  })

  describe('fields extraction', () => {
    it('extracts fields from parseFilters', () => {
      const params = new URLSearchParams('fields=name,email,status')
      const result = parseFilters(params)
      expect(result.fields).toEqual(['name', 'email', 'status'])
    })

    it('extracts exclude from parseFilters', () => {
      const params = new URLSearchParams('exclude=password,secret')
      const result = parseFilters(params)
      expect(result.exclude).toEqual(['password', 'secret'])
    })
  })

  describe('canonicalization', () => {
    it('canonicalizes filter to dot-suffix URL params', () => {
      const filter = {
        status: { $eq: 'Active' },
        amount: { $gt: 10000 },
        name: { $regex: 'alice' },
      }
      const canonical = canonicalizeFilter(filter)
      expect(canonical).toContain('amount.gt=10000')
      expect(canonical).toContain('name.contains=alice')
      expect(canonical).toContain('status.eq=Active')
    })

    it('canonicalizes between pattern', () => {
      const filter = {
        amount: { $gte: 1000, $lte: 5000 },
      }
      const canonical = canonicalizeFilter(filter)
      expect(canonical).toContain('amount.between=1000%2C5000')
    })

    it('canonicalizes $in to comma-separated', () => {
      const filter = {
        status: { $in: ['Active', 'Qualified'] },
      }
      const canonical = canonicalizeFilter(filter)
      expect(canonical).toContain('status.in=Active%2CQualified')
    })

    it('canonicalizes sort', () => {
      const sort = { createdAt: -1 as const, name: 1 as const }
      const canonical = canonicalizeSort(sort)
      expect(canonical).toBe('createdAt.desc,name.asc')
    })

    it('round-trips: parse -> canonicalize -> parse', () => {
      const params = new URLSearchParams('status.eq=Active&amount.gt=10000')
      const { filter } = parseFilters(params)
      const canonical = canonicalizeFilter(filter)
      const reparsed = parseFilters(new URLSearchParams(canonical))
      expect(reparsed.filter).toEqual(filter)
    })
  })
})

// =============================================================================
// 5. Entity ID Parsing
// =============================================================================

describe('Entity ID Parsing', () => {
  it('parses standard entity ID', () => {
    const parsed = parseEntityId('contact_abc')
    expect(parsed).toBeDefined()
    expect(parsed!.type).toBe('contact')
    expect(parsed!.collection).toBe('contacts')
    expect(parsed!.id).toBe('contact_abc')
    expect(parsed!.sqid).toBe('abc')
  })

  it('parses camelCase entity type', () => {
    const parsed = parseEntityId('featureFlag_x9z')
    expect(parsed).toBeDefined()
    expect(parsed!.type).toBe('featureFlag')
    expect(parsed!.collection).toBe('featureFlags')
  })

  it('pluralizes correctly', () => {
    expect(parseEntityId('deal_abc')!.collection).toBe('deals')
    expect(parseEntityId('activity_abc')!.collection).toBe('activities')
    expect(parseEntityId('process_abc')!.collection).toBe('processes')
  })

  it('rejects non-entity patterns', () => {
    expect(isEntityId('contacts')).toBe(false)
    expect(isEntityId('$schema')).toBe(false)
    expect(isEntityId('~tenant')).toBe(false)
    expect(isEntityId('score(abc)')).toBe(false)
    expect(isEntityId('')).toBe(false)
  })

  it('validates entity ID format', () => {
    expect(isEntityId('contact_abc')).toBe(true)
    expect(isEntityId('deal_kRziM')).toBe(true)
    expect(isEntityId('featureFlag_x9z')).toBe(true)
    expect(isEntityId('Contact_abc')).toBe(false) // must start lowercase
    expect(isEntityId('contact_')).toBe(false) // empty sqid
    expect(isEntityId('_abc')).toBe(false) // empty type
  })
})

// =============================================================================
// 6. Function-Call URL Parsing
// =============================================================================

describe('Function-Call URL Parsing', () => {
  it('detects function call syntax', () => {
    expect(isFunctionCall('score(contact_abc)')).toBe(true)
    expect(isFunctionCall('contacts')).toBe(false)
    expect(isFunctionCall('score')).toBe(false)
  })

  it('parses simple function call', () => {
    const fn = parseFunctionCall('score(contact_abc)')
    expect(fn).toBeDefined()
    expect(fn!.name).toBe('score')
    expect(fn!.args).toHaveLength(1)
    expect(fn!.args[0]!.value).toBe('contact_abc')
    expect(fn!.args[0]!.type).toBe('entity')
    expect(fn!.kwargs).toEqual({})
  })

  it('parses function with multiple args', () => {
    const fn = parseFunctionCall('merge(contact_abc,contact_def)')
    expect(fn).toBeDefined()
    expect(fn!.name).toBe('merge')
    expect(fn!.args).toHaveLength(2)
    expect(fn!.args[0]!.value).toBe('contact_abc')
    expect(fn!.args[1]!.value).toBe('contact_def')
  })

  it('parses dotted function name', () => {
    const fn = parseFunctionCall('papa.parse(https://example.com/data.csv)')
    expect(fn).toBeDefined()
    expect(fn!.name).toBe('papa.parse')
    expect(fn!.args).toHaveLength(1)
    expect(fn!.args[0]!.type).toBe('url')
  })

  it('parses named arguments', () => {
    const fn = parseFunctionCall('score(contact_abc,threshold=80)')
    expect(fn).toBeDefined()
    expect(fn!.args).toHaveLength(1)
    expect(fn!.kwargs.threshold).toBe('80')
  })

  it('detects numeric args', () => {
    const fn = parseFunctionCall('calculate(42)')
    expect(fn).toBeDefined()
    expect(fn!.args[0]!.type).toBe('number')
  })

  it('detects string args', () => {
    const fn = parseFunctionCall('greet(hello)')
    expect(fn).toBeDefined()
    expect(fn!.args[0]!.type).toBe('string')
  })

  it('handles empty args', () => {
    const fn = parseFunctionCall('list()')
    expect(fn).toBeDefined()
    expect(fn!.name).toBe('list')
    expect(fn!.args).toHaveLength(0)
    expect(fn!.kwargs).toEqual({})
  })

  it('rejects invalid function names', () => {
    expect(parseFunctionCall('123bad(arg)')).toBeNull()
    expect(parseFunctionCall('(noname)')).toBeNull()
  })
})

// =============================================================================
// 7. Options Block Builder
// =============================================================================

describe('Options Block Builder', () => {
  it('builds standard options with array toggle (map mode)', () => {
    const options = buildOptions({
      baseUrl: 'https://crm.do',
      tenant: 'acme',
      collection: 'contacts',
      isArrayMode: false,
    })

    expect(options.array).toBe('https://crm.do/~acme/contacts?array')
    expect(options.schema).toBe('https://crm.do/~acme/contacts/$schema')
    expect(options.facets).toBe('https://crm.do/~acme/contacts/$facets')
    expect(options.map).toBeUndefined()
  })

  it('builds options with map toggle (array mode)', () => {
    const options = buildOptions({
      baseUrl: 'https://crm.do',
      tenant: 'acme',
      collection: 'contacts',
      isArrayMode: true,
    })

    expect(options.map).toBe('https://crm.do/~acme/contacts')
    expect(options.array).toBeUndefined()
  })

  it('works without tenant', () => {
    const options = buildOptions({
      baseUrl: 'https://crm.do',
      collection: 'contacts',
    })

    expect(options.array).toBe('https://crm.do/contacts?array')
    expect(options.schema).toBe('https://crm.do/contacts/$schema')
  })

  it('merges extra options', () => {
    const options = buildOptions(
      {
        baseUrl: 'https://crm.do',
        collection: 'contacts',
      },
      { custom: 'https://crm.do/contacts/custom' },
    )

    expect(options.custom).toBe('https://crm.do/contacts/custom')
  })
})

// =============================================================================
// 8. Error Responses
// =============================================================================

describe('Error Responses', () => {
  it('returns JSON 404 for unknown paths', async () => {
    const res = await app.request('/__nonexistent_path__')
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toBe('Not Found')
    expect(body.error.status).toBe(404)

    // Envelope structure is still present
    expect(body.api).toBeDefined()
    expect(body.api.name).toBe('test.do')
    expect(body.links).toBeDefined()

    // No data on error
    expect(body.data).toBeUndefined()

    // No success field
    expect(body.success).toBeUndefined()
  })

  it('returns custom error code and message', async () => {
    const res = await app.request('/error')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error.message).toBe('Intentional test error')
    expect(body.error.code).toBe('TEST_ERROR')
    expect(body.error.status).toBe(500)
  })

  it('catches thrown errors via global error handler', async () => {
    const res = await app.request('/throw')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.message).toBe('Unexpected failure')
    expect(body.error.code).toBe('INTERNAL_ERROR')

    // Global error handler still returns envelope
    expect(body.api).toBeDefined()
    expect(body.links).toBeDefined()
  })

  it('returns 404 for deeply nested unknown paths', async () => {
    const res = await app.request('/a/b/c/d/e')
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns JSON content-type even for errors', async () => {
    const res = await app.request('/__nope__')
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})

// =============================================================================
// 9. CORS Headers
// =============================================================================

describe('CORS Headers', () => {
  it('returns Access-Control-Allow-Origin: * on GET', async () => {
    const res = await app.request('/', {
      headers: { Origin: 'http://example.com' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('returns CORS headers on OPTIONS preflight', async () => {
    const res = await app.request('/', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'POST',
      },
    })

    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('access-control-allow-methods')).toBeDefined()

    const allowedMethods = res.headers.get('access-control-allow-methods')
    expect(allowedMethods).toContain('GET')
    expect(allowedMethods).toContain('POST')
    expect(allowedMethods).toContain('PUT')
    expect(allowedMethods).toContain('DELETE')
  })

  it('returns allowed headers on preflight', async () => {
    const res = await app.request('/', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    })

    const allowHeaders = res.headers.get('access-control-allow-headers')
    expect(allowHeaders).toContain('Content-Type')
    expect(allowHeaders).toContain('Authorization')
  })

  it('exposes X-Request-Id and X-Total-Count headers', async () => {
    const res = await app.request('/', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'GET',
      },
    })

    const exposeHeaders = res.headers.get('access-control-expose-headers')
    expect(exposeHeaders).toContain('X-Request-Id')
    expect(exposeHeaders).toContain('X-Total-Count')
  })

  it('returns max-age for preflight caching', async () => {
    const res = await app.request('/', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'GET',
      },
    })

    const maxAge = res.headers.get('access-control-max-age')
    expect(maxAge).toBeDefined()
    expect(Number(maxAge)).toBeGreaterThan(0)
  })
})

// =============================================================================
// 10. X-Request-Id
// =============================================================================

describe('X-Request-Id', () => {
  it('includes X-Request-Id header on every response', async () => {
    const res = await app.request('/')
    const requestId = res.headers.get('x-request-id')
    expect(requestId).toBeTruthy()
    expect(typeof requestId).toBe('string')
  })

  it('uses provided X-Request-Id if given', async () => {
    const customId = 'custom-request-id-12345'
    const res = await app.request('/', {
      headers: { 'X-Request-Id': customId },
    })
    expect(res.headers.get('x-request-id')).toBe(customId)
  })

  it('each request gets a unique ID if none provided', async () => {
    const res1 = await app.request('/health')
    const res2 = await app.request('/health')
    const id1 = res1.headers.get('x-request-id')
    const id2 = res2.headers.get('x-request-id')

    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
  })
})

// =============================================================================
// 11. HTTP Methods
// =============================================================================

describe('HTTP Methods', () => {
  it('handles GET requests', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('ok')
  })

  it('handles POST requests with JSON body', async () => {
    const payload = { name: 'Test Item', value: 42 }
    const res = await app.request('/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.received).toEqual(payload)
  })

  it('handles DELETE requests', async () => {
    const res = await app.request('/items/item_abc', {
      method: 'DELETE',
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.deleted).toBe(true)
  })
})

// =============================================================================
// 12. Zero-Config API
// =============================================================================

describe('Zero-Config API', () => {
  it('creates a valid API with no arguments', async () => {
    const zeroApp = API()
    const res = await zeroApp.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.api.name).toBe('api')
    expect(body.links).toBeDefined()
  })

  it('creates API with inline functions', async () => {
    const fnApp = API({
      greet: (input: unknown) => ({ message: 'Hello!' }),
    })

    const res = await fnApp.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.api.name).toBe('api')
  })

  it('creates API with mixed config and functions', async () => {
    const mixedApp = API({
      name: 'crm.do',
      description: 'AI-native CRM',
      score: (input: unknown) => ({ value: 87 }),
    })

    const res = await mixedApp.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.api.name).toBe('crm.do')
    expect(body.api.description).toBe('AI-native CRM')
  })
})

// =============================================================================
// 13. API Type Detection
// =============================================================================

describe('API Type Detection', () => {
  it('defaults to type "api" for plain config', async () => {
    const plainApp = API({ name: 'plain' })
    const res = await plainApp.request('/')
    const body = await res.json()

    // "api" is the default — omitted from response
    expect(body.api.type).toBeUndefined()
  })

  it('sets type "proxy" for proxy config', async () => {
    const proxyApp = API({ name: 'proxy-api', proxy: { upstream: 'https://example.com' } })
    const res = await proxyApp.request('/')
    const body = await res.json()
    expect(body.api.type).toBe('proxy')
  })

  it('sets type "crud" for CRUD config', async () => {
    const crudApp = API({ name: 'crud-api', crud: { db: 'DB', table: 'items' } })
    const res = await crudApp.request('/')
    const body = await res.json()
    expect(body.api.type).toBe('crud')
  })
})

// =============================================================================
// 14. Landing Page Configuration
// =============================================================================

describe('Landing Page', () => {
  it('returns API info at root by default', async () => {
    const res = await app.request('http://test.do/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.name).toBe('test.do')
    expect(body.data.description).toBe('Comprehensive E2E test API')
  })

  it('can disable landing page', async () => {
    const noLandingApp = API({
      name: 'no-landing',
      landing: false,
      routes: (a) => {
        a.get('/test', (c) => c.var.respond({ data: 'ok' }))
      },
    })

    const res = await noLandingApp.request('/')
    // With landing disabled and no route matching /, should 404
    expect(res.status).toBe(404)
  })

  it('supports custom landing handler', async () => {
    const customApp = API({
      name: 'custom-landing',
      landing: (c) => {
        return c.var.respond({
          data: { welcome: 'Custom landing page' },
        })
      },
    })

    const res = await customApp.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.welcome).toBe('Custom landing page')
  })
})

// =============================================================================
// 15. Echo Endpoint (request introspection)
// =============================================================================

describe('Echo Endpoint', () => {
  it('echoes request method', async () => {
    const res = await app.request('http://test.do/echo')
    const body = await res.json()
    expect(body.data.method).toBe('GET')
  })

  it('echoes request path', async () => {
    const res = await app.request('http://test.do/echo')
    const body = await res.json()
    expect(body.data.path).toBe('/echo')
  })

  it('echoes query parameters', async () => {
    const res = await app.request('http://test.do/echo?foo=bar&baz=42')
    const body = await res.json()
    expect(body.data.query.foo).toBe('bar')
    expect(body.data.query.baz).toBe('42')
  })
})

// =============================================================================
// 16. Multiple Apps / Isolation
// =============================================================================

describe('Multiple Apps / Isolation', () => {
  it('two API instances do not share state', async () => {
    const app1 = API({ name: 'app-one', version: '1.0.0' })
    const app2 = API({ name: 'app-two', version: '2.0.0' })

    const [res1, res2] = await Promise.all([
      app1.request('/'),
      app2.request('/'),
    ])

    const body1 = await res1.json()
    const body2 = await res2.json()

    expect(body1.api.name).toBe('app-one')
    expect(body1.api.version).toBe('1.0.0')
    expect(body2.api.name).toBe('app-two')
    expect(body2.api.version).toBe('2.0.0')
  })

  it('custom routes on one app do not leak to another', async () => {
    const app1 = API({
      name: 'app-with-route',
      routes: (a) => {
        a.get('/secret', (c) => c.var.respond({ data: 'hidden' }))
      },
    })
    const app2 = API({ name: 'app-without-route' })

    const res1 = await app1.request('/secret')
    expect(res1.status).toBe(200)

    const res2 = await app2.request('/secret')
    expect(res2.status).toBe(404)
  })
})
