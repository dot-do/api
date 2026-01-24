/**
 * test.qa.example.com.ai - Example API with embedded tests
 *
 * This worker demonstrates the api.qa testing framework by exposing
 * an API with embedded test cases that can be discovered and executed.
 */

import { API } from 'api.do'
import type { Context } from 'hono'

// Simulated data store
const users: Record<string, { id: string; name: string; email: string; createdAt: string }> = {}

export default API({
  name: 'test.qa Example API',
  description: 'A demonstration API with embedded tests for api.qa',
  version: '1.0.0',

  mcp: {
    name: 'test.qa-mcp',
    version: '1.0.0',
    tools: [
      {
        name: 'users.create',
        description: 'Create a new user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
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
        examples: [
          {
            name: 'basic',
            input: { name: 'Alice', email: 'alice@example.com' },
            output: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
          },
        ],
        tests: [
          {
            name: 'creates user successfully',
            input: { name: 'Test User', email: 'test@example.com' },
            expect: {
              status: 'success',
              output: { name: 'Test User', email: 'test@example.com' },
              match: 'partial',
            },
          },
          {
            name: 'rejects invalid email',
            input: { name: 'Test', email: 'invalid-email' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects missing name',
            tags: ['validation', 'negative'],
            input: { email: 'test@example.com' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c: Context) => {
          const { name, email } = input as { name?: string; email?: string }

          // Validation
          if (!name || name.length === 0) {
            throw Object.assign(new Error('Name is required'), { code: 'VALIDATION_ERROR' })
          }

          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw Object.assign(new Error('Valid email is required'), { code: 'VALIDATION_ERROR' })
          }

          const id = `user-${Date.now()}`
          const user = {
            id,
            name,
            email,
            createdAt: new Date().toISOString(),
          }

          users[id] = user
          return user
        },
      },
      {
        name: 'users.get',
        description: 'Get a user by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
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
        tests: [
          {
            name: 'returns 404 for non-existent user',
            input: { id: 'non-existent' },
            expect: {
              status: 'error',
              error: { code: 'NOT_FOUND' },
            },
          },
        ],
        handler: async (input: unknown) => {
          const { id } = input as { id: string }
          const user = users[id]

          if (!user) {
            throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' })
          }

          return user
        },
      },
      {
        name: 'users.list',
        description: 'List all users',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
            offset: { type: 'number', default: 0 },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
            total: { type: 'number' },
          },
        },
        tests: [
          {
            name: 'returns empty array when no users',
            tags: ['smoke'],
            input: {},
            expect: {
              status: 'success',
              output: { users: [], total: 0 },
              match: 'schema',
            },
          },
        ],
        handler: async (input: unknown) => {
          const { limit = 10, offset = 0 } = input as { limit?: number; offset?: number }
          const allUsers = Object.values(users)

          return {
            users: allUsers.slice(offset, offset + limit),
            total: allUsers.length,
          }
        },
      },
      {
        name: 'echo',
        description: 'Echo back the input (for testing)',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            timestamp: { type: 'string' },
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
        ],
        handler: async (input: unknown) => {
          const { message } = input as { message: string }
          return {
            message,
            timestamp: new Date().toISOString(),
          }
        },
      },
    ],
  },

  testing: {
    enabled: true,
    endpoint: '/qa',
    tags: ['example', 'test.qa'],
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        tests: [
          {
            name: 'health check returns ok',
            tags: ['smoke', 'health'],
            expect: {
              status: 200,
              body: { 'data.status': 'ok' },
            },
          },
        ],
      },
    ],
  },

  routes: (app) => {
    // Health check endpoint
    app.get('/health', (c) => {
      return c.var.respond({
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
        },
      })
    })
  },
})
