/**
 * api.qa - API Testing Framework Index
 *
 * Lists all active API examples and their test status.
 * Provides discovery endpoint for the api.qa testing framework.
 */

import { API } from 'api.do'

interface Project {
  name: string
  domain: string
  description: string
  database: string
  status: 'active' | 'pending' | 'error'
  endpoints: {
    api: string
    qa: string
    health: string
  }
}

// Active projects - updated when examples are deployed
const projects: Project[] = [
  {
    name: 'test.example.com.ai',
    domain: 'test.example.com.ai',
    description: 'D1 SQLite example with CRUD and MCP tools',
    database: 'D1 SQLite',
    status: 'active',
    endpoints: {
      api: 'https://test.example.com.ai',
      qa: 'https://test.example.com.ai/qa',
      health: 'https://test.example.com.ai/health',
    },
  },
  {
    name: 'sqlite.example.com.ai',
    domain: 'sqlite.example.com.ai',
    description: 'Durable Objects native SQLite with tasks API',
    database: 'DO SQLite',
    status: 'active',
    endpoints: {
      api: 'https://sqlite.example.com.ai',
      qa: 'https://sqlite.example.com.ai/qa',
      health: 'https://sqlite.example.com.ai/health',
    },
  },
  {
    name: 'search.example.com.ai',
    domain: 'search.example.com.ai',
    description: 'Full-text search with D1 FTS5',
    database: 'D1 + FTS5',
    status: 'active',
    endpoints: {
      api: 'https://search.example.com.ai',
      qa: 'https://search.example.com.ai/qa',
      health: 'https://search.example.com.ai/health',
    },
  },
  {
    name: 'postgres.example.com.ai',
    domain: 'postgres.example.com.ai',
    description: 'PGLite WASM PostgreSQL in Durable Object',
    database: 'PGLite (WASM)',
    status: 'active',
    endpoints: {
      api: 'https://postgres.example.com.ai',
      qa: 'https://postgres.example.com.ai/qa',
      health: 'https://postgres.example.com.ai/health',
    },
  },
  {
    name: 'documentdb.example.com.ai',
    domain: 'documentdb.example.com.ai',
    description: 'MongoDB-compatible API (in-memory demo)',
    database: 'DocumentDB',
    status: 'active',
    endpoints: {
      api: 'https://documentdb.example.com.ai',
      qa: 'https://documentdb.example.com.ai/qa',
      health: 'https://documentdb.example.com.ai/health',
    },
  },
  {
    name: 'neon.example.com.ai',
    domain: 'neon.example.com.ai',
    description: 'Serverless PostgreSQL via postgres.do',
    database: 'Neon/postgres.do',
    status: 'pending',
    endpoints: {
      api: 'https://neon.example.com.ai',
      qa: 'https://neon.example.com.ai/qa',
      health: 'https://neon.example.com.ai/health',
    },
  },
]

export default API({
  name: 'api.qa',
  description: 'API Testing Framework - discover and run tests for API examples',
  version: '1.0.0',

  auth: { mode: 'optional' },

  mcp: {
    name: 'api.qa-mcp',
    version: '1.0.0',
    tools: [
      {
        name: 'projects.list',
        description: 'List all API projects with their test endpoints',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'pending', 'error', 'all'],
              default: 'all',
              description: 'Filter by project status',
            },
            database: {
              type: 'string',
              description: 'Filter by database type',
            },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            projects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  domain: { type: 'string' },
                  description: { type: 'string' },
                  database: { type: 'string' },
                  status: { type: 'string' },
                  endpoints: { type: 'object' },
                },
              },
            },
            total: { type: 'number' },
            byStatus: { type: 'object' },
          },
        },
        handler: async (input: unknown) => {
          const { status = 'all', database } = input as { status?: string; database?: string }

          let filtered = projects

          if (status && status !== 'all') {
            filtered = filtered.filter((p) => p.status === status)
          }

          if (database) {
            filtered = filtered.filter((p) => p.database.toLowerCase().includes(database.toLowerCase()))
          }

          const byStatus = projects.reduce(
            (acc, p) => {
              acc[p.status] = (acc[p.status] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          )

          return {
            projects: filtered,
            total: filtered.length,
            byStatus,
          }
        },
      },
      {
        name: 'projects.get',
        description: 'Get details for a specific project',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name or domain' },
          },
          required: ['name'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            domain: { type: 'string' },
            description: { type: 'string' },
            database: { type: 'string' },
            status: { type: 'string' },
            endpoints: { type: 'object' },
          },
        },
        handler: async (input: unknown) => {
          const { name } = input as { name: string }

          const project = projects.find((p) => p.name === name || p.domain === name)

          if (!project) {
            throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' })
          }

          return project
        },
      },
      {
        name: 'tests.discover',
        description: 'Discover tests from a project\'s /qa endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Project name or domain' },
          },
          required: ['project'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string' },
            tests: { type: 'array' },
            examples: { type: 'array' },
            schemas: { type: 'array' },
          },
        },
        handler: async (input: unknown) => {
          const { project: projectName } = input as { project: string }

          const project = projects.find((p) => p.name === projectName || p.domain === projectName)

          if (!project) {
            throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' })
          }

          if (project.status !== 'active') {
            throw Object.assign(new Error('Project is not active'), { code: 'PROJECT_INACTIVE' })
          }

          // Fetch tests from the project's /qa endpoint
          try {
            const response = await fetch(project.endpoints.qa, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'tests/list',
                params: {},
              }),
            })

            if (!response.ok) {
              throw new Error(`Failed to fetch tests: ${response.status}`)
            }

            const data = (await response.json()) as { result?: { tests?: unknown[]; examples?: unknown[]; schemas?: unknown[] } }

            return {
              project: project.name,
              tests: data.result?.tests || [],
              examples: data.result?.examples || [],
              schemas: data.result?.schemas || [],
            }
          } catch (error) {
            throw Object.assign(new Error(`Failed to discover tests: ${(error as Error).message}`), {
              code: 'DISCOVERY_ERROR',
            })
          }
        },
      },
      {
        name: 'health.check',
        description: 'Check health status of a project',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Project name or domain' },
          },
          required: ['project'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string' },
            healthy: { type: 'boolean' },
            status: { type: 'object' },
            latency: { type: 'number' },
          },
        },
        handler: async (input: unknown) => {
          const { project: projectName } = input as { project: string }

          const project = projects.find((p) => p.name === projectName || p.domain === projectName)

          if (!project) {
            throw Object.assign(new Error('Project not found'), { code: 'NOT_FOUND' })
          }

          const start = Date.now()

          try {
            const response = await fetch(project.endpoints.health)
            const latency = Date.now() - start

            if (!response.ok) {
              return {
                project: project.name,
                healthy: false,
                status: { error: `HTTP ${response.status}` },
                latency,
              }
            }

            const data = await response.json()

            return {
              project: project.name,
              healthy: true,
              status: data,
              latency,
            }
          } catch (error) {
            return {
              project: project.name,
              healthy: false,
              status: { error: (error as Error).message },
              latency: Date.now() - start,
            }
          }
        },
      },
    ],
  },

  testing: {
    enabled: true,
    endpoint: '/qa',
    tags: ['api.qa', 'index'],
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        tests: [
          {
            name: 'health check returns ok',
            tags: ['smoke'],
            expect: {
              status: 200,
              body: { 'data.status': 'ok' },
            },
          },
        ],
      },
      {
        path: '/projects',
        method: 'GET',
        tests: [
          {
            name: 'lists all projects',
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

    // List all projects
    app.get('/projects', (c) => {
      const status = c.req.query('status')
      const database = c.req.query('database')

      let filtered = projects

      if (status && status !== 'all') {
        filtered = filtered.filter((p) => p.status === status)
      }

      if (database) {
        filtered = filtered.filter((p) => p.database.toLowerCase().includes(database.toLowerCase()))
      }

      const byStatus = projects.reduce(
        (acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      return c.var.respond({
        data: filtered,
        meta: {
          total: filtered.length,
          byStatus,
        },
        links: {
          self: new URL(c.req.url).href,
          active: `${new URL(c.req.url).origin}/projects?status=active`,
        },
      })
    })

    // Get single project
    app.get('/projects/:name', (c) => {
      const name = c.req.param('name')
      const project = projects.find((p) => p.name === name || p.domain === name)

      if (!project) {
        return c.var.respond(
          {
            error: {
              code: 'NOT_FOUND',
              message: `Project "${name}" not found`,
            },
          },
          404
        )
      }

      return c.var.respond({
        data: project,
        links: {
          self: new URL(c.req.url).href,
          api: project.endpoints.api,
          qa: project.endpoints.qa,
          health: project.endpoints.health,
        },
      })
    })

    // Check health of all projects
    app.get('/status', async (c) => {
      const results = await Promise.all(
        projects
          .filter((p) => p.status === 'active')
          .map(async (project) => {
            const start = Date.now()
            try {
              const response = await fetch(project.endpoints.health)
              return {
                name: project.name,
                healthy: response.ok,
                latency: Date.now() - start,
              }
            } catch {
              return {
                name: project.name,
                healthy: false,
                latency: Date.now() - start,
              }
            }
          })
      )

      const healthy = results.filter((r) => r.healthy).length
      const total = results.length

      return c.var.respond({
        data: {
          overall: healthy === total ? 'healthy' : 'degraded',
          healthy,
          total,
          projects: results,
          timestamp: new Date().toISOString(),
        },
      })
    })

    // Documentation
    app.get('/docs', (c) => {
      const url = new URL(c.req.url)
      return c.var.respond({
        data: {
          name: 'api.qa',
          description: 'API Testing Framework for REST, RPC & MCP APIs',
          version: '1.0.0',
          endpoints: [
            { path: '/projects', description: 'List all API projects' },
            { path: '/projects/:name', description: 'Get project details' },
            { path: '/status', description: 'Check health of all active projects' },
            { path: '/qa', description: 'Test discovery endpoint (JSON-RPC)' },
            { path: '/mcp', description: 'MCP tools endpoint' },
          ],
          tools: [
            { name: 'projects.list', description: 'List projects with filtering' },
            { name: 'projects.get', description: 'Get project details' },
            { name: 'tests.discover', description: 'Discover tests from a project' },
            { name: 'health.check', description: 'Check project health' },
          ],
        },
        links: {
          self: `${url.origin}/docs`,
          projects: `${url.origin}/projects`,
          status: `${url.origin}/status`,
          github: 'https://github.com/dot-do/api/tree/main/qa',
        },
      })
    })
  },
})
