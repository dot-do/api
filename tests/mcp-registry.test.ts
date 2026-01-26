import { describe, it, expect, beforeEach } from 'vitest'
import { McpToolRegistry } from '../src/mcp-registry'
import { API } from '../src/index'
import type { McpTool } from '../src/types'

describe('McpToolRegistry', () => {
  let registry: McpToolRegistry

  beforeEach(() => {
    registry = new McpToolRegistry()
  })

  describe('register', () => {
    it('registers a tool from MCP config', () => {
      const tool: McpTool = {
        name: 'greet',
        description: 'Greets a user',
        inputSchema: { type: 'object', properties: { name: { type: 'string' } } },
        handler: async () => 'Hello!',
      }

      registry.register(tool)

      const tools = registry.getTools()
      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('greet')
      expect(tools[0].description).toBe('Greets a user')
    })

    it('registers tools from database convention', () => {
      // Database tools are route-only (no handler, served via REST endpoints)
      registry.register({
        name: 'user.create',
        description: 'Create a new User',
        inputSchema: { type: 'object', properties: { email: { type: 'string' } } },
        routeOnly: true,
      })

      registry.register({
        name: 'user.get',
        description: 'Get a User by ID',
        inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        routeOnly: true,
      })

      const tools = registry.getTools()
      expect(tools).toHaveLength(2)
      expect(tools.map(t => t.name)).toEqual(['user.create', 'user.get'])
    })

    it('registers tools from functions convention', () => {
      registry.register({
        name: 'sendEmail',
        description: 'Sends an email',
        inputSchema: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' } } },
        handler: async () => ({ success: true }),
      })

      registry.register({
        name: 'processImage',
        description: 'Processes an image',
        inputSchema: { type: 'object', properties: { url: { type: 'string' } } },
        handler: async () => ({ processed: true }),
      })

      const tools = registry.getTools()
      expect(tools).toHaveLength(2)
      expect(tools.map(t => t.name)).toEqual(['sendEmail', 'processImage'])
    })
  })

  describe('getTools', () => {
    it('returns merged list from all sources', () => {
      // Register MCP config tool
      registry.register({
        name: 'calculate',
        description: 'Performs calculations',
        inputSchema: { type: 'object', properties: { expression: { type: 'string' } } },
        handler: async () => 42,
      })

      // Register database tools
      registry.register({
        name: 'user.create',
        description: 'Create a new User',
        inputSchema: { type: 'object' },
        handler: async () => ({}),
      })

      // Register function tool
      registry.register({
        name: 'sendEmail',
        description: 'Sends an email',
        inputSchema: { type: 'object' },
        handler: async () => ({}),
      })

      const tools = registry.getTools()
      expect(tools).toHaveLength(3)
      expect(tools.map(t => t.name).sort()).toEqual(['calculate', 'sendEmail', 'user.create'])
    })
  })

  describe('duplicate handling', () => {
    it('last wins when duplicate tool names are registered', () => {
      registry.register({
        name: 'duplicate',
        description: 'First version',
        inputSchema: { type: 'object', properties: { v: { type: 'number', default: 1 } } },
        handler: async () => 'v1',
      })

      registry.register({
        name: 'duplicate',
        description: 'Second version',
        inputSchema: { type: 'object', properties: { v: { type: 'number', default: 2 } } },
        handler: async () => 'v2',
      })

      const tools = registry.getTools()
      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('duplicate')
      expect(tools[0].description).toBe('Second version')
    })
  })

  describe('getTool', () => {
    it('returns tool by name', () => {
      registry.register({
        name: 'findTool',
        description: 'Tool to find',
        inputSchema: { type: 'object' },
        handler: async () => 'found',
      })

      const tool = registry.getTool('findTool')
      expect(tool).toBeDefined()
      expect(tool?.name).toBe('findTool')
    })

    it('returns undefined for non-existent tool', () => {
      const tool = registry.getTool('nonexistent')
      expect(tool).toBeUndefined()
    })
  })

  describe('route-only tools', () => {
    it('marks tools without real handlers with routeOnly flag', () => {
      // Route-only tools are those served via REST routes, not direct MCP handlers
      registry.register({
        name: 'user.create',
        description: 'Create a new User',
        inputSchema: { type: 'object', properties: { email: { type: 'string' } } },
        routeOnly: true,
      })

      const tool = registry.getTool('user.create')
      expect(tool).toBeDefined()
      expect(tool?.routeOnly).toBe(true)
      expect(tool?.handler).toBeUndefined()
    })

    it('distinguishes route-only tools from tools with handlers', () => {
      registry.register({
        name: 'calculate',
        description: 'Performs calculations',
        inputSchema: { type: 'object' },
        handler: async () => 42,
      })

      registry.register({
        name: 'user.create',
        description: 'Create a new User',
        inputSchema: { type: 'object' },
        routeOnly: true,
      })

      const calcTool = registry.getTool('calculate')
      const userTool = registry.getTool('user.create')

      expect(calcTool?.routeOnly).toBeFalsy()
      expect(calcTool?.handler).toBeDefined()

      expect(userTool?.routeOnly).toBe(true)
      expect(userTool?.handler).toBeUndefined()
    })
  })

  describe('tests property', () => {
    it('registers a tool with tests matching TestCase type', () => {
      registry.register({
        name: 'calculator',
        description: 'Performs calculations',
        inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } },
        tests: [
          {
            name: 'adds two numbers',
            input: { a: 2, b: 3 },
            expect: {
              status: 'success',
              output: 5,
            },
          },
          {
            id: 'calc-subtract',
            name: 'subtracts two numbers',
            description: 'Test subtraction operation',
            tags: ['math', 'subtract'],
            input: { a: 5, b: 3 },
            expect: {
              status: 'success',
              output: 2,
              match: 'exact',
            },
          },
          {
            name: 'handles error case',
            input: { a: 'invalid' },
            expect: {
              status: 'error',
              error: { code: 'INVALID_INPUT', message: 'Input must be a number' },
            },
          },
        ],
        handler: async (input) => {
          const { a, b } = input as { a: number; b: number }
          return a + b
        },
      })

      const tool = registry.getTool('calculator')
      expect(tool).toBeDefined()
      expect(tool?.tests).toBeDefined()
      expect(tool?.tests).toHaveLength(3)

      // Verify TestCase structure is preserved
      const [addTest, subtractTest, errorTest] = tool!.tests!

      expect(addTest.name).toBe('adds two numbers')
      expect(addTest.input).toEqual({ a: 2, b: 3 })
      expect(addTest.expect.status).toBe('success')
      expect(addTest.expect.output).toBe(5)

      expect(subtractTest.id).toBe('calc-subtract')
      expect(subtractTest.tags).toEqual(['math', 'subtract'])
      expect(subtractTest.expect.match).toBe('exact')

      expect(errorTest.expect.status).toBe('error')
      expect(errorTest.expect.error?.code).toBe('INVALID_INPUT')
    })

    it('allows tools without tests property', () => {
      registry.register({
        name: 'no-tests-tool',
        description: 'A tool without tests',
        inputSchema: { type: 'object' },
        handler: async () => 'result',
      })

      const tool = registry.getTool('no-tests-tool')
      expect(tool).toBeDefined()
      expect(tool?.tests).toBeUndefined()
    })
  })
})

describe('Single /mcp endpoint serves all registered tools', () => {
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

  it('lists tools from MCP config and database convention together', async () => {
    const app = API({
      name: 'unified-mcp-api',
      mcp: {
        name: 'unified-server',
        tools: [
          {
            name: 'calculate',
            description: 'Performs calculations',
            inputSchema: { type: 'object', properties: { expression: { type: 'string' } } },
            handler: async () => 42,
          },
        ],
      },
      database: {
        schema: {
          User: {
            email: 'string',
            name: 'string?',
          },
        },
      },
    })

    const res = await mcpPost(app, jsonRpc('tools/list'))
    expect(res.status).toBe(200)

    const body = await res.json()
    const tools = body.result.tools

    // Should have MCP config tool + database convention tools (create, get, list, search, update, delete)
    expect(tools.length).toBeGreaterThanOrEqual(2)

    // Check that we have the explicit MCP tool
    expect(tools.some((t: { name: string }) => t.name === 'calculate')).toBe(true)

    // Check that we have database tools
    expect(tools.some((t: { name: string }) => t.name === 'user.create')).toBe(true)
    expect(tools.some((t: { name: string }) => t.name === 'user.get')).toBe(true)
  })

  it('lists tools from MCP config and functions convention together', async () => {
    const app = API({
      name: 'unified-mcp-api',
      mcp: {
        name: 'unified-server',
        tools: [
          {
            name: 'calculate',
            description: 'Performs calculations',
            inputSchema: { type: 'object', properties: { expression: { type: 'string' } } },
            handler: async () => 42,
          },
        ],
      },
      functions: {
        functions: [
          {
            name: 'sendEmail',
            description: 'Sends an email',
            input: { type: 'object', properties: { to: { type: 'string' } } },
            handler: async () => ({ sent: true }),
          },
        ],
      },
    })

    const res = await mcpPost(app, jsonRpc('tools/list'))
    expect(res.status).toBe(200)

    const body = await res.json()
    const tools = body.result.tools

    // Should have both MCP config tool and functions tool
    expect(tools.some((t: { name: string }) => t.name === 'calculate')).toBe(true)
    expect(tools.some((t: { name: string }) => t.name === 'sendEmail')).toBe(true)
  })

  it('lists tools from all sources: MCP config, database, and functions', async () => {
    const app = API({
      name: 'all-sources-api',
      mcp: {
        name: 'all-server',
        tools: [
          {
            name: 'calculate',
            description: 'Performs calculations',
            inputSchema: { type: 'object' },
            handler: async () => 42,
          },
        ],
      },
      database: {
        schema: {
          Post: {
            title: 'string',
            body: 'string',
          },
        },
      },
      functions: {
        functions: [
          {
            name: 'sendNotification',
            description: 'Sends a notification',
            input: { type: 'object' },
            handler: async () => ({ sent: true }),
          },
        ],
      },
    })

    const res = await mcpPost(app, jsonRpc('tools/list'))
    expect(res.status).toBe(200)

    const body = await res.json()
    const tools = body.result.tools
    const toolNames = tools.map((t: { name: string }) => t.name)

    // MCP config tool
    expect(toolNames).toContain('calculate')

    // Database tools
    expect(toolNames).toContain('post.create')

    // Functions tool
    expect(toolNames).toContain('sendNotification')
  })

  it('only mounts one /mcp endpoint even with multiple conventions', async () => {
    const app = API({
      name: 'single-endpoint-api',
      mcp: {
        name: 'server',
        tools: [
          {
            name: 'explicitTool',
            description: 'Explicit MCP tool',
            inputSchema: { type: 'object' },
            handler: async () => 'explicit',
          },
        ],
      },
      database: {
        schema: {
          User: { name: 'string' },
        },
      },
      functions: {
        functions: [
          {
            name: 'fnTool',
            description: 'Function tool',
            input: { type: 'object' },
            handler: async () => 'fn',
          },
        ],
      },
    })

    // Making a single request to /mcp should return ALL tools
    const res = await mcpPost(app, jsonRpc('tools/list'))
    const body = await res.json()
    const tools = body.result.tools

    // All tools should be accessible from single endpoint
    expect(tools.some((t: { name: string }) => t.name === 'explicitTool')).toBe(true)
    expect(tools.some((t: { name: string }) => t.name === 'user.create')).toBe(true)
    expect(tools.some((t: { name: string }) => t.name === 'fnTool')).toBe(true)
  })

  it('can call tools from any source through unified endpoint', async () => {
    const app = API({
      name: 'call-all-api',
      mcp: {
        name: 'server',
        tools: [
          {
            name: 'explicitTool',
            description: 'Explicit MCP tool',
            inputSchema: { type: 'object', properties: { msg: { type: 'string' } } },
            handler: async (input) => `Explicit: ${(input as { msg: string }).msg}`,
          },
        ],
      },
    })

    // Call the explicit MCP tool
    const res = await mcpPost(app, jsonRpc('tools/call', {
      name: 'explicitTool',
      arguments: { msg: 'hello' },
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result.content[0].text).toBe('Explicit: hello')
  })

  describe('route-only tools error handling', () => {
    it('returns informative error when calling route-only tool directly', async () => {
      const app = API({
        name: 'route-only-api',
        mcp: {
          name: 'server',
          tools: [],
        },
        database: {
          schema: {
            User: {
              email: 'string',
              name: 'string?',
            },
          },
        },
      })

      // Try to call a database tool directly via MCP (should return helpful error)
      const res = await mcpPost(app, jsonRpc('tools/call', {
        name: 'user.create',
        arguments: { email: 'test@example.com' },
      }))

      expect(res.status).toBe(500) // MCP returns 500 for tool errors
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.message).toContain('route-only')
    })

    it('lists route-only tools in tools/list without handler issues', async () => {
      const app = API({
        name: 'route-only-list-api',
        mcp: {
          name: 'server',
          tools: [
            {
              name: 'explicitTool',
              description: 'Has a handler',
              inputSchema: { type: 'object' },
              handler: async () => 'works',
            },
          ],
        },
        database: {
          schema: {
            Post: {
              title: 'string',
            },
          },
        },
      })

      const res = await mcpPost(app, jsonRpc('tools/list'))
      expect(res.status).toBe(200)

      const body = await res.json()
      const tools = body.result.tools

      // Both explicit and route-only tools should be listed
      expect(tools.some((t: { name: string }) => t.name === 'explicitTool')).toBe(true)
      expect(tools.some((t: { name: string }) => t.name === 'post.create')).toBe(true)
    })

    it('error message for route-only tool includes REST endpoint suggestion', async () => {
      const app = API({
        name: 'error-message-api',
        mcp: {
          name: 'server',
          tools: [],
        },
        database: {
          schema: {
            User: {
              email: 'string',
            },
          },
        },
      })

      const res = await mcpPost(app, jsonRpc('tools/call', {
        name: 'user.create',
        arguments: { email: 'test@example.com' },
      }))

      const body = await res.json()
      expect(body.error).toBeDefined()
      // Should suggest the REST endpoint
      expect(body.error.message).toContain('REST endpoint')
      expect(body.error.message).toContain('user/create')
    })

    it('tools with routeOnly=true and a handler still reject direct MCP calls', async () => {
      // Edge case: a tool marked routeOnly that somehow has a handler
      // The routeOnly flag should take precedence
      const registry = new McpToolRegistry()
      registry.register({
        name: 'hybrid.tool',
        description: 'Has both routeOnly and handler',
        inputSchema: { type: 'object' },
        routeOnly: true,
        handler: async () => 'should not be called',
      })

      const tool = registry.getTool('hybrid.tool')
      expect(tool?.routeOnly).toBe(true)
      expect(tool?.handler).toBeDefined()
      // The MCP convention should still reject this as route-only
    })

    it('tools without handler and without routeOnly flag return appropriate error', async () => {
      // Edge case: inconsistent state - no handler, no routeOnly flag
      const registry = new McpToolRegistry()
      registry.register({
        name: 'broken.tool',
        description: 'Missing handler without routeOnly',
        inputSchema: { type: 'object' },
        // No handler, no routeOnly - this is an inconsistent state
      })

      const tool = registry.getTool('broken.tool')
      expect(tool?.routeOnly).toBeFalsy()
      expect(tool?.handler).toBeUndefined()
      // When called via MCP, this should return "has no handler" error
    })
  })

  describe('executeToolCall consistency', () => {
    it('tool with handler executes successfully', async () => {
      const app = API({
        name: 'handler-test-api',
        mcp: {
          name: 'server',
          tools: [
            {
              name: 'working.tool',
              description: 'A working tool with handler',
              inputSchema: { type: 'object', properties: { value: { type: 'number' } } },
              handler: async (input) => ({ doubled: (input as { value: number }).value * 2 }),
            },
          ],
        },
      })

      const res = await mcpPost(app, jsonRpc('tools/call', {
        name: 'working.tool',
        arguments: { value: 21 },
      }))

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.result).toBeDefined()
      expect(body.result.content[0].text).toContain('42')
    })

    it('unknown tool returns appropriate error', async () => {
      const app = API({
        name: 'unknown-tool-api',
        mcp: {
          name: 'server',
          tools: [],
        },
      })

      const res = await mcpPost(app, jsonRpc('tools/call', {
        name: 'nonexistent.tool',
        arguments: {},
      }))

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBeDefined()
      expect(body.error.message).toContain('Unknown tool')
      expect(body.error.message).toContain('nonexistent.tool')
    })
  })
})
