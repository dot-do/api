/**
 * Package APIs Sub-module
 *
 * Exposes npm packages as APIs (lodash, esbuild, etc.)
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv } from '../../types'
import type {
  FunctionsConfig,
  PackageDef,
  JsonSchema,
} from './types'
import { type McpTool } from './utils'

// =============================================================================
// Package Helpers
// =============================================================================

interface NormalizedPackageFunction {
  name: string
  as?: string
  description?: string
  input?: JsonSchema
  transformInput?: (i: unknown) => unknown
  transformOutput?: (o: unknown) => unknown
}

export function normalizePackageFunctions(pkg: PackageDef): NormalizedPackageFunction[] {
  return pkg.expose.map((item) => {
    if (typeof item === 'string') {
      return { name: item }
    }
    return item
  })
}

// =============================================================================
// Request Handler
// =============================================================================

export function createPackageHandler(
  pkg: PackageDef,
  fnDef: NormalizedPackageFunction,
  _config: FunctionsConfig
) {
  return async (c: Context<ApiEnv>) => {
    const input = c.req.method === 'GET'
      ? Object.fromEntries(new URL(c.req.url).searchParams)
      : await c.req.json().catch(() => ({}))

    try {
      // Dynamic import the package
      const mod = await import(pkg.module || pkg.name)
      const fn = mod[fnDef.name] || mod.default?.[fnDef.name]

      if (typeof fn !== 'function') {
        return c.var.respond({
          error: { message: `Function ${fnDef.name} not found in ${pkg.name}`, code: 'NOT_FOUND' },
          status: 404,
        })
      }

      // Transform input
      let args = input
      if (fnDef.transformInput) {
        args = fnDef.transformInput(input)
      }

      // Call function
      const argsArray = Array.isArray(args) ? args : (input as { args?: unknown[] }).args || [args]
      let result = fn(...argsArray)

      // Handle promises
      if (result instanceof Promise) {
        result = await result
      }

      // Transform output
      if (fnDef.transformOutput) {
        result = fnDef.transformOutput(result)
      }

      return c.var.respond({ data: result })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'PACKAGE_ERROR' },
        status: 500,
      })
    }
  }
}

// =============================================================================
// Route Registration
// =============================================================================

export function registerPackageRoutes(
  app: Hono<ApiEnv>,
  config: FunctionsConfig,
  mcpTools: McpTool[]
): void {
  const basePath = config.basePath || ''

  if (config.packages) {
    for (const pkg of config.packages) {
      const namespace = pkg.namespace || pkg.name
      const pkgPath = `${basePath}/${namespace}`

      for (const fnDef of normalizePackageFunctions(pkg)) {
        const fnName = `${namespace}.${fnDef.as || fnDef.name}`
        const path = `${pkgPath}/${fnDef.as || fnDef.name}`

        // Create handler for package function
        app.post(path, createPackageHandler(pkg, fnDef, config))
        app.get(path, createPackageHandler(pkg, fnDef, config))

        mcpTools.push({
          name: fnName,
          description: fnDef.description || `Call ${pkg.name}.${fnDef.name}`,
          inputSchema: fnDef.input || { type: 'object', properties: { args: { type: 'array' } } },
        })
      }
    }
  }
}
