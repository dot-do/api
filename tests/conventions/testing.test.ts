import { describe, it, expect, beforeEach } from 'vitest'
import { API } from '../../src/index'
import type { McpTool, TestingConfig } from '../../src/types'

// Extended MCP tool interface with testing properties
interface ExtendedMcpTool extends McpTool {
  outputSchema?: Record<string, unknown>
  examples?: Array<{ name: string; input?: unknown; output?: unknown }>
  tests?: Array<{
    id?: string
    name: string
    description?: string
    tags?: string[]
    input: unknown
    expect: {
      status: 'success' | 'error'
      output?: unknown
      error?: { code?: string | number; message?: string }
      match?: 'exact' | 'partial' | 'schema'
    }
  }>
}

describe('Testing Convention', () => {
  describe('GET /qa endpoint', () => {
    it('returns test summary with counts', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'greet',
          description: 'Greets a user',
          inputSchema: { type: 'object', properties: { name: { type: 'string' } } },
          tests: [
            { name: 'greet Alice', input: { name: 'Alice' }, expect: { status: 'success', output: 'Hello, Alice!' } },
            { name: 'greet Bob', input: { name: 'Bob' }, expect: { status: 'success', output: 'Hello, Bob!' } },
          ],
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.data.summary).toBeDefined()
      expect(body.data.summary.total).toBe(2)
      expect(body.data.summary.byType.mcp).toBe(2)
      expect(body.data.summary.byType.rest).toBe(0)
      expect(body.data.summary.byType.rpc).toBe(0)
    })

    it('returns tests array with test details', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'calculate',
          description: 'Performs calculation',
          inputSchema: { type: 'object' },
          tests: [
            { name: 'add numbers', input: { a: 1, b: 2 }, expect: { status: 'success', output: 3 } },
          ],
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa')
      const body = await res.json()

      expect(body.data.tests).toBeInstanceOf(Array)
      expect(body.data.tests.length).toBe(1)
      expect(body.data.tests[0].name).toBe('add numbers')
      expect(body.data.tests[0].type).toBe('mcp')
      expect(body.data.tests[0].method).toBe('calculate')
    })

    it('returns tag counts in summary', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'greet',
          description: 'Greets a user',
          inputSchema: { type: 'object' },
          tests: [
            { name: 'happy path', input: {}, expect: { status: 'success' }, tags: ['smoke'] },
            { name: 'edge case', input: {}, expect: { status: 'success' }, tags: ['edge', 'slow'] },
          ],
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true, tags: ['unit'] },
      })

      const res = await app.request('/qa')
      const body = await res.json()

      // Config tags are merged with test tags
      expect(body.data.summary.byTag).toBeDefined()
      expect(body.data.summary.byTag.unit).toBe(2) // both tests get config tags
      expect(body.data.summary.byTag.smoke).toBe(1)
      expect(body.data.summary.byTag.edge).toBe(1)
      expect(body.data.summary.byTag.slow).toBe(1)
    })
  })

  describe('tests/list JSON-RPC method', () => {
    it('returns all test cases', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'tool1',
          description: 'First tool',
          inputSchema: { type: 'object' },
          tests: [
            { name: 'test 1', input: {}, expect: { status: 'success' } },
          ],
          handler: async () => ({}),
        },
        {
          name: 'tool2',
          description: 'Second tool',
          inputSchema: { type: 'object' },
          tests: [
            { name: 'test 2', input: {}, expect: { status: 'success' } },
            { name: 'test 3', input: {}, expect: { status: 'success' } },
          ],
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tests/list',
          id: 1,
        }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.result.tests.length).toBe(3)
      expect(body.result.summary.total).toBe(3)
    })

    it('collects tests from MCP tools', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'fetchUser',
          description: 'Fetches user data',
          inputSchema: {
            type: 'object',
            properties: { userId: { type: 'string' } },
            required: ['userId'],
          },
          tests: [
            {
              name: 'fetch existing user',
              input: { userId: 'user-123' },
              expect: { status: 'success', output: { id: 'user-123', name: 'John' }, match: 'partial' },
            },
            {
              name: 'fetch non-existent user',
              input: { userId: 'unknown' },
              expect: { status: 'error', error: { code: 'NOT_FOUND' } },
            },
          ],
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tests/list', id: 1 }),
      })

      const body = await res.json()
      expect(body.result.tests).toHaveLength(2)

      const [test1, test2] = body.result.tests
      expect(test1.type).toBe('mcp')
      expect(test1.method).toBe('fetchUser')
      expect(test1.input).toEqual({ userId: 'user-123' })
      expect(test1.expect.status).toBe('success')

      expect(test2.expect.status).toBe('error')
      expect(test2.expect.error.code).toBe('NOT_FOUND')
    })

    it('collects tests from REST endpoints config', async () => {
      const testing: TestingConfig = {
        enabled: true,
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            tests: [
              {
                name: 'list users',
                expect: { status: 200, body: { data: [] }, match: 'partial' },
              },
            ],
          },
          {
            path: '/users/:id',
            method: 'GET',
            tests: [
              {
                name: 'get single user',
                request: { path: '/users/123' },
                expect: { status: 200 },
              },
              {
                name: 'user not found',
                request: { path: '/users/unknown' },
                expect: { status: 404 },
              },
            ],
          },
        ],
      }

      const app = API({
        name: 'test-api',
        testing,
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tests/list', id: 1 }),
      })

      const body = await res.json()
      expect(body.result.tests).toHaveLength(3)
      expect(body.result.summary.byType.rest).toBe(3)

      const restTest = body.result.tests[0]
      expect(restTest.type).toBe('rest')
      expect(restTest.request.method).toBe('GET')
      expect(restTest.request.path).toBe('/users')
    })
  })

  describe('examples/list JSON-RPC method', () => {
    it('returns examples from tools', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'formatDate',
          description: 'Formats a date',
          inputSchema: { type: 'object', properties: { date: { type: 'string' } } },
          examples: [
            { name: 'ISO format', input: { date: '2024-01-15' }, output: 'January 15, 2024' },
            { name: 'Short format', input: { date: '2024-01-15', format: 'short' }, output: '1/15/24' },
          ],
          handler: async () => ({}),
        },
        {
          name: 'capitalize',
          description: 'Capitalizes text',
          inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
          examples: [
            { name: 'simple word', input: { text: 'hello' }, output: 'Hello' },
          ],
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'examples/list', id: 1 }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.result.examples).toHaveLength(3)
      expect(body.result.examples[0].tool).toBe('formatDate')
      expect(body.result.examples[0].name).toBe('ISO format')
      expect(body.result.examples[0].input).toEqual({ date: '2024-01-15' })
      expect(body.result.examples[0].output).toBe('January 15, 2024')

      expect(body.result.examples[2].tool).toBe('capitalize')
    })
  })

  describe('schemas/list JSON-RPC method', () => {
    it('returns input/output schemas', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'createUser',
          description: 'Creates a new user',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
            },
            required: ['name', 'email'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          handler: async () => ({}),
        },
        {
          name: 'deleteUser',
          description: 'Deletes a user',
          inputSchema: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
          },
          // No outputSchema
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'schemas/list', id: 1 }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.result.schemas).toHaveLength(2)

      const createUserSchema = body.result.schemas.find((s: { tool: string }) => s.tool === 'createUser')
      expect(createUserSchema.inputSchema.properties.name.type).toBe('string')
      expect(createUserSchema.inputSchema.required).toContain('email')
      expect(createUserSchema.outputSchema.properties.id.type).toBe('string')

      const deleteUserSchema = body.result.schemas.find((s: { tool: string }) => s.tool === 'deleteUser')
      expect(deleteUserSchema.inputSchema.properties.id.type).toBe('string')
      expect(deleteUserSchema.outputSchema).toBeUndefined()
    })
  })

  describe('Test filtering', () => {
    const createAppWithTests = () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'toolA',
          description: 'Tool A',
          inputSchema: { type: 'object' },
          tests: [
            { id: 'test-001', name: 'A test 1', input: {}, expect: { status: 'success' }, tags: ['smoke', 'fast'] },
            { id: 'test-002', name: 'A test 2', input: {}, expect: { status: 'success' }, tags: ['regression'] },
          ],
          handler: async () => ({}),
        },
        {
          name: 'toolB',
          description: 'Tool B',
          inputSchema: { type: 'object' },
          tests: [
            { id: 'test-003', name: 'B test 1', input: {}, expect: { status: 'success' }, tags: ['smoke'] },
            { name: 'B test 2', input: {}, expect: { status: 'error' }, tags: ['slow', 'regression'] },
          ],
          handler: async () => ({}),
        },
      ]

      return API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })
    }

    it('filters tests by ID works', async () => {
      const app = createAppWithTests()

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tests/run',
          params: { ids: ['test-001', 'test-003'] },
          id: 1,
        }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.result.testsCount).toBe(2)
    })

    it('filters tests by tag works', async () => {
      const app = createAppWithTests()

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tests/run',
          params: { tags: ['smoke'] },
          id: 1,
        }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()

      // test-001 and test-003 have 'smoke' tag
      expect(body.result.testsCount).toBe(2)
    })

    it('combines ID and tag filters', async () => {
      const app = createAppWithTests()

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tests/run',
          params: { ids: ['test-001', 'test-002', 'test-003'], tags: ['smoke'] },
          id: 1,
        }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()

      // Only test-001 and test-003 match both ID filter AND tag filter
      expect(body.result.testsCount).toBe(2)
    })
  })

  describe('Unique test ID generation', () => {
    it('generates unique IDs for tests without explicit ID', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'myTool',
          description: 'My tool',
          inputSchema: { type: 'object' },
          tests: [
            { name: 'Test Case One', input: {}, expect: { status: 'success' } },
            { name: 'Test Case Two', input: {}, expect: { status: 'success' } },
          ],
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tests/list', id: 1 }),
      })

      const body = await res.json()
      const ids = body.result.tests.map((t: { id: string }) => t.id)

      // All IDs should be unique
      expect(new Set(ids).size).toBe(ids.length)

      // Generated IDs follow pattern: mcp.<toolName>.<test-name-kebab-case>
      expect(ids[0]).toBe('mcp.myTool.test-case-one')
      expect(ids[1]).toBe('mcp.myTool.test-case-two')
    })

    it('preserves explicit test IDs', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'myTool',
          description: 'My tool',
          inputSchema: { type: 'object' },
          tests: [
            { id: 'custom-id-123', name: 'Custom ID test', input: {}, expect: { status: 'success' } },
            { name: 'Auto ID test', input: {}, expect: { status: 'success' } },
          ],
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tests/list', id: 1 }),
      })

      const body = await res.json()
      const test1 = body.result.tests.find((t: { id: string }) => t.id === 'custom-id-123')
      const test2 = body.result.tests.find((t: { id: string }) => t.id === 'mcp.myTool.auto-id-test')

      expect(test1).toBeDefined()
      expect(test1.name).toBe('Custom ID test')

      expect(test2).toBeDefined()
      expect(test2.name).toBe('Auto ID test')
    })

    it('generates unique IDs for REST endpoint tests', async () => {
      const testing: TestingConfig = {
        enabled: true,
        endpoints: [
          {
            path: '/items',
            method: 'POST',
            tests: [
              { name: 'Create Item', expect: { status: 201 } },
            ],
          },
          {
            path: '/items/:id',
            method: 'DELETE',
            tests: [
              { id: 'delete-existing', name: 'Delete existing', expect: { status: 204 } },
              { name: 'Delete Not Found', expect: { status: 404 } },
            ],
          },
        ],
      }

      const app = API({
        name: 'test-api',
        testing,
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tests/list', id: 1 }),
      })

      const body = await res.json()
      const ids = body.result.tests.map((t: { id: string }) => t.id)

      expect(new Set(ids).size).toBe(ids.length)
      expect(ids).toContain('rest.POST./items.create-item')
      expect(ids).toContain('delete-existing')
      expect(ids).toContain('rest.DELETE./items/:id.delete-not-found')
    })
  })

  describe('Edge cases', () => {
    it('handles no tests configured', async () => {
      const app = API({
        name: 'test-api',
        testing: { enabled: true },
      })

      const res = await app.request('/qa')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.data.tests).toEqual([])
      expect(body.data.summary.total).toBe(0)
      expect(body.data.summary.byType.mcp).toBe(0)
      expect(body.data.summary.byType.rest).toBe(0)
      expect(body.data.summary.byType.rpc).toBe(0)
    })

    it('handles tools without tests array', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'toolWithoutTests',
          description: 'A tool without tests',
          inputSchema: { type: 'object' },
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tests/list', id: 1 }),
      })

      const body = await res.json()
      expect(body.result.tests).toEqual([])
      expect(body.result.summary.total).toBe(0)
    })

    it('handles tools with empty tests array', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'toolWithEmptyTests',
          description: 'A tool with empty tests',
          inputSchema: { type: 'object' },
          tests: [],
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tests/list', id: 1 }),
      })

      const body = await res.json()
      expect(body.result.tests).toEqual([])
    })

    it('handles REST endpoints with empty tests array', async () => {
      const testing: TestingConfig = {
        enabled: true,
        endpoints: [
          { path: '/health', method: 'GET', tests: [] },
          { path: '/items', method: 'GET' }, // No tests property
        ],
      }

      const app = API({
        name: 'test-api',
        testing,
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tests/list', id: 1 }),
      })

      const body = await res.json()
      expect(body.result.tests).toEqual([])
    })

    it('handles tools without examples', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'noExamples',
          description: 'Tool without examples',
          inputSchema: { type: 'object' },
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'examples/list', id: 1 }),
      })

      const body = await res.json()
      expect(body.result.examples).toEqual([])
    })

    it('handles tools with empty examples array', async () => {
      const tools: ExtendedMcpTool[] = [
        {
          name: 'emptyExamples',
          description: 'Tool with empty examples',
          inputSchema: { type: 'object' },
          examples: [],
          handler: async () => ({}),
        },
      ]

      const app = API({
        name: 'test-api',
        mcp: { name: 'test-mcp', tools },
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'examples/list', id: 1 }),
      })

      const body = await res.json()
      expect(body.result.examples).toEqual([])
    })

    it('returns empty schemas when no tools configured', async () => {
      const app = API({
        name: 'test-api',
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'schemas/list', id: 1 }),
      })

      const body = await res.json()
      expect(body.result.schemas).toEqual([])
    })

    it('does not expose /qa when testing is disabled', async () => {
      const app = API({
        name: 'test-api',
        testing: { enabled: false },
      })

      const res = await app.request('/qa')
      expect(res.status).toBe(404)
    })

    it('does not expose /qa when testing config is not provided', async () => {
      const app = API({
        name: 'test-api',
      })

      const res = await app.request('/qa')
      expect(res.status).toBe(404)
    })

    it('handles invalid JSON-RPC request', async () => {
      const app = API({
        name: 'test-api',
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'tests/list', id: 1 }), // Missing jsonrpc
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe(-32600)
      expect(body.error.message).toBe('Invalid Request')
    })

    it('handles unknown JSON-RPC method', async () => {
      const app = API({
        name: 'test-api',
        testing: { enabled: true },
      })

      const res = await app.request('/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'unknown/method', id: 1 }),
      })

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error.message).toContain('Unknown method')
    })

    it('uses custom endpoint path when configured', async () => {
      const app = API({
        name: 'test-api',
        testing: { enabled: true, endpoint: '/testing' },
      })

      // Default path should not work
      const resDefault = await app.request('/qa')
      expect(resDefault.status).toBe(404)

      // Custom path should work
      const res = await app.request('/testing')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.data.tests).toEqual([])
    })
  })
})
