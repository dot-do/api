/**
 * test.example.com.ai - Self-testing API example
 *
 * Demonstrates the api.qa testing framework with:
 * - CRUD convention with embedded tests
 * - MCP tools with embedded tests
 * - Custom routes with tests
 * - /qa endpoint for test discovery
 */

import { API } from 'api.do'
import type { Context } from 'hono'

// In-memory store for demo (would use D1 in production)
const store: Record<string, Record<string, unknown>> = {
  items: {},
}

export default API({
  name: 'test.example.com.ai',
  description: 'Self-testing API demonstrating the api.qa framework',
  version: '1.0.0',

  auth: { mode: 'optional' },

  // CRUD configuration - auto-generates REST endpoints
  crud: {
    db: 'DB',
    table: 'items',
    searchable: ['name', 'description', 'category'],
    sortable: ['name', 'category', 'created_at'],
    pageSize: 25,
  },

  // MCP tools with embedded tests
  mcp: {
    name: 'test.qa-mcp',
    version: '1.0.0',
    tools: [
      {
        name: 'items.create',
        description: 'Create a new item',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, description: 'Item name' },
            description: { type: 'string', description: 'Item description' },
            category: { type: 'string', enum: ['general', 'premium', 'archived'] },
            price: { type: 'number', minimum: 0 },
          },
          required: ['name'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        examples: [
          {
            name: 'create basic item',
            input: { name: 'Test Item', category: 'general' },
            output: { id: 'item-1', name: 'Test Item', category: 'general' },
          },
          {
            name: 'create premium item with price',
            input: { name: 'Premium Widget', category: 'premium', price: 99.99 },
            output: { id: 'item-2', name: 'Premium Widget', category: 'premium', price: 99.99 },
          },
        ],
        tests: [
          {
            name: 'creates item with valid data',
            tags: ['smoke', 'crud'],
            input: { name: 'Test Item', description: 'A test item', category: 'general' },
            expect: {
              status: 'success',
              output: {
                name: 'Test Item',
                description: 'A test item',
                category: 'general',
              },
              match: 'partial',
            },
          },
          {
            name: 'creates item with price',
            tags: ['crud'],
            input: { name: 'Priced Item', price: 49.99 },
            expect: {
              status: 'success',
              output: {
                'name': 'Priced Item',
                'price': { type: 'number', gte: 0 },
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects empty name',
            tags: ['validation', 'negative'],
            input: { name: '', category: 'general' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects missing name',
            tags: ['validation', 'negative'],
            input: { category: 'general' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects invalid category',
            tags: ['validation', 'negative'],
            input: { name: 'Test', category: 'invalid-category' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects negative price',
            tags: ['validation', 'negative'],
            input: { name: 'Test', price: -10 },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown) => {
          const { name, description, category, price } = input as {
            name?: string
            description?: string
            category?: string
            price?: number
          }

          // Validation
          if (!name || name.length === 0) {
            throw Object.assign(new Error('Name is required'), { code: 'VALIDATION_ERROR' })
          }

          const validCategories = ['general', 'premium', 'archived']
          if (category && !validCategories.includes(category)) {
            throw Object.assign(new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`), { code: 'VALIDATION_ERROR' })
          }

          if (price !== undefined && price < 0) {
            throw Object.assign(new Error('Price cannot be negative'), { code: 'VALIDATION_ERROR' })
          }

          const id = `item-${Date.now()}`
          const item = {
            id,
            name,
            description: description || null,
            category: category || 'general',
            price: price ?? null,
            createdAt: new Date().toISOString(),
          }

          store.items[id] = item
          return item
        },
      },
      {
        name: 'items.get',
        description: 'Get an item by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item ID' },
          },
          required: ['id'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        tests: [
          {
            name: 'returns 404 for non-existent item',
            tags: ['negative'],
            input: { id: 'non-existent-id' },
            expect: {
              status: 'error',
              error: { code: 'NOT_FOUND' },
            },
          },
        ],
        handler: async (input: unknown) => {
          const { id } = input as { id: string }
          const item = store.items[id]

          if (!item) {
            throw Object.assign(new Error('Item not found'), { code: 'NOT_FOUND' })
          }

          return item
        },
      },
      {
        name: 'items.list',
        description: 'List all items with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Filter by category' },
            limit: { type: 'number', default: 10, minimum: 1, maximum: 100 },
            offset: { type: 'number', default: 0, minimum: 0 },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  category: { type: 'string' },
                },
              },
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
        tests: [
          {
            name: 'returns empty array when no items',
            tags: ['smoke'],
            input: {},
            expect: {
              status: 'success',
              output: {
                'items': { type: 'array' },
                'total': { type: 'number', gte: 0 },
              },
              match: 'partial',
            },
          },
          {
            name: 'respects limit parameter',
            tags: ['pagination'],
            input: { limit: 5 },
            expect: {
              status: 'success',
              output: {
                'limit': 5,
              },
              match: 'partial',
            },
          },
        ],
        handler: async (input: unknown) => {
          const { category, limit = 10, offset = 0 } = input as {
            category?: string
            limit?: number
            offset?: number
          }

          let items = Object.values(store.items)

          if (category) {
            items = items.filter((item: any) => item.category === category)
          }

          const total = items.length
          const paged = items.slice(offset, offset + limit)

          return {
            items: paged,
            total,
            limit,
            offset,
          }
        },
      },
      {
        name: 'items.delete',
        description: 'Delete an item by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item ID to delete' },
          },
          required: ['id'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            id: { type: 'string' },
          },
        },
        tests: [
          {
            name: 'returns 404 when deleting non-existent item',
            tags: ['negative'],
            input: { id: 'does-not-exist' },
            expect: {
              status: 'error',
              error: { code: 'NOT_FOUND' },
            },
          },
        ],
        handler: async (input: unknown) => {
          const { id } = input as { id: string }

          if (!store.items[id]) {
            throw Object.assign(new Error('Item not found'), { code: 'NOT_FOUND' })
          }

          delete store.items[id]
          return { success: true, id }
        },
      },
      {
        name: 'echo',
        description: 'Echo back the input with timestamp (for testing)',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            delay: { type: 'number', minimum: 0, maximum: 5000, description: 'Optional delay in ms' },
          },
          required: ['message'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            delayed: { type: 'boolean' },
          },
        },
        tests: [
          {
            name: 'echoes message back',
            tags: ['smoke'],
            input: { message: 'Hello World' },
            expect: {
              status: 'success',
              output: { message: 'Hello World' },
              match: 'partial',
            },
          },
          {
            name: 'handles empty message',
            input: { message: '' },
            expect: {
              status: 'success',
              output: { message: '' },
              match: 'partial',
            },
          },
        ],
        handler: async (input: unknown) => {
          const { message, delay } = input as { message: string; delay?: number }

          if (delay && delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay))
          }

          return {
            message,
            timestamp: new Date().toISOString(),
            delayed: (delay ?? 0) > 0,
          }
        },
      },
    ],
  },

  // Testing configuration - enables /qa endpoint
  testing: {
    enabled: true,
    endpoint: '/qa',
    tags: ['example', 'test.qa'],
    // REST endpoint tests
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        tests: [
          {
            name: 'health check returns ok status',
            tags: ['smoke', 'health'],
            expect: {
              status: 200,
              body: {
                'data.status': 'ok',
                'data.timestamp': { type: 'string' },
              },
            },
          },
        ],
      },
      {
        path: '/',
        method: 'GET',
        tests: [
          {
            name: 'root returns API info',
            tags: ['smoke'],
            expect: {
              status: 200,
              body: {
                'api.name': 'test.example.com.ai',
                'data.name': 'test.example.com.ai',
              },
            },
          },
        ],
      },
      {
        path: '/examples',
        method: 'GET',
        tests: [
          {
            name: 'examples endpoint returns list',
            tags: ['smoke'],
            expect: {
              status: 200,
              body: {
                'data': { type: 'array', minLength: 1 },
              },
            },
          },
        ],
      },
    ],
  },

  // Custom routes
  routes: (app) => {
    // Health check
    app.get('/health', (c) => {
      return c.var.respond({
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      })
    })

    // Examples documentation
    app.get('/examples', (c) => {
      const url = new URL(c.req.url)
      return c.var.respond({
        data: [
          {
            name: 'MCP Tools',
            description: 'JSON-RPC tools for item management',
            path: '/mcp',
            methods: ['items.create', 'items.get', 'items.list', 'items.delete', 'echo'],
          },
          {
            name: 'Test Discovery',
            description: 'Discover embedded tests via JSON-RPC',
            path: '/qa',
            methods: ['tests/list', 'examples/list', 'schemas/list'],
          },
          {
            name: 'Health Check',
            description: 'Simple health check endpoint',
            path: '/health',
          },
          {
            name: 'Response Envelope',
            description: 'All responses wrapped in consistent envelope',
            path: '/',
          },
        ],
        links: {
          self: `${url.origin}/examples`,
          health: `${url.origin}/health`,
          mcp: `${url.origin}/mcp`,
          qa: `${url.origin}/qa`,
          docs: 'https://github.com/dot-do/api',
        },
      })
    })

    // Stats endpoint (example of custom logic)
    app.get('/stats', (c) => {
      const items = Object.values(store.items)
      const categories = items.reduce((acc: Record<string, number>, item: any) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {})

      return c.var.respond({
        data: {
          totalItems: items.length,
          byCategory: categories,
          timestamp: new Date().toISOString(),
        },
      })
    })
  },
})
