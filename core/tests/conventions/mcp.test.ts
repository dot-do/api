import { describe, it, expect, vi } from 'vitest'
import { API } from '../../src/index'
import type { McpConfig, McpTool, McpResource } from '../../src/types'

describe('MCP convention', () => {
  // Helper to create a JSON-RPC request
  const jsonRpc = (method: string, params?: unknown, id: string | number = 1) => ({
    jsonrpc: '2.0',
    method,
    params,
    id,
  })

  // Helper to make MCP POST request
  const mcpPost = async (app: ReturnType<typeof API>, body: object) => {
    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res
  }

  describe('initialize', () => {
    it('returns server info and capabilities', async () => {
      const config: McpConfig = {
        name: 'test-mcp-server',
        version: '2.0.0',
        tools: [
          {
            name: 'greet',
            description: 'Greets a user',
            inputSchema: { type: 'object', properties: { name: { type: 'string' } } },
            handler: async () => 'Hello!',
          },
        ],
        resources: [
          {
            uri: 'resource://config',
            name: 'config',
            description: 'App configuration',
            handler: async () => ({ key: 'value' }),
          },
        ],
      }

      const app = API({ name: 'mcp-api', mcp: config })
      const res = await mcpPost(app, jsonRpc('initialize'))

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.jsonrpc).toBe('2.0')
      expect(body.id).toBe(1)
      expect(body.result).toMatchObject({
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: {
          name: 'test-mcp-server',
          version: '2.0.0',
        },
      })
    })

    it('uses default version 1.0.0 when not specified', async () => {
      const config: McpConfig = {
        name: 'default-version-server',
        tools: [],
      }

      const app = API({ name: 'mcp-api', mcp: config })
      const res = await mcpPost(app, jsonRpc('initialize'))

      const body = await res.json()
      expect(body.result.serverInfo.version).toBe('1.0.0')
    })

    it('omits capabilities when tools/resources are empty', async () => {
      const config: McpConfig = {
        name: 'empty-server',
      }

      const app = API({ name: 'mcp-api', mcp: config })
      const res = await mcpPost(app, jsonRpc('initialize'))

      const body = await res.json()
      expect(body.result.capabilities.tools).toBeUndefined()
      expect(body.result.capabilities.resources).toBeUndefined()
    })
  })

  describe('tools/list', () => {
    it('returns configured tools with name, description, inputSchema', async () => {
      const tools: McpTool[] = [
        {
          name: 'calculate',
          description: 'Performs calculations',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string' },
            },
            required: ['expression'],
          },
          handler: async () => 42,
        },
        {
          name: 'search',
          description: 'Searches documents',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' },
            },
          },
          handler: async () => [],
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'tools-server', tools } })
      const res = await mcpPost(app, jsonRpc('tools/list'))

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.result.tools).toHaveLength(2)
      expect(body.result.tools[0]).toMatchObject({
        name: 'calculate',
        description: 'Performs calculations',
        inputSchema: {
          type: 'object',
          properties: { expression: { type: 'string' } },
          required: ['expression'],
        },
      })
      expect(body.result.tools[1]).toMatchObject({
        name: 'search',
        description: 'Searches documents',
      })
    })

    it('includes outputSchema, examples, tests when present', async () => {
      const tools: McpTool[] = [
        {
          name: 'enriched-tool',
          description: 'A fully configured tool',
          inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
          outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
          examples: [
            { name: 'basic usage', input: { input: 'test' }, output: { result: 'processed' } },
          ],
          tests: [
            {
              name: 'success case',
              input: { input: 'hello' },
              expect: { status: 'success', output: { result: 'hello processed' } },
            },
          ],
          handler: async (input: unknown) => ({ result: `${(input as { input: string }).input} processed` }),
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'enriched-server', tools } })
      const res = await mcpPost(app, jsonRpc('tools/list'))

      const body = await res.json()
      const tool = body.result.tools[0]

      expect(tool.outputSchema).toEqual({
        type: 'object',
        properties: { result: { type: 'string' } },
      })
      expect(tool.examples).toEqual([
        { name: 'basic usage', input: { input: 'test' }, output: { result: 'processed' } },
      ])
      expect(tool.tests).toEqual([
        {
          name: 'success case',
          input: { input: 'hello' },
          expect: { status: 'success', output: { result: 'hello processed' } },
        },
      ])
    })

    it('returns empty tools array when no tools configured', async () => {
      const app = API({ name: 'mcp-api', mcp: { name: 'empty-server' } })
      const res = await mcpPost(app, jsonRpc('tools/list'))

      const body = await res.json()
      expect(body.result.tools).toEqual([])
    })

    it('does not include optional fields when not provided', async () => {
      const tools: McpTool[] = [
        {
          name: 'minimal-tool',
          description: 'Minimal configuration',
          inputSchema: { type: 'object' },
          handler: async () => 'done',
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'minimal-server', tools } })
      const res = await mcpPost(app, jsonRpc('tools/list'))

      const body = await res.json()
      const tool = body.result.tools[0]

      expect(tool).not.toHaveProperty('outputSchema')
      expect(tool).not.toHaveProperty('examples')
      expect(tool).not.toHaveProperty('tests')
    })
  })

  describe('tools/call', () => {
    it('executes tool handler with correct arguments', async () => {
      const handler = vi.fn().mockResolvedValue({ sum: 15 })
      const tools: McpTool[] = [
        {
          name: 'add',
          description: 'Adds numbers',
          inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } },
          handler,
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'calc-server', tools } })
      const res = await mcpPost(app, jsonRpc('tools/call', { name: 'add', arguments: { a: 5, b: 10 } }))

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(handler).toHaveBeenCalledWith({ a: 5, b: 10 }, expect.anything())
      expect(body.result).toEqual({
        content: [{ type: 'text', text: '{"sum":15}' }],
      })
    })

    it('returns string result directly', async () => {
      const tools: McpTool[] = [
        {
          name: 'greet',
          description: 'Greets user',
          inputSchema: { type: 'object' },
          handler: async () => 'Hello, World!',
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'greet-server', tools } })
      const res = await mcpPost(app, jsonRpc('tools/call', { name: 'greet', arguments: {} }))

      const body = await res.json()
      expect(body.result.content[0].text).toBe('Hello, World!')
    })

    it('returns error for unknown tool', async () => {
      const app = API({
        name: 'mcp-api',
        mcp: {
          name: 'server',
          tools: [
            {
              name: 'existing-tool',
              description: 'Exists',
              inputSchema: { type: 'object' },
              handler: async () => 'ok',
            },
          ],
        },
      })

      const res = await mcpPost(app, jsonRpc('tools/call', { name: 'nonexistent', arguments: {} }))

      expect(res.status).toBe(500)
      const body = await res.json()

      expect(body.error).toBeDefined()
      expect(body.error.code).toBe(-32603)
      expect(body.error.message).toBe('Unknown tool: nonexistent')
    })

    it('handles handler errors gracefully', async () => {
      const tools: McpTool[] = [
        {
          name: 'failing-tool',
          description: 'Always fails',
          inputSchema: { type: 'object' },
          handler: async () => {
            throw new Error('Something went wrong')
          },
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'error-server', tools } })
      const res = await mcpPost(app, jsonRpc('tools/call', { name: 'failing-tool', arguments: {} }))

      expect(res.status).toBe(500)
      const body = await res.json()

      expect(body.error).toBeDefined()
      expect(body.error.code).toBe(-32603)
      expect(body.error.message).toBe('Something went wrong')
    })

    it('includes error code in data when present', async () => {
      const tools: McpTool[] = [
        {
          name: 'coded-error-tool',
          description: 'Throws error with code',
          inputSchema: { type: 'object' },
          handler: async () => {
            const error = new Error('Validation failed') as Error & { code: string }
            error.code = 'VALIDATION_ERROR'
            throw error
          },
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'coded-error-server', tools } })
      const res = await mcpPost(app, jsonRpc('tools/call', { name: 'coded-error-tool', arguments: {} }))

      const body = await res.json()
      expect(body.error.data).toEqual({ code: 'VALIDATION_ERROR' })
    })
  })

  describe('resources/list', () => {
    it('returns configured resources', async () => {
      const resources: McpResource[] = [
        {
          uri: 'resource://settings',
          name: 'settings',
          description: 'Application settings',
          mimeType: 'application/json',
          handler: async () => ({ theme: 'dark' }),
        },
        {
          uri: 'file://readme.txt',
          name: 'readme',
          description: 'Readme file',
          mimeType: 'text/plain',
          handler: async () => 'Hello',
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'resource-server', resources } })
      const res = await mcpPost(app, jsonRpc('resources/list'))

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.result.resources).toHaveLength(2)
      expect(body.result.resources[0]).toEqual({
        uri: 'resource://settings',
        name: 'settings',
        description: 'Application settings',
        mimeType: 'application/json',
      })
      expect(body.result.resources[1]).toEqual({
        uri: 'file://readme.txt',
        name: 'readme',
        description: 'Readme file',
        mimeType: 'text/plain',
      })
    })

    it('uses default mimeType application/json when not specified', async () => {
      const resources: McpResource[] = [
        {
          uri: 'resource://data',
          name: 'data',
          handler: async () => ({}),
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'default-mime-server', resources } })
      const res = await mcpPost(app, jsonRpc('resources/list'))

      const body = await res.json()
      expect(body.result.resources[0].mimeType).toBe('application/json')
    })

    it('returns empty resources array when no resources configured', async () => {
      const app = API({ name: 'mcp-api', mcp: { name: 'no-resources-server' } })
      const res = await mcpPost(app, jsonRpc('resources/list'))

      const body = await res.json()
      expect(body.result.resources).toEqual([])
    })
  })

  describe('resources/read', () => {
    it('returns resource content as JSON', async () => {
      const resources: McpResource[] = [
        {
          uri: 'resource://config',
          name: 'config',
          mimeType: 'application/json',
          handler: async () => ({ database: 'postgres', port: 5432 }),
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'content-server', resources } })
      const res = await mcpPost(app, jsonRpc('resources/read', { uri: 'resource://config' }))

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.result.contents).toHaveLength(1)
      expect(body.result.contents[0]).toEqual({
        uri: 'resource://config',
        mimeType: 'application/json',
        text: '{"database":"postgres","port":5432}',
      })
    })

    it('returns string content directly', async () => {
      const resources: McpResource[] = [
        {
          uri: 'file://readme.md',
          name: 'readme',
          mimeType: 'text/markdown',
          handler: async () => '# Welcome\n\nThis is a readme.',
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'text-server', resources } })
      const res = await mcpPost(app, jsonRpc('resources/read', { uri: 'file://readme.md' }))

      const body = await res.json()
      expect(body.result.contents[0].text).toBe('# Welcome\n\nThis is a readme.')
      expect(body.result.contents[0].mimeType).toBe('text/markdown')
    })

    it('returns error for unknown resource', async () => {
      const app = API({
        name: 'mcp-api',
        mcp: {
          name: 'server',
          resources: [
            {
              uri: 'resource://existing',
              name: 'existing',
              handler: async () => ({}),
            },
          ],
        },
      })

      const res = await mcpPost(app, jsonRpc('resources/read', { uri: 'resource://missing' }))

      expect(res.status).toBe(500)
      const body = await res.json()

      expect(body.error).toBeDefined()
      expect(body.error.code).toBe(-32603)
      expect(body.error.message).toBe('Unknown resource: resource://missing')
    })
  })

  describe('error handling', () => {
    it('returns -32601 error for unknown method', async () => {
      const app = API({ name: 'mcp-api', mcp: { name: 'server' } })
      const res = await mcpPost(app, jsonRpc('unknown/method'))

      expect(res.status).toBe(500)
      const body = await res.json()

      expect(body.error).toBeDefined()
      expect(body.error.code).toBe(-32603)
      expect(body.error.message).toBe('Unknown method: unknown/method')
    })

    it('returns -32600 error for invalid request (missing jsonrpc)', async () => {
      const app = API({ name: 'mcp-api', mcp: { name: 'server' } })
      const res = await app.request('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'initialize', id: 1 }),
      })

      expect(res.status).toBe(400)
      const body = await res.json()

      expect(body.error.code).toBe(-32600)
      expect(body.error.message).toBe('Invalid Request')
    })

    it('returns -32600 error for invalid request (missing method)', async () => {
      const app = API({ name: 'mcp-api', mcp: { name: 'server' } })
      const res = await app.request('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1 }),
      })

      expect(res.status).toBe(400)
      const body = await res.json()

      expect(body.error.code).toBe(-32600)
      expect(body.error.message).toBe('Invalid Request')
    })

    it('preserves request id in response', async () => {
      const app = API({ name: 'mcp-api', mcp: { name: 'server' } })

      // Test with numeric id
      const res1 = await mcpPost(app, jsonRpc('initialize', undefined, 42))
      const body1 = await res1.json()
      expect(body1.id).toBe(42)

      // Test with string id
      const res2 = await mcpPost(app, jsonRpc('initialize', undefined, 'request-123'))
      const body2 = await res2.json()
      expect(body2.id).toBe('request-123')
    })
  })

  describe('GET /mcp endpoint', () => {
    it('returns server info via GET request', async () => {
      const config: McpConfig = {
        name: 'get-info-server',
        version: '1.5.0',
        tools: [
          { name: 'tool1', description: 'First tool', inputSchema: {}, handler: async () => null },
        ],
        resources: [
          { uri: 'res://1', name: 'Resource 1', description: 'First resource', handler: async () => null },
        ],
      }

      const app = API({ name: 'mcp-api', mcp: config })
      const res = await app.request('/mcp')

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.data).toMatchObject({
        name: 'get-info-server',
        version: '1.5.0',
        capabilities: {
          tools: [{ name: 'tool1', description: 'First tool' }],
          resources: [{ uri: 'res://1', name: 'Resource 1', description: 'First resource' }],
        },
      })
    })
  })

  describe('edge cases', () => {
    it('handles empty tools array', async () => {
      const app = API({ name: 'mcp-api', mcp: { name: 'empty-tools', tools: [] } })

      const initRes = await mcpPost(app, jsonRpc('initialize'))
      const initBody = await initRes.json()
      expect(initBody.result.capabilities.tools).toBeUndefined()

      const listRes = await mcpPost(app, jsonRpc('tools/list'))
      const listBody = await listRes.json()
      expect(listBody.result.tools).toEqual([])
    })

    it('handles empty resources array', async () => {
      const app = API({ name: 'mcp-api', mcp: { name: 'empty-resources', resources: [] } })

      const initRes = await mcpPost(app, jsonRpc('initialize'))
      const initBody = await initRes.json()
      expect(initBody.result.capabilities.resources).toBeUndefined()

      const listRes = await mcpPost(app, jsonRpc('resources/list'))
      const listBody = await listRes.json()
      expect(listBody.result.resources).toEqual([])
    })

    it('handles tools/call with undefined arguments', async () => {
      const handler = vi.fn().mockResolvedValue('ok')
      const tools: McpTool[] = [
        {
          name: 'no-args-tool',
          description: 'No arguments needed',
          inputSchema: { type: 'object' },
          handler,
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'no-args-server', tools } })
      const res = await mcpPost(app, jsonRpc('tools/call', { name: 'no-args-tool' }))

      const body = await res.json()
      expect(res.status).toBe(200)
      expect(handler).toHaveBeenCalledWith(undefined, expect.anything())
      expect(body.result.content[0].text).toBe('ok')
    })

    it('handles tool returning null', async () => {
      const tools: McpTool[] = [
        {
          name: 'null-tool',
          description: 'Returns null',
          inputSchema: { type: 'object' },
          handler: async () => null,
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'null-server', tools } })
      const res = await mcpPost(app, jsonRpc('tools/call', { name: 'null-tool', arguments: {} }))

      const body = await res.json()
      expect(body.result.content[0].text).toBe('null')
    })

    it('handles resource returning null', async () => {
      const resources: McpResource[] = [
        {
          uri: 'resource://null',
          name: 'null-resource',
          handler: async () => null,
        },
      ]

      const app = API({ name: 'mcp-api', mcp: { name: 'null-resource-server', resources } })
      const res = await mcpPost(app, jsonRpc('resources/read', { uri: 'resource://null' }))

      const body = await res.json()
      expect(body.result.contents[0].text).toBe('null')
    })

    it('handles tools/call when no tools are configured', async () => {
      const app = API({ name: 'mcp-api', mcp: { name: 'no-tools-server' } })
      const res = await mcpPost(app, jsonRpc('tools/call', { name: 'any-tool', arguments: {} }))

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error.message).toBe('Unknown tool: any-tool')
    })

    it('handles resources/read when no resources are configured', async () => {
      const app = API({ name: 'mcp-api', mcp: { name: 'no-resources-server' } })
      const res = await mcpPost(app, jsonRpc('resources/read', { uri: 'resource://any' }))

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error.message).toBe('Unknown resource: resource://any')
    })
  })
})
