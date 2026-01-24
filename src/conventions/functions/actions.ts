/**
 * Service Functions (Actions) Sub-module
 *
 * Handles service actions like sending emails, processing images, etc.
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv } from '../../types'
import type {
  FunctionsConfig,
  FunctionDef,
} from './types'
import {
  type McpTool,
  type CallableFn,
  buildCacheKey,
  createFunctionContext,
} from './utils'

// =============================================================================
// Function Registration
// =============================================================================

export function registerFunction(
  registry: Map<string, CallableFn>,
  fn: FunctionDef,
  _config: FunctionsConfig
): void {
  registry.set(fn.name, async (input, ctx) => {
    return fn.handler(input, ctx)
  })
}

export function functionToMcpTool(fn: FunctionDef): McpTool {
  return {
    name: fn.name,
    description: fn.description,
    inputSchema: fn.input,
  }
}

// =============================================================================
// Request Handler
// =============================================================================

export function createFunctionHandler(fn: FunctionDef, config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const input = c.req.method === 'GET'
      ? Object.fromEntries(new URL(c.req.url).searchParams)
      : await c.req.json().catch(() => ({}))

    const ctx = createFunctionContext(c, config, new Map())

    try {
      // Check cache
      if (fn.cache) {
        const cacheKey = buildCacheKey(fn.name, input, fn.cache.key)
        const cached = await ctx.cache.get(cacheKey)
        if (cached !== null) {
          return c.var.respond({ data: cached, meta: { cached: true } })
        }
      }

      const result = await fn.handler(input, ctx)

      // Store in cache
      if (fn.cache) {
        const cacheKey = buildCacheKey(fn.name, input, fn.cache.key)
        ctx.cache.set(cacheKey, result, fn.cache.ttl).catch(() => {})
      }

      return c.var.respond({ data: result })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'FUNCTION_ERROR' },
        status: 500,
      })
    }
  }
}

// =============================================================================
// Route Registration
// =============================================================================

export function registerFunctionRoutes(
  app: Hono<ApiEnv>,
  config: FunctionsConfig,
  registry: Map<string, CallableFn>,
  mcpTools: McpTool[]
): void {
  const basePath = config.basePath || ''

  if (config.functions) {
    for (const fn of config.functions) {
      registerFunction(registry, fn, config)
      mcpTools.push(functionToMcpTool(fn))

      // REST endpoint: POST /{name}
      const path = `${basePath}/${fn.name.replace(/\./g, '/')}`
      app.post(path, createFunctionHandler(fn, config))
      app.get(path, createFunctionHandler(fn, config)) // Allow GET with query params
    }
  }
}
