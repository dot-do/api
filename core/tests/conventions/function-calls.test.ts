/**
 * Function-Call URL Convention Tests
 *
 * Tests for the function-call URL syntax: /score(contact_abc), /merge(a,b), etc.
 * The router detects kind: 'function' and this convention executes the registered function.
 */

import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { FunctionRegistry, functionCallConvention } from '../../src/conventions/function-calls'
import type { RegisteredFunction, FunctionCallConfig } from '../../src/conventions/function-calls'
import type { ApiEnv } from '../../src/types'
import { routerMiddleware } from '../../src/router'
import { responseMiddleware } from '../../src/response'

// =============================================================================
// Helper: create a test app wired with router + response + function-call convention
// =============================================================================

function createTestApp(config: FunctionCallConfig) {
  const app = new Hono<ApiEnv>()

  // Wire up response middleware (sets c.var.respond)
  app.use('*', responseMiddleware({ name: 'crm.do', description: 'CRM API' }))

  // Wire up router middleware (sets c.var.routeInfo)
  app.use('*', routerMiddleware())

  // Mount function-call convention
  app.route('/', functionCallConvention(config))

  return app
}

// =============================================================================
// 1. FunctionRegistry unit tests
// =============================================================================

describe('FunctionRegistry', () => {
  it('registers and retrieves a function by name', () => {
    const registry = new FunctionRegistry()
    const fn = vi.fn()
    registry.register('score', fn, { description: 'Score a contact' })

    const entry = registry.get('score')
    expect(entry).toBeDefined()
    expect(entry!.fn).toBe(fn)
    expect(entry!.description).toBe('Score a contact')
  })

  it('supports dotted names (e.g., papa.parse)', () => {
    const registry = new FunctionRegistry()
    const fn = vi.fn()
    registry.register('papa.parse', fn)

    expect(registry.get('papa.parse')).toBeDefined()
    expect(registry.get('papa.parse')!.fn).toBe(fn)
  })

  it('returns undefined for unregistered functions', () => {
    const registry = new FunctionRegistry()
    expect(registry.get('nonexistent')).toBeUndefined()
  })

  it('lists all registered functions', () => {
    const registry = new FunctionRegistry()
    registry.register('score', vi.fn(), { description: 'Score contact' })
    registry.register('merge', vi.fn(), { description: 'Merge contacts' })
    registry.register('papa.parse', vi.fn(), { description: 'Parse CSV' })

    const list = registry.list()
    expect(list).toHaveLength(3)
    expect(list.map((e) => e.name)).toEqual(['score', 'merge', 'papa.parse'])
  })

  it('generates discovery block (toDiscovery)', () => {
    const registry = new FunctionRegistry()
    registry.register('score', vi.fn(), { description: 'Score a contact', example: 'contact_abc' })
    registry.register('sendContract', vi.fn(), { description: 'Send contract', example: 'deal_123' })

    const discovery = registry.toDiscovery('https://crm.do')
    expect(discovery).toEqual({
      'Score a contact': 'https://crm.do/score(contact_abc)',
      'Send contract': 'https://crm.do/sendContract(deal_123)',
    })
  })

  it('toDiscovery uses function name when no example is provided', () => {
    const registry = new FunctionRegistry()
    registry.register('score', vi.fn(), { description: 'Score a contact' })

    const discovery = registry.toDiscovery('https://crm.do')
    expect(discovery).toEqual({
      'Score a contact': 'https://crm.do/score',
    })
  })

  it('toDiscovery uses function name as description when no description is provided', () => {
    const registry = new FunctionRegistry()
    registry.register('score', vi.fn())

    const discovery = registry.toDiscovery('https://crm.do')
    expect(discovery).toEqual({
      score: 'https://crm.do/score',
    })
  })

  it('tracks mutating flag', () => {
    const registry = new FunctionRegistry()
    registry.register('sendContract', vi.fn(), { mutating: true })

    const entry = registry.get('sendContract')
    expect(entry!.mutating).toBe(true)
  })
})

// =============================================================================
// 2. Function-call convention integration tests
// =============================================================================

describe('functionCallConvention', () => {
  it('executes a simple function call and uses function name as payload key', async () => {
    const scoreFn = vi.fn().mockResolvedValue({
      value: 87,
      grade: 'A',
      confidence: 0.92,
    })

    const registry = new FunctionRegistry()
    registry.register('score', scoreFn, { description: 'Score a contact' })

    const app = createTestApp({ registry })

    const res = await app.request('/score(contact_abc)')
    expect(res.status).toBe(200)

    const body = await res.json()
    // Function name IS the payload key
    expect(body.score).toEqual({
      value: 87,
      grade: 'A',
      confidence: 0.92,
    })
    // Should have standard envelope fields
    expect(body.api).toBeDefined()
    expect(body.links).toBeDefined()
    expect(body.links.self).toContain('score(contact_abc)')
  })

  it('passes parsed args to the function handler', async () => {
    const scoreFn = vi.fn().mockResolvedValue({ value: 87 })

    const registry = new FunctionRegistry()
    registry.register('score', scoreFn)

    const app = createTestApp({ registry })
    await app.request('/score(contact_abc)')

    expect(scoreFn).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [{ value: 'contact_abc', type: 'entity' }],
        kwargs: {},
        name: 'score',
      }),
      expect.anything(),
    )
  })

  it('handles function with multiple args (merge)', async () => {
    const mergeFn = vi.fn().mockResolvedValue({
      merged: true,
      from: ['contact_abc', 'contact_def'],
    })

    const registry = new FunctionRegistry()
    registry.register('merge', mergeFn)

    const app = createTestApp({ registry })

    const res = await app.request('/merge(contact_abc,contact_def)')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.merge).toEqual({
      merged: true,
      from: ['contact_abc', 'contact_def'],
    })

    expect(mergeFn).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [
          { value: 'contact_abc', type: 'entity' },
          { value: 'contact_def', type: 'entity' },
        ],
      }),
      expect.anything(),
    )
  })

  it('handles dotted function names (papa.parse) with URL arg', async () => {
    const parseFn = vi.fn().mockResolvedValue({
      rows: 100,
      columns: ['name', 'email'],
    })

    const registry = new FunctionRegistry()
    registry.register('papa.parse', parseFn)

    const app = createTestApp({ registry })

    const res = await app.request('/papa.parse(https://example.com/data.csv)')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body['papa.parse']).toEqual({
      rows: 100,
      columns: ['name', 'email'],
    })

    expect(parseFn).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [{ value: 'https://example.com/data.csv', type: 'url' }],
        name: 'papa.parse',
      }),
      expect.anything(),
    )
  })

  it('returns 404 with links when function is not found', async () => {
    const registry = new FunctionRegistry()
    registry.register('score', vi.fn(), { description: 'Score a contact', example: 'contact_abc' })

    const app = createTestApp({ registry })

    const res = await app.request('/unknown(contact_abc)')
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.message).toMatch(/not found/i)
    // Should include actionable links (home + available functions)
    expect(body.links).toBeDefined()
    expect(body.links.home).toBeDefined()
  })

  it('executes function via POST body (direct execution)', async () => {
    const scoreFn = vi.fn().mockResolvedValue({ value: 95 })

    const registry = new FunctionRegistry()
    registry.register('score', scoreFn)

    const app = createTestApp({ registry })

    const res = await app.request('/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'contact_abc', model: 'v2' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.score).toEqual({ value: 95 })

    // POST body is passed as the parsed function call
    expect(scoreFn).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { entity: 'contact_abc', model: 'v2' },
        name: 'score',
      }),
      expect.anything(),
    )
  })

  it('detects mutating function for future confirmation flow', async () => {
    const sendContractFn = vi.fn().mockResolvedValue({ status: 'sent' })

    const registry = new FunctionRegistry()
    registry.register('sendContract', sendContractFn, { mutating: true })

    const app = createTestApp({ registry })

    // GET on a mutating function — the convention should still work
    // (future: may return confirmation preview instead)
    const res = await app.request('/sendContract(deal_kRziM)')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.sendContract).toEqual({ status: 'sent' })
  })

  it('handles function that throws an error', async () => {
    const failFn = vi.fn().mockRejectedValue(new Error('Database unavailable'))

    const registry = new FunctionRegistry()
    registry.register('fail', failFn)

    const app = createTestApp({ registry })

    const res = await app.request('/fail(contact_abc)')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.message).toBe('Database unavailable')
    expect(body.error.code).toBe('FUNCTION_ERROR')
  })

  it('passes Hono context as second argument', async () => {
    let receivedContext: unknown = null
    const fn = vi.fn().mockImplementation(async (_parsed, ctx) => {
      receivedContext = ctx
      return { ok: true }
    })

    const registry = new FunctionRegistry()
    registry.register('test', fn)

    const app = createTestApp({ registry })
    await app.request('/test(hello)')

    expect(receivedContext).toBeDefined()
    expect(receivedContext).toHaveProperty('c')
    expect(receivedContext).toHaveProperty('req')
  })

  it('ignores non-function routes (passes through)', async () => {
    const registry = new FunctionRegistry()
    registry.register('score', vi.fn())

    const app = new Hono<ApiEnv>()
    app.use('*', responseMiddleware({ name: 'test' }))
    app.use('*', routerMiddleware())
    app.route('/', functionCallConvention({ registry }))

    // A collection route should pass through (not match function convention)
    app.get('/contacts', (c) => c.json({ passthrough: true }))

    const res = await app.request('/contacts')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.passthrough).toBe(true)
  })

  it('handles kwargs in function call', async () => {
    const parseFn = vi.fn().mockResolvedValue({ parsed: true })

    const registry = new FunctionRegistry()
    registry.register('papa.parse', parseFn)

    const app = createTestApp({ registry })

    const res = await app.request('/papa.parse(https://example.com/data.csv,header=true)')
    expect(res.status).toBe(200)

    expect(parseFn).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [{ value: 'https://example.com/data.csv', type: 'url' }],
        kwargs: { header: 'true' },
        name: 'papa.parse',
      }),
      expect.anything(),
    )
  })
})
