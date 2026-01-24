/**
 * Functions Convention Integration Tests
 *
 * Tests to verify the behavior of:
 * 1. Service functions (actions)
 * 2. Proxy wrappers
 * 3. Package APIs
 * 4. Mashups
 * 5. Lookups
 * 6. Pipelines
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { functionsConvention } from '../../src/conventions/functions'
import type { ApiEnv } from '../../src/types'
import type { FunctionsConfig, FunctionDef, ProxyDef, PackageDef, MashupDef, LookupDef, PipelineDef } from '../../src/conventions/functions'

// Helper to create a test app with the functions convention
function createTestApp(config: FunctionsConfig) {
  const app = new Hono<ApiEnv>()

  // Mock the respond helper that's normally provided by the API factory
  app.use('*', async (c, next) => {
    c.set('requestId', 'test-request-id')
    c.set('respond', (options: { data?: unknown; error?: { message: string; code?: string }; status?: number; meta?: Record<string, unknown> }) => {
      const status = options.status || (options.error ? 500 : 200)
      return c.json({
        api: { name: 'test-api' },
        data: options.data,
        error: options.error,
        meta: options.meta,
      }, status as 200)
    })
    await next()
  })

  const { routes, mcpTools } = functionsConvention(config)
  app.route('/', routes)

  return { app, mcpTools }
}

// =============================================================================
// 1. Service Functions (Actions)
// =============================================================================

describe('Service Functions (Actions)', () => {
  it('registers a function and handles POST requests', async () => {
    const handler = vi.fn().mockResolvedValue({ success: true, message: 'Email sent' })

    const emailFunction: FunctionDef = {
      name: 'email.send',
      description: 'Send an email',
      input: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['to', 'subject', 'body'],
      },
      handler,
    }

    const { app } = createTestApp({ functions: [emailFunction] })

    const res = await app.request('/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'test@example.com', subject: 'Hello', body: 'World' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ success: true, message: 'Email sent' })
    expect(handler).toHaveBeenCalledWith(
      { to: 'test@example.com', subject: 'Hello', body: 'World' },
      expect.objectContaining({ requestId: 'test-request-id' })
    )
  })

  it('handles GET requests with query params', async () => {
    const handler = vi.fn().mockResolvedValue({ result: 42 })

    const calcFunction: FunctionDef = {
      name: 'math.add',
      description: 'Add two numbers',
      input: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } },
      handler,
    }

    const { app } = createTestApp({ functions: [calcFunction] })

    const res = await app.request('/math/add?a=10&b=32')
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledWith(
      { a: '10', b: '32' },
      expect.anything()
    )
  })

  it('returns error for handler failures', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Service unavailable'))

    const errorFunction: FunctionDef = {
      name: 'fail.test',
      description: 'Always fails',
      input: { type: 'object', properties: {} },
      handler,
    }

    const { app } = createTestApp({ functions: [errorFunction] })

    const res = await app.request('/fail/test', { method: 'POST' })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.message).toBe('Service unavailable')
    expect(body.error.code).toBe('FUNCTION_ERROR')
  })

  it('creates MCP tools for functions', async () => {
    const testFunction: FunctionDef = {
      name: 'test.function',
      description: 'A test function',
      input: { type: 'object', properties: { value: { type: 'string' } } },
      handler: async () => ({}),
    }

    const { mcpTools } = createTestApp({ functions: [testFunction] })

    expect(mcpTools).toHaveLength(1)
    expect(mcpTools[0]).toEqual({
      name: 'test.function',
      description: 'A test function',
      inputSchema: { type: 'object', properties: { value: { type: 'string' } } },
    })
  })

  it('provides cache helper to function context', async () => {
    let receivedCtx: unknown = null
    const handler = vi.fn().mockImplementation(async (_input, ctx) => {
      receivedCtx = ctx
      return { ok: true }
    })

    const cacheFunction: FunctionDef = {
      name: 'cache.test',
      description: 'Test cache access',
      input: { type: 'object', properties: {} },
      handler,
    }

    const { app } = createTestApp({ functions: [cacheFunction] })
    await app.request('/cache/test', { method: 'POST' })

    expect(receivedCtx).toHaveProperty('cache')
    expect(receivedCtx).toHaveProperty('cache.get')
    expect(receivedCtx).toHaveProperty('cache.set')
    expect(receivedCtx).toHaveProperty('cache.getOrSet')
  })
})

// =============================================================================
// 2. Proxy Wrappers
// =============================================================================

describe('Proxy Wrappers', () => {
  let originalFetch: typeof fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalFetch = globalThis.fetch
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('proxies requests to upstream', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ user: 'john' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const apolloProxy: ProxyDef = {
      name: 'apollo',
      upstream: 'https://api.apollo.io',
      description: 'Apollo.io API proxy',
    }

    const { app } = createTestApp({ proxies: [apolloProxy] })

    const res = await app.request('/apollo/v1/people/search', { method: 'GET' })
    expect(res.status).toBe(200)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.apollo.io/v1/people/search',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('applies auth headers', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const stripeProxy: ProxyDef = {
      name: 'stripe',
      upstream: 'https://api.stripe.com',
      auth: { type: 'bearer', token: 'sk_test_12345' },
    }

    const { app } = createTestApp({ proxies: [stripeProxy] })
    await app.request('/stripe/v1/customers')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_12345',
        }),
      })
    )
  })

  it('applies API key auth', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const apiKeyProxy: ProxyDef = {
      name: 'service',
      upstream: 'https://api.service.com',
      auth: { type: 'api-key', token: 'my-api-key', header: 'X-Custom-Key' },
    }

    const { app } = createTestApp({ proxies: [apiKeyProxy] })
    await app.request('/service/data')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom-Key': 'my-api-key',
        }),
      })
    )
  })

  it('transforms responses', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({
      results: [{ id: 1, name: 'Test' }],
      total_count: 100,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const transformProxy: ProxyDef = {
      name: 'transform',
      upstream: 'https://api.example.com',
      transformResponse: (res) => ({
        items: (res.body as { results: unknown[] }).results,
        count: (res.body as { total_count: number }).total_count,
      }),
    }

    const { app } = createTestApp({ proxies: [transformProxy] })
    const res = await app.request('/transform/data')

    const body = await res.json()
    expect(body.data).toEqual({
      items: [{ id: 1, name: 'Test' }],
      count: 100,
    })
  })

  it('handles upstream errors', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'application/json' },
    }))

    const errorProxy: ProxyDef = {
      name: 'error',
      upstream: 'https://api.example.com',
    }

    const { app } = createTestApp({ proxies: [errorProxy] })
    const res = await app.request('/error/missing')

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('PROXY_ERROR')
  })

  it('forwards specified headers', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const forwardProxy: ProxyDef = {
      name: 'forward',
      upstream: 'https://api.example.com',
      forwardHeaders: ['X-Request-Id', 'Accept-Language'],
    }

    const { app } = createTestApp({ proxies: [forwardProxy] })
    await app.request('/forward/data', {
      headers: {
        'X-Request-Id': 'req-123',
        'Accept-Language': 'en-US',
        'X-Other-Header': 'ignored',
      },
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Request-Id': 'req-123',
          'Accept-Language': 'en-US',
        }),
      })
    )
  })
})

// =============================================================================
// 3. Package APIs
// =============================================================================

describe('Package APIs', () => {
  it('registers package functions as endpoints', async () => {
    const lodashPkg: PackageDef = {
      name: 'lodash-es',
      expose: ['camelCase', 'kebabCase'],
      namespace: 'lodash',
    }

    const { app, mcpTools } = createTestApp({ packages: [lodashPkg] })

    // Check that MCP tools are created for package functions
    const lodashTools = mcpTools.filter(t => t.name.startsWith('lodash.'))
    expect(lodashTools.length).toBeGreaterThanOrEqual(2)
    expect(lodashTools.map(t => t.name)).toContain('lodash.camelCase')
    expect(lodashTools.map(t => t.name)).toContain('lodash.kebabCase')
  })

  it('exposes package functions with custom names', async () => {
    const customPkg: PackageDef = {
      name: 'test-package',
      expose: [
        { name: 'originalName', as: 'customName', description: 'Custom exposed function' },
      ],
    }

    const { mcpTools } = createTestApp({ packages: [customPkg] })

    const customTool = mcpTools.find(t => t.name === 'test-package.customName')
    expect(customTool).toBeDefined()
    expect(customTool?.description).toBe('Custom exposed function')
  })
})

// =============================================================================
// 4. Data Mashups
// =============================================================================

describe('Data Mashups', () => {
  let originalFetch: typeof fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalFetch = globalThis.fetch
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('combines data from multiple sources', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('company')) {
        return Promise.resolve(new Response(JSON.stringify({
          name: 'Acme Corp',
          domain: 'acme.com',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      if (url.includes('employees')) {
        return Promise.resolve(new Response(JSON.stringify({
          count: 150,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    const companyMashup: MashupDef = {
      name: 'company.enrich',
      description: 'Enrich company data from multiple sources',
      input: { type: 'object', properties: { domain: { type: 'string' } } },
      sources: {
        company: {
          url: 'https://api.company.com/lookup?domain={domain}',
        },
        employees: {
          url: 'https://api.employees.com/count?domain={domain}',
        },
      },
      merge: (results) => ({
        ...results.company as object,
        employeeCount: (results.employees as { count: number }).count,
      }),
    }

    const { app } = createTestApp({ mashups: [companyMashup] })

    const res = await app.request('/company/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'acme.com' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({
      name: 'Acme Corp',
      domain: 'acme.com',
      employeeCount: 150,
    })
    expect(body.meta.sources).toContain('company')
    expect(body.meta.sources).toContain('employees')
  })

  it('handles optional source failures gracefully', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('required')) {
        return Promise.resolve(new Response(JSON.stringify({ id: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }))
      }
      // Optional source fails
      return Promise.resolve(new Response('Internal error', { status: 500 }))
    })

    const partialMashup: MashupDef = {
      name: 'partial.data',
      description: 'Mashup with optional source',
      input: { type: 'object', properties: {} },
      sources: {
        required: {
          url: 'https://api.required.com/data',
          required: true,
        },
        optional: {
          url: 'https://api.optional.com/data',
          required: false,
        },
      },
      merge: 'shallow',
    }

    const { app } = createTestApp({ mashups: [partialMashup] })

    const res = await app.request('/partial/data', { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe(1)
    // The optional source error is tracked
    expect(body.meta.errors).toHaveProperty('optional')
  })

  it('supports deep merge mode', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('source1')) {
        return Promise.resolve(new Response(JSON.stringify({
          user: { name: 'John', email: 'john@example.com' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      if (url.includes('source2')) {
        return Promise.resolve(new Response(JSON.stringify({
          user: { phone: '123-456-7890' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    const deepMashup: MashupDef = {
      name: 'deep.merge',
      description: 'Deep merge sources',
      input: { type: 'object', properties: {} },
      sources: {
        source1: { url: 'https://api.source1.com/data' },
        source2: { url: 'https://api.source2.com/data' },
      },
      merge: 'deep',
    }

    const { app } = createTestApp({ mashups: [deepMashup] })

    const res = await app.request('/deep/merge', { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.user).toEqual({
      name: 'John',
      email: 'john@example.com',
      phone: '123-456-7890',
    })
  })
})

// =============================================================================
// 5. Reference Data Lookups
// =============================================================================

describe('Reference Data Lookups', () => {
  it('lists lookup data with pagination', async () => {
    const countriesLookup: LookupDef = {
      name: 'countries',
      description: 'Country lookup',
      primaryKey: 'code',
      fields: [
        { name: 'code', type: 'string', indexed: true },
        { name: 'name', type: 'string', indexed: true },
      ],
      source: {
        type: 'static',
        data: [
          { code: 'US', name: 'United States' },
          { code: 'GB', name: 'United Kingdom' },
          { code: 'CA', name: 'Canada' },
          { code: 'AU', name: 'Australia' },
        ],
      },
    }

    const { app } = createTestApp({ lookups: [countriesLookup] })

    const res = await app.request('/countries?limit=2&offset=0')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.meta.limit).toBe(2)
    expect(body.meta.offset).toBe(0)
  })

  it('gets lookup item by ID', async () => {
    const countriesLookup: LookupDef = {
      name: 'countries',
      primaryKey: 'code',
      fields: [
        { name: 'code', type: 'string', indexed: true },
        { name: 'name', type: 'string', indexed: true },
      ],
      source: {
        type: 'static',
        data: [
          { code: 'US', name: 'United States' },
          { code: 'GB', name: 'United Kingdom' },
        ],
      },
    }

    const { app } = createTestApp({ lookups: [countriesLookup] })

    const res = await app.request('/countries/US')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ code: 'US', name: 'United States' })
  })

  it('returns 404 for missing lookup item', async () => {
    const countriesLookup: LookupDef = {
      name: 'countries',
      primaryKey: 'code',
      fields: [{ name: 'code', type: 'string', indexed: true }],
      source: { type: 'static', data: [{ code: 'US' }] },
    }

    const { app } = createTestApp({ lookups: [countriesLookup] })

    const res = await app.request('/countries/XX')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('searches lookup data', async () => {
    const countriesLookup: LookupDef = {
      name: 'countries',
      primaryKey: 'code',
      fields: [
        { name: 'code', type: 'string', indexed: true },
        { name: 'name', type: 'string', indexed: true },
      ],
      search: {
        fields: ['name'],
        minLength: 2,
      },
      source: {
        type: 'static',
        data: [
          { code: 'US', name: 'United States' },
          { code: 'GB', name: 'United Kingdom' },
          { code: 'AE', name: 'United Arab Emirates' },
          { code: 'CA', name: 'Canada' },
        ],
      },
    }

    const { app } = createTestApp({ lookups: [countriesLookup] })

    const res = await app.request('/countries/search?q=united')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(3)
    expect(body.data.map((c: { name: string }) => c.name)).toContain('United States')
    expect(body.data.map((c: { name: string }) => c.name)).toContain('United Kingdom')
    expect(body.data.map((c: { name: string }) => c.name)).toContain('United Arab Emirates')
  })

  it('enforces minimum search query length', async () => {
    const countriesLookup: LookupDef = {
      name: 'countries',
      primaryKey: 'code',
      fields: [{ name: 'name', type: 'string', indexed: true }],
      search: { fields: ['name'], minLength: 3 },
      source: { type: 'static', data: [] },
    }

    const { app } = createTestApp({ lookups: [countriesLookup] })

    const res = await app.request('/countries/search?q=ab')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('QUERY_TOO_SHORT')
  })

  it('provides autocomplete functionality', async () => {
    const countriesLookup: LookupDef = {
      name: 'countries',
      primaryKey: 'code',
      fields: [{ name: 'name', type: 'string', indexed: true }],
      autocomplete: {
        field: 'name',
        limit: 5,
        minLength: 1,
      },
      source: {
        type: 'static',
        data: [
          { code: 'US', name: 'United States' },
          { code: 'GB', name: 'United Kingdom' },
          { code: 'UA', name: 'Ukraine' },
          { code: 'UY', name: 'Uruguay' },
        ],
      },
    }

    const { app } = createTestApp({ lookups: [countriesLookup] })

    const res = await app.request('/countries/autocomplete?q=U')
    expect(res.status).toBe(200)
    const body = await res.json()
    // Autocomplete starts with U, should match all entries starting with U
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((c: { name: string }) => {
      expect(c.name.toLowerCase().startsWith('u')).toBe(true)
    })
  })

  it('creates MCP tools for lookup operations', async () => {
    const countriesLookup: LookupDef = {
      name: 'countries',
      primaryKey: 'code',
      fields: [{ name: 'name', type: 'string', indexed: true }],
      source: { type: 'static', data: [] },
    }

    const { mcpTools } = createTestApp({ lookups: [countriesLookup] })

    const getTool = mcpTools.find(t => t.name === 'countries.get')
    const searchTool = mcpTools.find(t => t.name === 'countries.search')

    expect(getTool).toBeDefined()
    expect(searchTool).toBeDefined()
    expect(getTool?.inputSchema.required).toContain('code')
  })

  it('transforms lookup results', async () => {
    const countriesLookup: LookupDef = {
      name: 'countries',
      primaryKey: 'code',
      fields: [
        { name: 'code', type: 'string', indexed: true },
        { name: 'name', type: 'string', indexed: true },
      ],
      source: {
        type: 'static',
        data: [{ code: 'US', name: 'United States' }],
      },
      transform: (item) => ({
        ...item as object,
        uppercase_name: ((item as { name: string }).name).toUpperCase(),
      }),
    }

    const { app } = createTestApp({ lookups: [countriesLookup] })

    const res = await app.request('/countries/US')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.uppercase_name).toBe('UNITED STATES')
  })
})

// =============================================================================
// 6. Transformation Pipelines
// =============================================================================

describe('Transformation Pipelines', () => {
  it('executes pipeline steps in sequence', async () => {
    const steps: string[] = []

    const testFn1: FunctionDef = {
      name: 'pipeline.step1',
      description: 'Step 1',
      input: { type: 'object' },
      handler: async (input) => {
        steps.push('step1')
        return { ...input as object, step1: true }
      },
    }

    const testFn2: FunctionDef = {
      name: 'pipeline.step2',
      description: 'Step 2',
      input: { type: 'object' },
      handler: async (input) => {
        steps.push('step2')
        return { ...input as object, step2: true }
      },
    }

    const testPipeline: PipelineDef = {
      name: 'data.process',
      description: 'Process data through steps',
      input: { type: 'object', properties: { value: { type: 'string' } } },
      steps: [
        { name: 'first', type: 'function', function: 'pipeline.step1' },
        { name: 'second', type: 'function', function: 'pipeline.step2' },
      ],
    }

    const { app } = createTestApp({
      functions: [testFn1, testFn2],
      pipelines: [testPipeline],
    })

    const res = await app.request('/data/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'test' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ value: 'test', step1: true, step2: true })
    expect(steps).toEqual(['step1', 'step2'])
  })

  it('supports inline transform steps', async () => {
    const testPipeline: PipelineDef = {
      name: 'transform.test',
      description: 'Transform data inline',
      input: { type: 'object' },
      steps: [
        {
          name: 'uppercase',
          type: 'transform',
          transform: (data) => ({
            value: String((data as { value: string }).value).toUpperCase(),
          }),
        },
      ],
    }

    const { app } = createTestApp({ pipelines: [testPipeline] })

    const res = await app.request('/transform/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'hello' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.value).toBe('HELLO')
  })

  it('supports conditional steps', async () => {
    const testPipeline: PipelineDef = {
      name: 'conditional.test',
      description: 'Conditional processing',
      input: { type: 'object' },
      steps: [
        {
          name: 'check',
          type: 'condition',
          condition: {
            if: (data) => (data as { premium: boolean }).premium === true,
            then: [
              {
                name: 'premium-transform',
                type: 'transform',
                transform: (data) => ({ ...data as object, discount: 0.2 }),
              },
            ],
            else: [
              {
                name: 'standard-transform',
                type: 'transform',
                transform: (data) => ({ ...data as object, discount: 0 }),
              },
            ],
          },
        },
      ],
    }

    const { app } = createTestApp({ pipelines: [testPipeline] })

    // Premium user
    const premiumRes = await app.request('/conditional/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ premium: true, price: 100 }),
    })
    const premiumBody = await premiumRes.json()
    expect(premiumBody.data.discount).toBe(0.2)

    // Standard user
    const standardRes = await app.request('/conditional/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ premium: false, price: 100 }),
    })
    const standardBody = await standardRes.json()
    expect(standardBody.data.discount).toBe(0)
  })

  it('supports parallel steps', async () => {
    const testPipeline: PipelineDef = {
      name: 'parallel.test',
      description: 'Parallel processing',
      input: { type: 'object' },
      steps: [
        {
          name: 'parallel-ops',
          type: 'parallel',
          parallel: [
            {
              name: 'op1',
              type: 'transform',
              transform: (data) => ({ a: ((data as { value: number }).value) * 2 }),
            },
            {
              name: 'op2',
              type: 'transform',
              transform: (data) => ({ b: ((data as { value: number }).value) * 3 }),
            },
          ],
        },
      ],
    }

    const { app } = createTestApp({ pipelines: [testPipeline] })

    const res = await app.request('/parallel/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 10 }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    // Parallel steps return array of results
    expect(body.data).toEqual([{ a: 20 }, { b: 30 }])
  })

  it('supports skipIf for conditional step skipping', async () => {
    let step2Called = false

    const testFn: FunctionDef = {
      name: 'skip.step',
      description: 'A step',
      input: { type: 'object' },
      handler: async (input) => {
        step2Called = true
        return input
      },
    }

    const testPipeline: PipelineDef = {
      name: 'skip.test',
      description: 'Skip step test',
      input: { type: 'object' },
      steps: [
        {
          name: 'skippable',
          type: 'function',
          function: 'skip.step',
          skipIf: (data) => (data as { skip: boolean }).skip === true,
        },
      ],
    }

    const { app } = createTestApp({
      functions: [testFn],
      pipelines: [testPipeline],
    })

    // With skip=true
    step2Called = false
    await app.request('/skip/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skip: true }),
    })
    expect(step2Called).toBe(false)

    // With skip=false
    step2Called = false
    await app.request('/skip/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skip: false }),
    })
    expect(step2Called).toBe(true)
  })
})

// =============================================================================
// MCP Endpoint Integration
// =============================================================================
// NOTE: The functions convention no longer mounts its own /mcp endpoint.
// All MCP tools are now served through a unified /mcp endpoint via McpToolRegistry.
// See tests/mcp-registry.test.ts for unified MCP endpoint tests.

describe('MCP Tools Generation', () => {
  it('generates MCP tools for functions', () => {
    const testFunction: FunctionDef = {
      name: 'test.fn',
      description: 'Test function',
      input: { type: 'object' },
      handler: async () => ({}),
    }

    const testLookup: LookupDef = {
      name: 'items',
      primaryKey: 'id',
      fields: [{ name: 'id', type: 'string' }],
      source: { type: 'static', data: [] },
    }

    const { mcpTools } = createTestApp({
      functions: [testFunction],
      lookups: [testLookup],
    })

    // Functions convention should return mcpTools for registration with the unified registry
    expect(mcpTools.length).toBeGreaterThan(0)
    expect(mcpTools.some((t: { name: string }) => t.name === 'test.fn')).toBe(true)
    expect(mcpTools.some((t: { name: string }) => t.name === 'items.get')).toBe(true)
  })
})

// =============================================================================
// Base Path Support
// =============================================================================

describe('Base Path Support', () => {
  it('respects basePath configuration', async () => {
    const testFunction: FunctionDef = {
      name: 'test.fn',
      description: 'Test',
      input: { type: 'object' },
      handler: async () => ({ ok: true }),
    }

    const { app } = createTestApp({
      basePath: '/api/v1',
      functions: [testFunction],
    })

    // Without basePath - should not match
    const res1 = await app.request('/test/fn', { method: 'POST' })
    expect(res1.status).toBe(404)

    // With basePath - should match
    const res2 = await app.request('/api/v1/test/fn', { method: 'POST' })
    expect(res2.status).toBe(200)
  })
})
