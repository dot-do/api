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
  })
})
