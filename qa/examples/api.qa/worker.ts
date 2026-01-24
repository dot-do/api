/**
 * api.qa - API Testing Framework Index
 *
 * Lists all active API examples and their test status.
 * Provides discovery endpoint for the api.qa testing framework.
 */

import { API } from '@dotdo/apis'

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
  // example.com.ai database backends
  {
    name: 'db4.example.com.ai',
    domain: 'db4.example.com.ai',
    description: 'DB4 key-value store (in-memory demo)',
    database: 'DB4',
    status: 'active',
    endpoints: {
      api: 'https://db4.example.com.ai',
      qa: 'https://db4.example.com.ai/qa',
      health: 'https://db4.example.com.ai/health',
    },
  },
  {
    name: 'sdb.example.com.ai',
    domain: 'sdb.example.com.ai',
    description: 'SDB document/graph database (in-memory demo)',
    database: 'SDB',
    status: 'active',
    endpoints: {
      api: 'https://sdb.example.com.ai',
      qa: 'https://sdb.example.com.ai/qa',
      health: 'https://sdb.example.com.ai/health',
    },
  },
  {
    name: 'evodb.example.com.ai',
    domain: 'evodb.example.com.ai',
    description: 'EvoDB distributed lakehouse (in-memory demo)',
    database: 'EvoDB',
    status: 'active',
    endpoints: {
      api: 'https://evodb.example.com.ai',
      qa: 'https://evodb.example.com.ai/qa',
      health: 'https://evodb.example.com.ai/health',
    },
  },
  {
    name: 'graphdb.example.com.ai',
    domain: 'graphdb.example.com.ai',
    description: 'GraphDB graph database (in-memory demo)',
    database: 'GraphDB',
    status: 'active',
    endpoints: {
      api: 'https://graphdb.example.com.ai',
      qa: 'https://graphdb.example.com.ai/qa',
      health: 'https://graphdb.example.com.ai/health',
    },
  },
  // workers.do analytics backends
  {
    name: 'duckdb.workers.do',
    domain: 'duckdb.workers.do',
    description: 'DuckDB analytics database (in-memory demo)',
    database: 'DuckDB',
    status: 'active',
    endpoints: {
      api: 'https://duckdb.workers.do',
      qa: 'https://duckdb.workers.do/qa',
      health: 'https://duckdb.workers.do/health',
    },
  },
  {
    name: 'ducktail.workers.do',
    domain: 'ducktail.workers.do',
    description: 'Ducktail log & event tailing service',
    database: 'In-memory',
    status: 'active',
    endpoints: {
      api: 'https://ducktail.workers.do',
      qa: 'https://ducktail.workers.do/qa',
      health: 'https://ducktail.workers.do/health',
    },
  },
  {
    name: 'ducklytics.workers.do',
    domain: 'ducklytics.workers.do',
    description: 'Ducklytics analytics platform',
    database: 'In-memory',
    status: 'active',
    endpoints: {
      api: 'https://ducklytics.workers.do',
      qa: 'https://ducklytics.workers.do/qa',
      health: 'https://ducklytics.workers.do/health',
    },
  },
]

export default API({
  name: 'api.qa',
  description: 'API Testing Framework - discover and run tests for API examples',
  version: '1.0.0',

  auth: { mode: 'optional' },

  // Custom landing page - status dashboard
  landing: async (c) => {
    const accept = c.req.header('accept') || ''

    // If requesting JSON, return JSON response
    if (accept.includes('application/json') && !accept.includes('text/html')) {
      const results = await Promise.all(
        projects.map(async (project) => {
          if (project.status !== 'active') {
            return {
              name: project.name,
              description: project.description,
              database: project.database,
              status: 'pending' as const,
              healthy: null,
              latency: null,
            }
          }
          const start = Date.now()
          try {
            const response = await fetch(project.endpoints.health)
            return {
              name: project.name,
              description: project.description,
              database: project.database,
              status: 'active' as const,
              healthy: response.ok,
              latency: Date.now() - start,
            }
          } catch {
            return {
              name: project.name,
              description: project.description,
              database: project.database,
              status: 'active' as const,
              healthy: false,
              latency: Date.now() - start,
            }
          }
        })
      )

      const activeResults = results.filter((r) => r.status === 'active')
      const healthy = activeResults.filter((r) => r.healthy).length
      const total = activeResults.length

      return c.var.respond({
        data: {
          overall: healthy === total ? 'healthy' : 'degraded',
          healthy,
          total,
          projects: results,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Otherwise return HTML status page
    const results = await Promise.all(
      projects.map(async (project) => {
        if (project.status !== 'active') {
          return {
            ...project,
            healthy: null as boolean | null,
            latency: null as number | null,
            checkedAt: new Date().toISOString(),
          }
        }
        const start = Date.now()
        try {
          const response = await fetch(project.endpoints.health)
          return {
            ...project,
            healthy: response.ok,
            latency: Date.now() - start,
            checkedAt: new Date().toISOString(),
          }
        } catch {
          return {
            ...project,
            healthy: false,
            latency: Date.now() - start,
            checkedAt: new Date().toISOString(),
          }
        }
      })
    )

    const activeResults = results.filter((r) => r.status === 'active')
    const healthyCount = activeResults.filter((r) => r.healthy).length
    const totalActive = activeResults.length
    const overallStatus = healthyCount === totalActive ? 'operational' : 'degraded'
    const timestamp = new Date().toISOString()

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>api.qa - Status</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --card: #111;
      --border: #222;
      --text: #e5e5e5;
      --muted: #888;
      --pass: #22c55e;
      --fail: #ef4444;
      --pending: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 900px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    h1 { font-size: 1.5rem; font-weight: 600; }
    .overall {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    .dot.pass { background: var(--pass); }
    .dot.fail { background: var(--fail); }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .summary {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      text-align: center;
    }
    .summary-item h3 { font-size: 2rem; font-weight: 700; }
    .summary-item p { color: var(--muted); font-size: 0.875rem; }
    .projects { display: flex; flex-direction: column; gap: 0.5rem; }
    .project {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: 1rem;
    }
    .project:hover { border-color: #333; }
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-indicator.pass { background: var(--pass); }
    .status-indicator.fail { background: var(--fail); }
    .status-indicator.pending { background: var(--pending); }
    .project-info h4 {
      font-size: 0.9375rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .project-info h4 a {
      color: inherit;
      text-decoration: none;
    }
    .project-info h4 a:hover { text-decoration: underline; }
    .project-info p {
      font-size: 0.8125rem;
      color: var(--muted);
    }
    .badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: var(--border);
      color: var(--muted);
    }
    .latency {
      font-size: 0.8125rem;
      color: var(--muted);
      min-width: 60px;
      text-align: right;
    }
    footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      color: var(--muted);
    }
    footer a { color: var(--muted); }
    .section-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin: 1.5rem 0 0.75rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>api.qa</h1>
      <div class="overall">
        <span class="dot ${overallStatus === 'operational' ? 'pass' : 'fail'}"></span>
        <span>${overallStatus === 'operational' ? 'All Systems Operational' : 'Some Systems Degraded'}</span>
      </div>
    </header>

    <div class="summary">
      <div class="summary-item">
        <h3>${healthyCount}</h3>
        <p>Passing</p>
      </div>
      <div class="summary-item">
        <h3>${totalActive - healthyCount}</h3>
        <p>Failing</p>
      </div>
      <div class="summary-item">
        <h3>${results.filter((r) => r.status === 'pending').length}</h3>
        <p>Pending</p>
      </div>
    </div>

    <div class="section-title">example.com.ai</div>
    <div class="projects">
      ${results
        .filter((r) => r.domain.endsWith('.example.com.ai'))
        .map(
          (r) => `
        <div class="project">
          <span class="status-indicator ${r.healthy === null ? 'pending' : r.healthy ? 'pass' : 'fail'}"></span>
          <div class="project-info">
            <h4><a href="${r.endpoints.api}" target="_blank">${r.name}</a></h4>
            <p>${r.description}</p>
          </div>
          <span class="badge">${r.database}</span>
          <span class="latency">${r.latency !== null ? r.latency + 'ms' : 'pending'}</span>
        </div>
      `
        )
        .join('')}
    </div>

    <div class="section-title">workers.do</div>
    <div class="projects">
      ${results
        .filter((r) => r.domain.endsWith('.workers.do'))
        .map(
          (r) => `
        <div class="project">
          <span class="status-indicator ${r.healthy === null ? 'pending' : r.healthy ? 'pass' : 'fail'}"></span>
          <div class="project-info">
            <h4><a href="${r.endpoints.api}" target="_blank">${r.name}</a></h4>
            <p>${r.description}</p>
          </div>
          <span class="badge">${r.database}</span>
          <span class="latency">${r.latency !== null ? r.latency + 'ms' : 'pending'}</span>
        </div>
      `
        )
        .join('')}
    </div>

    <footer>
      <span>Last checked: ${new Date(timestamp).toLocaleString()}</span>
      <a href="/status">JSON API</a>
    </footer>
  </div>
</body>
</html>`

    return c.html(html)
  },

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
