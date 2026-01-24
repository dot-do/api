import { Hono } from 'hono'
import type { ApiConfig, ApiEnv } from './types'
import { responseMiddleware } from './response'
import { contextMiddleware, corsMiddleware, authMiddleware, rateLimitMiddleware, createErrorHandler } from './middleware'
import { crudConvention, proxyConvention, rpcConvention, mcpConvention, analyticsMiddleware, analyticsRoutes, analyticsBufferRoutes, testingConvention, databaseConvention, functionsConvention } from './conventions'
import { McpToolRegistry } from './mcp-registry'

export function API(config: ApiConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()
  const basePath = config.basePath || ''

  // Global error handler - catches unhandled errors and returns consistent envelope
  app.onError(createErrorHandler(config))

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

  // Create unified MCP tool registry
  const mcpRegistry = new McpToolRegistry()

  // Register explicit MCP config tools first
  if (config.mcp?.tools) {
    mcpRegistry.registerAll(config.mcp.tools)
  }

  // Database convention - schema-driven CRUD + MCP + events
  // Process before MCP convention to register tools
  if (config.database) {
    const { routes, mcpTools } = databaseConvention(config.database)
    app.route('/', routes)

    // Register database MCP tools with the unified registry
    // These are route-only tools - actual implementation is in REST routes
    if (mcpTools.length > 0) {
      mcpRegistry.registerAll(mcpTools.map((t) => ({
        ...t,
        routeOnly: true,
      })))
    }
  }

  // Functions convention - service actions, proxies, packages, mashups, lookups
  // Process before MCP convention to register tools
  if (config.functions) {
    const { routes, mcpTools } = functionsConvention(config.functions)
    app.route('/', routes)

    // Register function MCP tools with the unified registry
    // These are route-only tools - actual implementation is in REST routes
    if (mcpTools.length > 0) {
      mcpRegistry.registerAll(mcpTools.map((t) => ({
        ...t,
        routeOnly: true,
      })))
    }
  }

  // Mount single unified MCP endpoint with all registered tools
  if (config.mcp) {
    app.route('/', mcpConvention({ config: config.mcp, registry: mcpRegistry }))
  }

  if (config.analytics) {
    app.route('/', analyticsRoutes(config.analytics))
  }

  // Analytics buffer - hibernatable WebSocket DO pattern
  if (config.analyticsBuffer) {
    app.route('/', analyticsBufferRoutes(config.analyticsBuffer))
  }

  if (config.testing) {
    app.route('/', testingConvention(config.testing, mcpRegistry.getTools()))
  }

  // Custom routes
  if (config.routes) {
    config.routes(app)
  }

  return app
}
