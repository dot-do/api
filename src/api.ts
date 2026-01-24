import { Hono } from 'hono'
import type { ApiConfig, ApiEnv } from './types'
import { responseMiddleware } from './response'
import { contextMiddleware, corsMiddleware, authMiddleware, rateLimitMiddleware } from './middleware'
import { crudConvention, proxyConvention, rpcConvention, mcpConvention, analyticsMiddleware, analyticsRoutes, analyticsBufferRoutes, testingConvention, databaseConvention, functionsConvention } from './conventions'

export function API(config: ApiConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()
  const basePath = config.basePath || ''

  // Core middleware stack
  app.use('*', corsMiddleware())
  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware(config))

  // Auth middleware
  if (config.auth && config.auth.mode !== 'none') {
    app.use('*', authMiddleware(config))
  }

  // Rate limiting
  if (config.rateLimit) {
    app.use('*', rateLimitMiddleware(config.rateLimit))
  }

  // Analytics logging middleware
  if (config.analytics) {
    app.use('*', analyticsMiddleware(config.analytics))
  }

  // Root endpoint - API info (unless disabled or custom)
  if (config.landing !== false) {
    if (typeof config.landing === 'function') {
      app.get('/', config.landing)
    } else {
      app.get('/', (c) => {
        return c.var.respond({
          data: {
            name: config.name,
            description: config.description,
            version: config.version,
          },
        })
      })
    }
  }

  // Mount conventions
  if (config.crud) {
    const crudPath = basePath || `/${config.crud.table}`
    app.route(crudPath, crudConvention(config.crud))
  }

  if (config.proxy) {
    app.route(basePath || '/', proxyConvention(config.proxy))
  }

  if (config.rpc) {
    app.route('/', rpcConvention(config.rpc))
  }

  if (config.mcp) {
    app.route('/', mcpConvention(config.mcp))
  }

  if (config.analytics) {
    app.route('/', analyticsRoutes(config.analytics))
  }

  // Analytics buffer - hibernatable WebSocket DO pattern
  if (config.analyticsBuffer) {
    app.route('/', analyticsBufferRoutes(config.analyticsBuffer))
  }

  if (config.testing) {
    app.route('/', testingConvention(config.testing, config.mcp?.tools))
  }

  // Database convention - schema-driven CRUD + MCP + events
  if (config.database) {
    const { routes, mcpTools } = databaseConvention(config.database)
    app.route('/', routes)

    // Merge database MCP tools with explicit MCP tools
    if (config.mcp && mcpTools.length > 0) {
      config.mcp.tools = [...(config.mcp.tools || []), ...mcpTools.map((t) => ({
        ...t,
        handler: async () => ({ error: 'Use /mcp endpoint' }), // Placeholder, actual handling in database convention
      }))]
    }
  }

  // Functions convention - service actions, proxies, packages, mashups, lookups
  if (config.functions) {
    const { routes, mcpTools } = functionsConvention(config.functions)
    app.route('/', routes)

    // Merge function MCP tools with explicit MCP tools
    if (config.mcp && mcpTools.length > 0) {
      config.mcp.tools = [...(config.mcp.tools || []), ...mcpTools.map((t) => ({
        ...t,
        handler: async () => ({ error: 'Use /mcp endpoint' }),
      }))]
    }
  }

  // Custom routes
  if (config.routes) {
    config.routes(app)
  }

  return app
}
