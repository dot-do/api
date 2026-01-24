import { Hono } from 'hono'
import type { ApiConfig, ApiEnv } from './types'
import { responseMiddleware } from './response'
import { contextMiddleware, corsMiddleware, authMiddleware, rateLimitMiddleware } from './middleware'
import { crudConvention, proxyConvention, rpcConvention, mcpConvention, analyticsMiddleware, analyticsRoutes } from './conventions'

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

  // Root endpoint - API info
  app.get('/', (c) => {
    return c.var.respond({
      data: {
        name: config.name,
        description: config.description,
        version: config.version,
      },
    })
  })

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

  // Custom routes
  if (config.routes) {
    config.routes(app)
  }

  return app
}
