/**
 * Cross-Type Search Convention Tests
 *
 * Tests for the cross-type search endpoint: GET /~tenant/search?q=term
 * The router detects kind: 'search' and this convention executes the search
 * across multiple entity types, grouping results by type.
 *
 * Two output modes:
 * - Default (map): semantic payload keys per type (contacts, deals, etc.)
 * - Array (?array): generic `results` key with `type` field on each item
 *
 * Also tests faceted search at /collection/$facets with clickable value links + counts.
 */

import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { searchConvention } from '../../src/conventions/search'
import type { SearchConfig, SearchResult, FacetProvider } from '../../src/conventions/search'
import type { ApiEnv } from '../../src/types'
import { routerMiddleware } from '../../src/router'
import { responseMiddleware } from '../../src/response'

// =============================================================================
// Helper: create a test app wired with router + response + search convention
// =============================================================================

function createTestApp(config: SearchConfig) {
  const app = new Hono<ApiEnv>()

  // Wire up response middleware (sets c.var.respond)
  app.use('*', responseMiddleware({ name: 'crm.do', description: 'CRM API' }))

  // Wire up router middleware (sets c.var.routeInfo)
  app.use('*', routerMiddleware())

  // Mount search convention
  app.route('/', searchConvention(config))

  return app
}

// =============================================================================
// Mock data
// =============================================================================

const mockContacts = [
  { id: 'contact_abc', name: 'Alice Johnson', email: 'alice@acme.com', type: 'contact' },
  { id: 'contact_def', name: 'Alice Smith', email: 'alice@other.com', type: 'contact' },
]

const mockDeals = [
  { id: 'deal_xyz', name: 'Alice Corp Deal', value: 50000, type: 'deal' },
]

const mockActivities = [
  { id: 'activity_uvw', name: 'Call with Alice', type: 'activity', date: '2024-01-15' },
]

// =============================================================================
// Mock search provider
// =============================================================================

function createMockSearchProvider(results: Record<string, SearchResult[]> = {}) {
  return vi.fn().mockImplementation(async (query: string, _options?: unknown) => {
    // Simple mock: filter by query presence in name
    const filtered: Record<string, SearchResult[]> = {}
    for (const [type, items] of Object.entries(results)) {
      const matched = items.filter((item) => item.name?.toLowerCase().includes(query.toLowerCase()))
      if (matched.length > 0) {
        filtered[type] = matched
      }
    }
    return filtered
  })
}

// =============================================================================
// 1. Search convention — default map mode
// =============================================================================

describe('searchConvention — map mode (default)', () => {
  it('returns results grouped by entity type as semantic keys', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
      deals: mockDeals,
      activities: mockActivities,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=alice')
    expect(res.status).toBe(200)

    const body = await res.json()
    // Each type is a separate key
    expect(body.contacts).toBeDefined()
    expect(body.deals).toBeDefined()
    expect(body.activities).toBeDefined()

    // Contacts should be map format: name -> URL
    expect(Object.keys(body.contacts)).toHaveLength(2)
    expect(body.contacts['Alice Johnson']).toContain('contact_abc')
    expect(body.contacts['Alice Smith']).toContain('contact_def')

    // Deals
    expect(Object.keys(body.deals)).toHaveLength(1)
    expect(body.deals['Alice Corp Deal']).toContain('deal_xyz')

    // Activities
    expect(Object.keys(body.activities)).toHaveLength(1)
    expect(body.activities['Call with Alice']).toContain('activity_uvw')
  })

  it('passes query string to search provider', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
    })

    const app = createTestApp({ searchProvider })

    await app.request('/search?q=alice')

    expect(searchProvider).toHaveBeenCalledWith('alice', expect.anything())
  })

  it('returns empty object when no results match', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=nonexistent')
    expect(res.status).toBe(200)

    const body = await res.json()
    // No type keys when nothing matches
    expect(body.contacts).toBeUndefined()
    expect(body.deals).toBeUndefined()
  })

  it('returns 400 when q parameter is missing', async () => {
    const searchProvider = createMockSearchProvider({})

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search')
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.message).toMatch(/query/i)
  })

  it('includes standard envelope fields', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=alice')
    const body = await res.json()

    expect(body.api).toBeDefined()
    expect(body.api.name).toBe('crm.do')
    expect(body.links).toBeDefined()
    expect(body.links.self).toContain('search?q=alice')
  })

  it('includes narrowing option links per type', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
      deals: mockDeals,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=alice')
    const body = await res.json()

    // Options should offer narrowing links
    expect(body.options).toBeDefined()
    expect(body.options['Only contacts']).toContain('search?q=alice')
    expect(body.options['Only contacts']).toContain('type=contacts')
    expect(body.options['Only deals']).toContain('search?q=alice')
    expect(body.options['Only deals']).toContain('type=deals')
  })

  it('includes array mode toggle in options', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=alice')
    const body = await res.json()

    expect(body.options).toBeDefined()
    expect(body.options.array).toContain('search?q=alice')
    expect(body.options.array).toContain('array')
  })

  it('includes total count across all types', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
      deals: mockDeals,
      activities: mockActivities,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=alice')
    const body = await res.json()

    // Total = 2 contacts + 1 deal + 1 activity = 4
    expect(body.total).toBe(4)
  })
})

// =============================================================================
// 2. Search convention — array mode (?array)
// =============================================================================

describe('searchConvention — array mode (?array)', () => {
  it('returns flat results array with type field on each item', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
      deals: mockDeals,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=alice&array')
    expect(res.status).toBe(200)

    const body = await res.json()
    // Array mode uses generic 'results' key
    expect(body.results).toBeDefined()
    expect(Array.isArray(body.results)).toBe(true)
    expect(body.results).toHaveLength(3)

    // Each result has $id, id, name, type
    const first = body.results[0]
    expect(first).toHaveProperty('$id')
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('type')
  })

  it('includes type field on each result', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: [mockContacts[0]],
      deals: mockDeals,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=alice&array')
    const body = await res.json()

    const types = body.results.map((r: { type: string }) => r.type)
    expect(types).toContain('contacts')
    expect(types).toContain('deals')
  })

  it('shows map toggle in options when in array mode', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=alice&array')
    const body = await res.json()

    expect(body.options).toBeDefined()
    expect(body.options.map).toBeDefined()
    expect(body.options.map).not.toContain('array')
  })

  it('includes total count in array mode', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
      deals: mockDeals,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=alice&array')
    const body = await res.json()

    expect(body.total).toBe(3)
  })
})

// =============================================================================
// 3. Search with type narrowing
// =============================================================================

describe('searchConvention — type narrowing', () => {
  it('passes type filter to search provider', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
    })

    const app = createTestApp({ searchProvider })

    await app.request('/search?q=alice&type=contacts')

    expect(searchProvider).toHaveBeenCalledWith(
      'alice',
      expect.objectContaining({ types: ['contacts'] }),
    )
  })

  it('supports multiple types via comma-separated value', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
      deals: mockDeals,
    })

    const app = createTestApp({ searchProvider })

    await app.request('/search?q=alice&type=contacts,deals')

    expect(searchProvider).toHaveBeenCalledWith(
      'alice',
      expect.objectContaining({ types: ['contacts', 'deals'] }),
    )
  })
})

// =============================================================================
// 4. Tenant-scoped search
// =============================================================================

describe('searchConvention — tenant scoping', () => {
  it('generates URLs with tenant prefix', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
    })

    const app = createTestApp({ searchProvider })

    const res = await app.request('/~acme/search?q=alice')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.contacts).toBeDefined()
    // URLs should include tenant prefix
    expect(body.contacts['Alice Johnson']).toContain('/~acme/')
  })
})

// =============================================================================
// 5. Faceted search
// =============================================================================

describe('searchConvention — faceted search', () => {
  it('returns facets with counts and clickable URLs at /collection/$facets', async () => {
    const facetProvider: FacetProvider = vi.fn().mockResolvedValue({
      status: { Active: 523, Inactive: 47, Pending: 31 },
      stage: { Prospect: 200, Qualified: 180, Closed: 143 },
    })

    const searchProvider = createMockSearchProvider({})
    const app = createTestApp({ searchProvider, facetProviders: { contacts: facetProvider } })

    const res = await app.request('/contacts/$facets')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.facets).toBeDefined()

    // Each facet value should have count and url
    expect(body.facets.status).toBeDefined()
    expect(body.facets.status.Active).toBeDefined()
    expect(body.facets.status.Active.count).toBe(523)
    expect(body.facets.status.Active.url).toContain('contacts')
    expect(body.facets.status.Active.url).toContain('status=Active')

    expect(body.facets.stage.Qualified.count).toBe(180)
    expect(body.facets.stage.Qualified.url).toContain('stage=Qualified')
  })

  it('returns 404 when no facet provider for collection', async () => {
    const searchProvider = createMockSearchProvider({})
    const app = createTestApp({ searchProvider })

    const res = await app.request('/deals/$facets')
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.message).toMatch(/facets/i)
  })

  it('includes standard envelope on facets response', async () => {
    const facetProvider: FacetProvider = vi.fn().mockResolvedValue({
      status: { Active: 10 },
    })

    const searchProvider = createMockSearchProvider({})
    const app = createTestApp({ searchProvider, facetProviders: { contacts: facetProvider } })

    const res = await app.request('/contacts/$facets')
    const body = await res.json()

    expect(body.api).toBeDefined()
    expect(body.links).toBeDefined()
    expect(body.links.self).toContain('contacts/$facets')
  })

  it('scopes facet URLs to tenant', async () => {
    const facetProvider: FacetProvider = vi.fn().mockResolvedValue({
      status: { Active: 100 },
    })

    const searchProvider = createMockSearchProvider({})
    const app = createTestApp({ searchProvider, facetProviders: { contacts: facetProvider } })

    const res = await app.request('/~acme/contacts/$facets')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.facets.status.Active.url).toContain('/~acme/')
  })
})

// =============================================================================
// 6. Search provider error handling
// =============================================================================

describe('searchConvention — error handling', () => {
  it('returns 500 when search provider throws', async () => {
    const searchProvider = vi.fn().mockRejectedValue(new Error('Search backend unavailable'))

    const app = createTestApp({ searchProvider })

    const res = await app.request('/search?q=alice')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.message).toBe('Search backend unavailable')
    expect(body.error.code).toBe('SEARCH_ERROR')
  })

  it('ignores non-search routes (passes through)', async () => {
    const searchProvider = createMockSearchProvider({})

    const app = new Hono<ApiEnv>()
    app.use('*', responseMiddleware({ name: 'test' }))
    app.use('*', routerMiddleware())
    app.route('/', searchConvention({ searchProvider }))

    // A collection route should pass through (not match search convention)
    app.get('/contacts', (c) => c.json({ passthrough: true }))

    const res = await app.request('/contacts')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.passthrough).toBe(true)
  })
})

// =============================================================================
// 7. Search with limit parameter
// =============================================================================

describe('searchConvention — pagination options', () => {
  it('passes limit to search provider', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
    })

    const app = createTestApp({ searchProvider })

    await app.request('/search?q=alice&limit=5')

    expect(searchProvider).toHaveBeenCalledWith(
      'alice',
      expect.objectContaining({ limit: 5 }),
    )
  })

  it('passes offset to search provider', async () => {
    const searchProvider = createMockSearchProvider({
      contacts: mockContacts,
    })

    const app = createTestApp({ searchProvider })

    await app.request('/search?q=alice&offset=10')

    expect(searchProvider).toHaveBeenCalledWith(
      'alice',
      expect.objectContaining({ offset: 10 }),
    )
  })
})
