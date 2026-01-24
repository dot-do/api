/**
 * neon.example.com.ai - PostgreSQL client example
 *
 * Demonstrates the postgres.do PostgreSQL client with:
 * - SQL tagged template queries
 * - MCP tools for user CRUD operations
 * - Embedded tests for validation
 * - Custom routes for health and stats
 */

import { API } from 'api.do'
import postgres from 'postgres.do'
import type { Sql } from 'postgres.do'

// User type definition
interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'guest'
  created_at: string
  updated_at: string
}

// Helper to get SQL client from environment
function getSql(env: { DATABASE_URL?: string }): Sql {
  const url = env.DATABASE_URL || 'postgres://db.postgres.do/postgres-qa-example'
  return postgres(url)
}

export default API({
  name: 'neon.example.com.ai',
  description: 'PostgreSQL client example using postgres.do',
  version: '1.0.0',

  auth: { mode: 'optional' },

  // MCP tools with embedded tests
  mcp: {
    name: 'postgres.qa-mcp',
    version: '1.0.0',
    tools: [
      {
        name: 'users.create',
        description: 'Create a new user in the database',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', description: 'User email address' },
            name: { type: 'string', minLength: 1, maxLength: 255, description: 'User display name' },
            role: { type: 'string', enum: ['admin', 'user', 'guest'], default: 'user', description: 'User role' },
          },
          required: ['email', 'name'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        examples: [
          {
            name: 'create basic user',
            input: { email: 'alice@example.com', name: 'Alice Smith' },
            output: { id: 'uuid', email: 'alice@example.com', name: 'Alice Smith', role: 'user' },
          },
          {
            name: 'create admin user',
            input: { email: 'admin@example.com', name: 'Admin User', role: 'admin' },
            output: { id: 'uuid', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
          },
        ],
        tests: [
          {
            name: 'creates user with valid data',
            tags: ['smoke', 'crud', 'create'],
            input: { email: 'test@example.com', name: 'Test User' },
            expect: {
              status: 'success',
              output: {
                email: 'test@example.com',
                name: 'Test User',
                role: 'user',
              },
              match: 'partial',
            },
          },
          {
            name: 'creates user with admin role',
            tags: ['crud', 'create'],
            input: { email: 'admin@example.com', name: 'Admin User', role: 'admin' },
            expect: {
              status: 'success',
              output: {
                email: 'admin@example.com',
                role: 'admin',
              },
              match: 'partial',
            },
          },
          {
            name: 'creates user with guest role',
            tags: ['crud', 'create'],
            input: { email: 'guest@example.com', name: 'Guest User', role: 'guest' },
            expect: {
              status: 'success',
              output: {
                role: 'guest',
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects invalid email format',
            tags: ['validation', 'negative'],
            input: { email: 'not-an-email', name: 'Test User' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects empty name',
            tags: ['validation', 'negative'],
            input: { email: 'test@example.com', name: '' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects missing email',
            tags: ['validation', 'negative'],
            input: { name: 'Test User' },
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
          {
            name: 'rejects invalid role',
            tags: ['validation', 'negative'],
            input: { email: 'test@example.com', name: 'Test User', role: 'superadmin' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects duplicate email',
            tags: ['validation', 'negative', 'constraint'],
            input: { email: 'duplicate@example.com', name: 'Duplicate User' },
            setup: { email: 'duplicate@example.com', name: 'Original User' },
            expect: {
              status: 'error',
              error: { code: 'DUPLICATE_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const { email, name, role = 'user' } = input as {
            email?: string
            name?: string
            role?: string
          }

          // Validation
          if (!email) {
            throw Object.assign(new Error('Email is required'), { code: 'VALIDATION_ERROR' })
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) {
            throw Object.assign(new Error('Invalid email format'), { code: 'VALIDATION_ERROR' })
          }

          if (!name || name.length === 0) {
            throw Object.assign(new Error('Name is required'), { code: 'VALIDATION_ERROR' })
          }

          if (name.length > 255) {
            throw Object.assign(new Error('Name must be 255 characters or less'), { code: 'VALIDATION_ERROR' })
          }

          const validRoles = ['admin', 'user', 'guest']
          if (!validRoles.includes(role)) {
            throw Object.assign(new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`), { code: 'VALIDATION_ERROR' })
          }

          const sql = getSql(c.env)

          try {
            const id = crypto.randomUUID()
            const now = new Date().toISOString()

            const [user] = await sql<User[]>`
              INSERT INTO users (id, email, name, role, created_at, updated_at)
              VALUES (${id}, ${email}, ${name}, ${role}, ${now}, ${now})
              RETURNING *
            `

            return user
          } catch (error: any) {
            if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
              throw Object.assign(new Error('A user with this email already exists'), { code: 'DUPLICATE_ERROR' })
            }
            throw error
          } finally {
            await sql.end()
          }
        },
      },
      {
        name: 'users.get',
        description: 'Get a user by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'User ID' },
          },
          required: ['id'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        tests: [
          {
            name: 'returns user by valid ID',
            tags: ['smoke', 'crud', 'read'],
            setup: { email: 'gettest@example.com', name: 'Get Test User' },
            input: { id: '${setup.id}' },
            expect: {
              status: 'success',
              output: {
                email: 'gettest@example.com',
                name: 'Get Test User',
              },
              match: 'partial',
            },
          },
          {
            name: 'returns 404 for non-existent user',
            tags: ['negative'],
            input: { id: '00000000-0000-0000-0000-000000000000' },
            expect: {
              status: 'error',
              error: { code: 'NOT_FOUND' },
            },
          },
          {
            name: 'rejects invalid UUID format',
            tags: ['validation', 'negative'],
            input: { id: 'not-a-uuid' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const { id } = input as { id: string }

          // Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (!uuidRegex.test(id)) {
            throw Object.assign(new Error('Invalid ID format. Must be a valid UUID.'), { code: 'VALIDATION_ERROR' })
          }

          const sql = getSql(c.env)

          try {
            const [user] = await sql<User[]>`
              SELECT * FROM users WHERE id = ${id}
            `

            if (!user) {
              throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' })
            }

            return user
          } finally {
            await sql.end()
          }
        },
      },
      {
        name: 'users.list',
        description: 'List users with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['admin', 'user', 'guest'], description: 'Filter by role' },
            limit: { type: 'number', default: 25, minimum: 1, maximum: 100, description: 'Number of results' },
            offset: { type: 'number', default: 0, minimum: 0, description: 'Offset for pagination' },
            order_by: { type: 'string', enum: ['created_at', 'updated_at', 'name', 'email'], default: 'created_at' },
            order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
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
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' },
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
            name: 'returns empty array when no users',
            tags: ['smoke', 'crud', 'list'],
            input: {},
            expect: {
              status: 'success',
              output: {
                'users': { type: 'array' },
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
          {
            name: 'respects offset parameter',
            tags: ['pagination'],
            input: { offset: 10 },
            expect: {
              status: 'success',
              output: {
                'offset': 10,
              },
              match: 'partial',
            },
          },
          {
            name: 'filters by role',
            tags: ['filter'],
            setup: [
              { email: 'admin1@example.com', name: 'Admin 1', role: 'admin' },
              { email: 'user1@example.com', name: 'User 1', role: 'user' },
            ],
            input: { role: 'admin' },
            expect: {
              status: 'success',
              output: {
                'users': { type: 'array', every: { role: 'admin' } },
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects invalid limit',
            tags: ['validation', 'negative'],
            input: { limit: 500 },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'rejects negative offset',
            tags: ['validation', 'negative'],
            input: { offset: -1 },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const {
            role,
            limit = 25,
            offset = 0,
            order_by = 'created_at',
            order = 'desc',
          } = input as {
            role?: string
            limit?: number
            offset?: number
            order_by?: string
            order?: string
          }

          // Validation
          if (limit < 1 || limit > 100) {
            throw Object.assign(new Error('Limit must be between 1 and 100'), { code: 'VALIDATION_ERROR' })
          }

          if (offset < 0) {
            throw Object.assign(new Error('Offset cannot be negative'), { code: 'VALIDATION_ERROR' })
          }

          const validOrderBy = ['created_at', 'updated_at', 'name', 'email']
          if (!validOrderBy.includes(order_by)) {
            throw Object.assign(new Error(`Invalid order_by. Must be one of: ${validOrderBy.join(', ')}`), { code: 'VALIDATION_ERROR' })
          }

          const validRoles = ['admin', 'user', 'guest']
          if (role && !validRoles.includes(role)) {
            throw Object.assign(new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`), { code: 'VALIDATION_ERROR' })
          }

          const sql = getSql(c.env)

          try {
            // Build query based on filters
            let users: User[]
            let countResult: { count: string }[]

            if (role) {
              users = await sql<User[]>`
                SELECT * FROM users
                WHERE role = ${role}
                ORDER BY ${sql.unsafe(order_by)} ${sql.unsafe(order.toUpperCase())}
                LIMIT ${limit}
                OFFSET ${offset}
              `
              countResult = await sql<{ count: string }[]>`
                SELECT COUNT(*) as count FROM users WHERE role = ${role}
              `
            } else {
              users = await sql<User[]>`
                SELECT * FROM users
                ORDER BY ${sql.unsafe(order_by)} ${sql.unsafe(order.toUpperCase())}
                LIMIT ${limit}
                OFFSET ${offset}
              `
              countResult = await sql<{ count: string }[]>`
                SELECT COUNT(*) as count FROM users
              `
            }

            const total = parseInt(countResult[0]?.count || '0', 10)

            return {
              users,
              total,
              limit,
              offset,
            }
          } finally {
            await sql.end()
          }
        },
      },
      {
        name: 'users.search',
        description: 'Search users by name or email',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 1, description: 'Search query (searches name and email)' },
            limit: { type: 'number', default: 25, minimum: 1, maximum: 100 },
          },
          required: ['query'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            users: { type: 'array' },
            total: { type: 'number' },
            query: { type: 'string' },
          },
        },
        tests: [
          {
            name: 'finds users by name',
            tags: ['smoke', 'search'],
            setup: { email: 'searchname@example.com', name: 'Searchable Name' },
            input: { query: 'Searchable' },
            expect: {
              status: 'success',
              output: {
                'users': { type: 'array', minLength: 1 },
              },
              match: 'partial',
            },
          },
          {
            name: 'finds users by email',
            tags: ['search'],
            setup: { email: 'searchemail@example.com', name: 'Email Test' },
            input: { query: 'searchemail' },
            expect: {
              status: 'success',
              output: {
                'users': { type: 'array', minLength: 1 },
              },
              match: 'partial',
            },
          },
          {
            name: 'returns empty array for no matches',
            tags: ['search'],
            input: { query: 'nonexistentxyz123' },
            expect: {
              status: 'success',
              output: {
                'users': { type: 'array', length: 0 },
                'total': 0,
              },
              match: 'partial',
            },
          },
          {
            name: 'rejects empty query',
            tags: ['validation', 'negative'],
            input: { query: '' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'case-insensitive search',
            tags: ['search'],
            setup: { email: 'casetest@example.com', name: 'CaSeInSeNsItIvE' },
            input: { query: 'caseinsensitive' },
            expect: {
              status: 'success',
              output: {
                'users': { type: 'array', minLength: 1 },
              },
              match: 'partial',
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const { query, limit = 25 } = input as {
            query?: string
            limit?: number
          }

          // Validation
          if (!query || query.length === 0) {
            throw Object.assign(new Error('Search query is required'), { code: 'VALIDATION_ERROR' })
          }

          if (limit < 1 || limit > 100) {
            throw Object.assign(new Error('Limit must be between 1 and 100'), { code: 'VALIDATION_ERROR' })
          }

          const sql = getSql(c.env)

          try {
            const searchPattern = `%${query}%`

            const users = await sql<User[]>`
              SELECT * FROM users
              WHERE name ILIKE ${searchPattern}
                 OR email ILIKE ${searchPattern}
              ORDER BY created_at DESC
              LIMIT ${limit}
            `

            const countResult = await sql<{ count: string }[]>`
              SELECT COUNT(*) as count FROM users
              WHERE name ILIKE ${searchPattern}
                 OR email ILIKE ${searchPattern}
            `

            const total = parseInt(countResult[0]?.count || '0', 10)

            return {
              users,
              total,
              query,
            }
          } finally {
            await sql.end()
          }
        },
      },
      {
        name: 'users.delete',
        description: 'Delete a user by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'User ID to delete' },
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
            name: 'deletes existing user',
            tags: ['smoke', 'crud', 'delete'],
            setup: { email: 'todelete@example.com', name: 'Delete Me' },
            input: { id: '${setup.id}' },
            expect: {
              status: 'success',
              output: {
                success: true,
              },
              match: 'partial',
            },
          },
          {
            name: 'returns 404 when deleting non-existent user',
            tags: ['negative'],
            input: { id: '00000000-0000-0000-0000-000000000000' },
            expect: {
              status: 'error',
              error: { code: 'NOT_FOUND' },
            },
          },
          {
            name: 'rejects invalid UUID format',
            tags: ['validation', 'negative'],
            input: { id: 'invalid-id' },
            expect: {
              status: 'error',
              error: { code: 'VALIDATION_ERROR' },
            },
          },
          {
            name: 'user not found after deletion',
            tags: ['crud', 'delete', 'integration'],
            setup: { email: 'verifydelete@example.com', name: 'Verify Delete' },
            input: { id: '${setup.id}' },
            verify: {
              tool: 'users.get',
              input: { id: '${setup.id}' },
              expect: { status: 'error', error: { code: 'NOT_FOUND' } },
            },
          },
        ],
        handler: async (input: unknown, c) => {
          const { id } = input as { id: string }

          // Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (!uuidRegex.test(id)) {
            throw Object.assign(new Error('Invalid ID format. Must be a valid UUID.'), { code: 'VALIDATION_ERROR' })
          }

          const sql = getSql(c.env)

          try {
            const result = await sql`
              DELETE FROM users WHERE id = ${id}
              RETURNING id
            `

            if (result.length === 0) {
              throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' })
            }

            return { success: true, id }
          } finally {
            await sql.end()
          }
        },
      },
    ],
  },

  // Testing configuration - enables /qa endpoint
  testing: {
    enabled: true,
    endpoint: '/qa',
    tags: ['example', 'postgres.qa', 'postgres.do'],
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
          {
            name: 'health check includes database status',
            tags: ['health', 'database'],
            expect: {
              status: 200,
              body: {
                'data.database': 'connected',
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
                'api.name': 'neon.example.com.ai',
                'data.name': 'neon.example.com.ai',
              },
            },
          },
        ],
      },
      {
        path: '/users/count',
        method: 'GET',
        tests: [
          {
            name: 'count endpoint returns user count',
            tags: ['smoke', 'stats'],
            expect: {
              status: 200,
              body: {
                'data.count': { type: 'number', gte: 0 },
              },
            },
          },
        ],
      },
    ],
  },

  // Custom routes
  routes: (app) => {
    // Health check with database connectivity
    app.get('/health', async (c) => {
      const sql = getSql(c.env)

      try {
        // Test database connectivity
        await sql`SELECT 1`

        return c.var.respond({
          data: {
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        })
      } catch (error) {
        return c.var.respond({
          data: {
            status: 'degraded',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      } finally {
        await sql.end()
      }
    })

    // User count endpoint
    app.get('/users/count', async (c) => {
      const sql = getSql(c.env)

      try {
        const result = await sql<{ count: string }[]>`
          SELECT COUNT(*) as count FROM users
        `

        const count = parseInt(result[0]?.count || '0', 10)

        return c.var.respond({
          data: {
            count,
            timestamp: new Date().toISOString(),
          },
        })
      } catch (error) {
        return c.var.respond({
          error: {
            code: 'DATABASE_ERROR',
            message: error instanceof Error ? error.message : 'Failed to count users',
          },
        }, 500)
      } finally {
        await sql.end()
      }
    })

    // User stats by role
    app.get('/users/stats', async (c) => {
      const sql = getSql(c.env)

      try {
        const roleStats = await sql<{ role: string; count: string }[]>`
          SELECT role, COUNT(*) as count
          FROM users
          GROUP BY role
          ORDER BY count DESC
        `

        const totalResult = await sql<{ count: string }[]>`
          SELECT COUNT(*) as count FROM users
        `

        const byRole: Record<string, number> = {}
        for (const row of roleStats) {
          byRole[row.role] = parseInt(row.count, 10)
        }

        return c.var.respond({
          data: {
            total: parseInt(totalResult[0]?.count || '0', 10),
            byRole,
            timestamp: new Date().toISOString(),
          },
        })
      } catch (error) {
        return c.var.respond({
          error: {
            code: 'DATABASE_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get user stats',
          },
        }, 500)
      } finally {
        await sql.end()
      }
    })
  },
})
