/**
 * Transport Unification Convention Tests
 *
 * Verifies that the same operation works across all four transports:
 * - URL: crm.do/sendContract(deal_kRziM)
 * - SDK: $.sendContract('deal_kRziM')  (represented as direct function call)
 * - RPC: POST /rpc  { path: ['sendContract'], args: ['deal_kRziM'] }
 * - MCP: POST /mcp  { method: 'tools/call', params: { name: 'sendContract', arguments: { entity: 'deal_kRziM' } } }
 *
 * Auto-generates MCP tools from functions + CRUD.
 * Auto-generates RPC handlers from registered functions.
 * Root discovery shows both `discover` (nouns) and `functions` (verbs).
 */

import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { FunctionRegistry } from '../../src/conventions/function-calls'
import { transportConvention, type TransportConfig } from '../../src/conventions/transport'
import type { ApiEnv } from '../../src/types'
import { responseMiddleware } from '../../src/response'
import { contextMiddleware } from '../../src/middleware/context'

// =============================================================================
// Helper: create a test app wired with response middleware + transport convention
// =============================================================================

function createTestApp(config: TransportConfig) {
  const app = new Hono<ApiEnv>()

  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware({ name: 'crm.do', description: 'CRM API' }))

  // Mount transport convention
  app.route('/', transportConvention(config))

  return app
}

// Helper to make MCP JSON-RPC requests
const jsonRpc = (method: string, params?: unknown, id: string | number = 1) => ({
  jsonrpc: '2.0',
  method,
  params,
  id,
})

// =============================================================================
// 1. TransportConfig and setup
// =============================================================================

describe('TransportConfig', () => {
  it('accepts a function registry', () => {
    const registry = new FunctionRegistry()
    registry.register('sendContract', vi.fn().mockResolvedValue({ status: 'sent' }), {
      description: 'Send a contract',
      example: 'deal_kRziM',
    })

    const config: TransportConfig = {
      registry,
    }

    expect(config.registry).toBe(registry)
  })

  it('accepts optional collections (nouns) for discovery', () => {
    const registry = new FunctionRegistry()
    const config: TransportConfig = {
      registry,
      collections: ['contacts', 'deals', 'leads'],
    }

    expect(config.collections).toEqual(['contacts', 'deals', 'leads'])
  })

  it('accepts optional entity verbs for auto-generation', () => {
    const registry = new FunctionRegistry()
    const config: TransportConfig = {
      registry,
      entityVerbs: {
        deal: ['sendContract', 'qualify', 'close'],
        contact: ['score', 'merge', 'enrich'],
      },
    }

    expect(config.entityVerbs).toBeDefined()
  })
})

// =============================================================================
// 2. RPC transport: POST /rpc with path + args format
// =============================================================================

describe('RPC transport', () => {
  it('executes a function via POST /rpc with path and args', async () => {
    const sendContractFn = vi.fn().mockResolvedValue({ status: 'sent', contractId: 'c_123' })

    const registry = new FunctionRegistry()
    registry.register('sendContract', sendContractFn, {
      description: 'Send a contract',
      example: 'deal_kRziM',
    })

    const app = createTestApp({ registry })

    const res = await app.request('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: ['sendContract'],
        args: ['deal_kRziM'],
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ status: 'sent', contractId: 'c_123' })
  })

  it('executes with dotted path segments', async () => {
    const parseFn = vi.fn().mockResolvedValue({ rows: 100 })

    const registry = new FunctionRegistry()
    registry.register('papa.parse', parseFn, {
      description: 'Parse CSV',
    })

    const app = createTestApp({ registry })

    const res = await app.request('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: ['papa.parse'],
        args: ['https://example.com/data.csv'],
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ rows: 100 })
  })

  it('returns 404 when function is not found via RPC', async () => {
    const registry = new FunctionRegistry()
    registry.register('score', vi.fn().mockResolvedValue(42))

    const app = createTestApp({ registry })

    const res = await app.request('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: ['nonexistent'],
        args: [],
      }),
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('FUNCTION_NOT_FOUND')
  })

  it('handles empty args array', async () => {
    const pingFn = vi.fn().mockResolvedValue({ pong: true })

    const registry = new FunctionRegistry()
    registry.register('ping', pingFn)

    const app = createTestApp({ registry })

    const res = await app.request('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: ['ping'],
        args: [],
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ pong: true })
  })

  it('passes multiple args correctly', async () => {
    const mergeFn = vi.fn().mockResolvedValue({ merged: true })

    const registry = new FunctionRegistry()
    registry.register('merge', mergeFn, { description: 'Merge contacts' })

    const app = createTestApp({ registry })

    const res = await app.request('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: ['merge'],
        args: ['contact_abc', 'contact_def'],
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ merged: true })

    // Verify args were passed to handler
    expect(mergeFn).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'merge',
        args: [
          { value: 'contact_abc', type: 'string' },
          { value: 'contact_def', type: 'string' },
        ],
      }),
      expect.anything(),
    )
  })

  it('returns 400 for malformed RPC request (missing path)', async () => {
    const registry = new FunctionRegistry()
    const app = createTestApp({ registry })

    const res = await app.request('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args: ['deal_kRziM'] }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('INVALID_RPC_REQUEST')
  })

  it('GET /rpc lists available RPC methods from registry', async () => {
    const registry = new FunctionRegistry()
    registry.register('sendContract', vi.fn(), { description: 'Send a contract', example: 'deal_kRziM' })
    registry.register('score', vi.fn(), { description: 'Score a contact', example: 'contact_abc' })

    const app = createTestApp({ registry })

    const res = await app.request('/rpc')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(body.data.methods).toEqual(
      expect.arrayContaining(['sendContract', 'score']),
    )
  })

  it('handles function errors gracefully in RPC', async () => {
    const failFn = vi.fn().mockRejectedValue(new Error('DB connection lost'))

    const registry = new FunctionRegistry()
    registry.register('fail', failFn)

    const app = createTestApp({ registry })

    const res = await app.request('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: ['fail'],
        args: [],
      }),
    })

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.message).toBe('DB connection lost')
    expect(body.error.code).toBe('FUNCTION_ERROR')
  })
})

// =============================================================================
// 3. MCP transport: auto-generated tools from function registry
// =============================================================================

describe('MCP transport (auto-generated tools)', () => {
  it('auto-generates MCP tools from registered functions (tools/list)', async () => {
    const registry = new FunctionRegistry()
    registry.register('sendContract', vi.fn(), {
      description: 'Send a contract',
      example: 'deal_kRziM',
    })
    registry.register('score', vi.fn(), {
      description: 'Score a contact',
      example: 'contact_abc',
    })

    const app = createTestApp({
      registry,
      mcp: { name: 'crm-server', version: '1.0.0' },
    })

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonRpc('tools/list')),
    })

    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.result.tools).toHaveLength(2)

    const toolNames = body.result.tools.map((t: { name: string }) => t.name)
    expect(toolNames).toContain('sendContract')
    expect(toolNames).toContain('score')

    // Check tool structure
    const sendTool = body.result.tools.find((t: { name: string }) => t.name === 'sendContract')
    expect(sendTool.description).toBe('Send a contract')
    expect(sendTool.inputSchema).toBeDefined()
  })

  it('executes auto-generated MCP tool via tools/call', async () => {
    const sendContractFn = vi.fn().mockResolvedValue({ status: 'sent', contractId: 'c_123' })

    const registry = new FunctionRegistry()
    registry.register('sendContract', sendContractFn, {
      description: 'Send a contract',
      example: 'deal_kRziM',
    })

    const app = createTestApp({
      registry,
      mcp: { name: 'crm-server' },
    })

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonRpc('tools/call', {
        name: 'sendContract',
        arguments: { entity: 'deal_kRziM' },
      })),
    })

    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.result.content).toBeDefined()
    expect(body.result.content[0].type).toBe('text')

    const result = JSON.parse(body.result.content[0].text)
    expect(result).toEqual({ status: 'sent', contractId: 'c_123' })
  })

  it('returns error for unknown tool in MCP', async () => {
    const registry = new FunctionRegistry()
    registry.register('score', vi.fn(), { description: 'Score' })

    const app = createTestApp({
      registry,
      mcp: { name: 'crm-server' },
    })

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonRpc('tools/call', {
        name: 'nonexistent',
        arguments: {},
      })),
    })

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.message).toContain('nonexistent')
  })

  it('MCP initialize returns server info with tools capability', async () => {
    const registry = new FunctionRegistry()
    registry.register('sendContract', vi.fn(), { description: 'Send a contract' })

    const app = createTestApp({
      registry,
      mcp: { name: 'crm-server', version: '2.0.0' },
    })

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonRpc('initialize')),
    })

    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.result.serverInfo.name).toBe('crm-server')
    expect(body.result.serverInfo.version).toBe('2.0.0')
    expect(body.result.capabilities.tools).toBeDefined()
  })

  it('MCP handles function errors in tools/call', async () => {
    const failFn = vi.fn().mockRejectedValue(new Error('Service unavailable'))

    const registry = new FunctionRegistry()
    registry.register('fail', failFn, { description: 'A failing function' })

    const app = createTestApp({
      registry,
      mcp: { name: 'crm-server' },
    })

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonRpc('tools/call', {
        name: 'fail',
        arguments: {},
      })),
    })

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.error.message).toBe('Service unavailable')
  })
})

// =============================================================================
// 4. Root discovery: includes `discover` (nouns) and `functions` (verbs)
// =============================================================================

describe('Root discovery', () => {
  it('includes both discover (nouns) and functions (verbs) in root response', async () => {
    const registry = new FunctionRegistry()
    registry.register('sendContract', vi.fn(), {
      description: 'Send a contract',
      example: 'deal_kRziM',
    })
    registry.register('score', vi.fn(), {
      description: 'Score a contact',
      example: 'contact_abc',
    })

    const app = createTestApp({
      registry,
      collections: ['contacts', 'deals', 'leads'],
    })

    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()

    // discover block lists nouns/collections
    expect(body.discover).toBeDefined()
    expect(body.discover).toEqual(
      expect.objectContaining({
        contacts: expect.stringContaining('/contacts'),
        deals: expect.stringContaining('/deals'),
        leads: expect.stringContaining('/leads'),
      }),
    )

    // functions block lists verbs
    expect(body.functions).toBeDefined()
    expect(body.functions).toEqual(
      expect.objectContaining({
        'Send a contract': expect.stringContaining('sendContract'),
        'Score a contact': expect.stringContaining('score'),
      }),
    )
  })

  it('root discovery works without collections', async () => {
    const registry = new FunctionRegistry()
    registry.register('ping', vi.fn(), { description: 'Health check' })

    const app = createTestApp({ registry })

    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()

    // functions block should still be present
    expect(body.functions).toBeDefined()
    expect(body.functions['Health check']).toBeDefined()
  })

  it('root discovery works without functions', async () => {
    const registry = new FunctionRegistry()

    const app = createTestApp({
      registry,
      collections: ['contacts'],
    })

    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()

    // discover block should still be present
    expect(body.discover).toBeDefined()
    expect(body.discover.contacts).toBeDefined()
  })

  it('root includes transports block listing available transports', async () => {
    const registry = new FunctionRegistry()
    registry.register('score', vi.fn(), { description: 'Score' })

    const app = createTestApp({
      registry,
      mcp: { name: 'crm-server' },
    })

    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.transports).toBeDefined()
    expect(body.transports).toEqual(
      expect.objectContaining({
        url: expect.any(String),
        rpc: expect.any(String),
        mcp: expect.any(String),
      }),
    )
  })
})

// =============================================================================
// 5. Transport equivalence: same operation across all transports
// =============================================================================

describe('Transport equivalence', () => {
  it('sendContract produces equivalent results across RPC and MCP', async () => {
    const sendContractFn = vi.fn().mockResolvedValue({ status: 'sent', contractId: 'c_123' })

    const registry = new FunctionRegistry()
    registry.register('sendContract', sendContractFn, {
      description: 'Send a contract',
      example: 'deal_kRziM',
    })

    const app = createTestApp({
      registry,
      mcp: { name: 'crm-server' },
    })

    // RPC transport
    const rpcRes = await app.request('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: ['sendContract'],
        args: ['deal_kRziM'],
      }),
    })

    const rpcBody = await rpcRes.json()
    const rpcResult = rpcBody.data

    // MCP transport
    const mcpRes = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonRpc('tools/call', {
        name: 'sendContract',
        arguments: { entity: 'deal_kRziM' },
      })),
    })

    const mcpBody = await mcpRes.json()
    const mcpResult = JSON.parse(mcpBody.result.content[0].text)

    // Both transports should produce the same result
    expect(rpcResult).toEqual(mcpResult)
    expect(rpcResult).toEqual({ status: 'sent', contractId: 'c_123' })
  })

  it('the function handler is called for both RPC and MCP', async () => {
    const scoreFn = vi.fn().mockResolvedValue({ value: 87, grade: 'A' })

    const registry = new FunctionRegistry()
    registry.register('score', scoreFn, { description: 'Score a contact' })

    const app = createTestApp({
      registry,
      mcp: { name: 'crm-server' },
    })

    // Reset call count
    scoreFn.mockClear()

    // RPC call
    await app.request('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: ['score'], args: ['contact_abc'] }),
    })

    expect(scoreFn).toHaveBeenCalledTimes(1)

    // MCP call
    await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonRpc('tools/call', {
        name: 'score',
        arguments: { entity: 'contact_abc' },
      })),
    })

    expect(scoreFn).toHaveBeenCalledTimes(2)
  })
})

// =============================================================================
// 6. CRUD tool auto-generation
// =============================================================================

describe('CRUD tool auto-generation', () => {
  it('auto-generates CRUD-based MCP tools when collections are provided', async () => {
    const registry = new FunctionRegistry()

    const app = createTestApp({
      registry,
      collections: ['contacts', 'deals'],
      mcp: { name: 'crm-server' },
    })

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonRpc('tools/list')),
    })

    const body = await res.json()
    const toolNames = body.result.tools.map((t: { name: string }) => t.name)

    // Should have CRUD tools for each collection
    expect(toolNames).toContain('contacts.list')
    expect(toolNames).toContain('contacts.get')
    expect(toolNames).toContain('contacts.create')
    expect(toolNames).toContain('contacts.update')
    expect(toolNames).toContain('contacts.delete')
    expect(toolNames).toContain('deals.list')
    expect(toolNames).toContain('deals.get')
  })

  it('includes function tools alongside CRUD tools', async () => {
    const registry = new FunctionRegistry()
    registry.register('score', vi.fn(), { description: 'Score a contact' })

    const app = createTestApp({
      registry,
      collections: ['contacts'],
      mcp: { name: 'crm-server' },
    })

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonRpc('tools/list')),
    })

    const body = await res.json()
    const toolNames = body.result.tools.map((t: { name: string }) => t.name)

    // Both function and CRUD tools
    expect(toolNames).toContain('score')
    expect(toolNames).toContain('contacts.list')
  })

  it('auto-generates RPC methods for CRUD when collections are provided', async () => {
    const registry = new FunctionRegistry()

    const app = createTestApp({
      registry,
      collections: ['contacts', 'deals'],
    })

    const res = await app.request('/rpc')
    expect(res.status).toBe(200)

    const body = await res.json()
    const methods = body.data.methods

    expect(methods).toContain('contacts.list')
    expect(methods).toContain('contacts.get')
    expect(methods).toContain('contacts.create')
    expect(methods).toContain('contacts.update')
    expect(methods).toContain('contacts.delete')
    expect(methods).toContain('deals.list')
  })
})

// =============================================================================
// 7. Entity verb auto-generation
// =============================================================================

describe('Entity verb tools', () => {
  it('generates MCP tools for entity verbs', async () => {
    const registry = new FunctionRegistry()
    registry.register('qualify', vi.fn(), { description: 'Qualify a lead' })
    registry.register('close', vi.fn(), { description: 'Close a deal' })

    const app = createTestApp({
      registry,
      entityVerbs: {
        deal: ['close'],
        lead: ['qualify'],
      },
      mcp: { name: 'crm-server' },
    })

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonRpc('tools/list')),
    })

    const body = await res.json()
    const toolNames = body.result.tools.map((t: { name: string }) => t.name)

    // Should have both standalone function tools and entity-verb tools
    expect(toolNames).toContain('qualify')
    expect(toolNames).toContain('close')
  })
})
