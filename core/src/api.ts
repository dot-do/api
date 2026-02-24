import { Hono } from 'hono'
import type { ApiConfig, ApiEnv } from './types'
import type { ApiInput } from './config'
import { resolveConfig } from './config'
import { responseMiddleware } from './response'
import { contextMiddleware, corsMiddleware, authMiddleware, authLevelMiddleware, rateLimitMiddleware, createErrorHandler } from './middleware'
import { crudConvention, proxyConvention, rpcConvention, mcpConvention, analyticsMiddleware, analyticsRoutes, analyticsBufferRoutes, testingConvention, databaseConvention, functionsConvention, eventsConvention } from './conventions'
import { McpToolRegistry } from './mcp-registry'
import type { FunctionsConfig, FunctionDef } from './conventions/functions/types'

/**
 * Convert extracted bare functions into a FunctionsConfig suitable for functionsConvention.
 *
 * Each `{ name: fn }` entry becomes a FunctionDef with:
 * - name: the key
 * - description: auto-generated from key
 * - input: open JSON Schema (accepts any object)
 * - handler: wraps the bare function to match FunctionHandler signature
 */
function toFunctionsConfig(functions: Record<string, Function>): FunctionsConfig {
  const defs: FunctionDef[] = Object.entries(functions).map(([name, fn]) => ({
    name,
    description: `${name} function`,
    input: { type: 'object' },
    handler: async (input: unknown, _ctx: unknown) => {
      return fn(input)
    },
  }))
  return { functions: defs }
}

// TypeScript function overloads for backward compatibility + zero-config

/** Zero-config: auto-discover everything from env */
export function API(): Hono<ApiEnv>
/** Full ApiConfig (backward compatible) */
export function API(config: ApiConfig): Hono<ApiEnv>
/** Mixed: config keys + inline functions, or functions-only */
export function API(input: Record<string, unknown>): Hono<ApiEnv>

export function API(input?: ApiInput): Hono<ApiEnv> {
  const { config, functions } = resolveConfig(input)

  // If bare functions were extracted, merge them into config.functions
  if (functions) {
    const extractedFunctionsConfig = toFunctionsConfig(functions)
    if (config.functions) {
      // Merge: existing functions config + extracted bare functions
      const existing = config.functions
      config.functions = {
        ...existing,
        functions: [
          ...(existing.functions || []),
          ...(extractedFunctionsConfig.functions || []),
        ],
      }
    } else {
      config.functions = extractedFunctionsConfig
    }
  }

  const app = new Hono<ApiEnv>()
  const basePath = config.basePath || ''

  // Global error handler - catches unhandled errors and returns consistent envelope
  app.onError(createErrorHandler(config))

  // Core middleware stack
  app.use('*', corsMiddleware())
  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware(config))

  // Auth middleware — verifies tokens via AUTH RPC binding
  if (config.auth && config.auth.mode !== 'none') {
    app.use('*', authMiddleware(config))
  }

  // Auth level middleware — classifies auth level (L0-L3) from token/cookie
  // Must run after authMiddleware and BEFORE any requireAuth() guards
  app.use('*', authLevelMiddleware())

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
    if (mcpTools.length > 0) {
      mcpRegistry.registerAll(mcpTools.map((t) => ({
        ...t,
        // Callable tools (search, fetch, do) have handlers — don't override with routeOnly
        // Route-only tools (entity CRUD) are already marked routeOnly by generateMcpTools
        ...(t.handler ? {} : { routeOnly: true }),
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

  // Events convention — routes via EVENTS service binding
  if (config.events) {
    const { routes: eventsRoutes, mcpTools: eventsMcpTools } = eventsConvention(config.events)
    app.route('/', eventsRoutes)

    if (eventsMcpTools.length > 0) {
      mcpRegistry.registerAll(eventsMcpTools.map((t) => ({ ...t })))
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

  // Catch-all: return JSON error envelope for unmatched routes
  app.notFound((c) => {
    return c.var.respond({
      error: { code: 'NOT_FOUND', message: 'Not Found', status: 404 },
      status: 404,
    })
  })

  return app
}
