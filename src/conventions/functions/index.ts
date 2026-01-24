/**
 * Functions Convention
 *
 * Unified API pattern for non-CRUD APIs:
 * - Service actions (send email, process image)
 * - Proxy wrappers (Apollo.io, Stripe)
 * - Package APIs (lodash, esbuild)
 * - Mashups (combine multiple sources)
 * - Lookups (reference data like GeoNames)
 * - Pipelines (transformation chains)
 *
 * This module orchestrates all sub-modules and provides the unified
 * functionsConvention() entry point.
 */

import { Hono } from 'hono'
import type { ApiEnv } from '../../types'
import type { FunctionsConfig } from './types'

// Re-export types
export type * from './types'

// Re-export utilities for advanced use cases
export { type McpTool, type CallableFn, createFunctionContext, createCacheHelper } from './utils'

// Import sub-module registration functions
import { registerFunctionRoutes } from './actions'
import { registerProxyRoutes } from './proxies'
import { registerPackageRoutes } from './packages'
import { registerMashupRoutes } from './mashups'
import { registerLookupRoutes } from './lookups'
import { registerPipelineRoutes } from './pipelines'

// Import shared types and utilities
import { type McpTool, type CallableFn } from './utils'

// =============================================================================
// Main Convention
// =============================================================================

export function functionsConvention(config: FunctionsConfig): {
  routes: Hono<ApiEnv>
  mcpTools: McpTool[]
} {
  const app = new Hono<ApiEnv>()
  const mcpTools: McpTool[] = []

  // Registry of all callable functions (shared across modules)
  const registry = new Map<string, CallableFn>()

  // ==========================================================================
  // Register all sub-modules
  // ==========================================================================

  // Service functions (actions)
  registerFunctionRoutes(app, config, registry, mcpTools)

  // Proxy wrappers
  registerProxyRoutes(app, config, mcpTools)

  // Package APIs
  registerPackageRoutes(app, config, mcpTools)

  // Data mashups
  registerMashupRoutes(app, config, mcpTools)

  // Reference data lookups
  registerLookupRoutes(app, config, mcpTools)

  // Transformation pipelines
  registerPipelineRoutes(app, config, registry, mcpTools)

  // NOTE: MCP endpoint removed - tools are now served through unified /mcp endpoint
  // via McpToolRegistry in api.ts

  return { routes: app, mcpTools }
}
