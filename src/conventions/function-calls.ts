/**
 * Function-Call URL Convention
 *
 * Handles function-call URLs detected by the router (kind: 'function').
 * When the router detects a function call like /score(contact_abc),
 * this convention executes the registered function and returns the
 * result in the standard response envelope, using the function name
 * as the semantic payload key.
 *
 * URL examples:
 *   GET /score(contact_abc)                    → execute with entity arg
 *   GET /merge(contact_abc,contact_def)        → multiple args
 *   GET /papa.parse(https://example.com/d.csv) → dotted name, URL arg
 *   POST /score                                → direct execution via POST body
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv } from '../types'
import type { ParsedFunctionCall } from '../helpers/function-parser'

// =============================================================================
// Types
// =============================================================================

/**
 * A registered function: the callable plus metadata.
 */
export interface RegisteredFunction {
  fn: (parsed: FunctionCallInput, ctx: FunctionCallContext) => Promise<unknown>
  description?: string
  mutating?: boolean
  example?: string
}

/**
 * Input passed to a function handler for URL-style calls.
 */
export interface FunctionCallInput {
  /** Function name */
  name: string
  /** Positional arguments from the URL */
  args: ParsedFunctionCall['args']
  /** Named arguments from the URL */
  kwargs: ParsedFunctionCall['kwargs']
  /** POST body (when called via POST) */
  body?: unknown
}

/**
 * Context passed to a function handler.
 */
export interface FunctionCallContext {
  /** Hono context */
  c: Context<ApiEnv>
  /** Original request */
  req: Request
}

/**
 * Options for registering a function.
 */
export interface RegisterOptions {
  description?: string
  mutating?: boolean
  /** Example argument string for discovery (e.g., 'contact_abc') */
  example?: string
}

/**
 * Configuration for the function-call convention.
 */
export interface FunctionCallConfig {
  registry: FunctionRegistry
}

/**
 * Entry in the list() output.
 */
export interface FunctionListEntry {
  name: string
  description?: string
  mutating?: boolean
  example?: string
}

// =============================================================================
// FunctionRegistry
// =============================================================================

/**
 * Registry for function-call URL handlers.
 * Stores registered functions keyed by name (supports dotted names).
 */
export class FunctionRegistry {
  private functions = new Map<string, RegisteredFunction>()

  /**
   * Register a function.
   */
  register(
    name: string,
    fn: RegisteredFunction['fn'],
    opts?: RegisterOptions,
  ): void {
    this.functions.set(name, {
      fn,
      description: opts?.description,
      mutating: opts?.mutating,
      example: opts?.example,
    })
  }

  /**
   * Look up a function by name. Supports dotted names like 'papa.parse'.
   */
  get(name: string): RegisteredFunction | undefined {
    return this.functions.get(name)
  }

  /**
   * List all registered functions.
   */
  list(): FunctionListEntry[] {
    const entries: FunctionListEntry[] = []
    for (const [name, entry] of this.functions) {
      entries.push({
        name,
        description: entry.description,
        mutating: entry.mutating,
        example: entry.example,
      })
    }
    return entries
  }

  /**
   * Generate the `functions` block for root/service discovery.
   *
   * @param baseUrl - The base URL (e.g., 'https://crm.do')
   * @returns Record mapping description → function URL
   */
  toDiscovery(baseUrl: string): Record<string, string> {
    const result: Record<string, string> = {}
    const base = baseUrl.replace(/\/+$/, '')

    for (const [name, entry] of this.functions) {
      const label = entry.description || name
      const url = entry.example ? `${base}/${name}(${entry.example})` : `${base}/${name}`
      result[label] = url
    }

    return result
  }
}

// =============================================================================
// Convention
// =============================================================================

/**
 * Creates a Hono sub-app that handles function-call URLs.
 *
 * It intercepts requests where `routeInfo.route.kind === 'function'`
 * and executes the registered function, wrapping the result in the
 * standard response envelope with the function name as the payload key.
 *
 * For POST requests to a bare function name (no parens), the convention
 * looks up the function by the path and passes the request body.
 */
export function functionCallConvention(config: FunctionCallConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()
  const { registry } = config

  // Handle GET requests with function-call syntax: /score(contact_abc)
  app.get('*', async (c, next) => {
    const routeInfo = c.var.routeInfo
    if (!routeInfo || routeInfo.route.kind !== 'function') {
      return next()
    }

    const fnCall = routeInfo.route.fn
    const entry = registry.get(fnCall.name)

    if (!entry) {
      return c.var.respond({
        error: {
          message: `Function '${fnCall.name}' not found`,
          code: 'FUNCTION_NOT_FOUND',
        },
        status: 404,
        links: {
          home: new URL('/', c.req.url).toString(),
        },
      })
    }

    const input: FunctionCallInput = {
      name: fnCall.name,
      args: fnCall.args,
      kwargs: fnCall.kwargs,
    }

    const ctx: FunctionCallContext = {
      c,
      req: c.req.raw,
    }

    try {
      const result = await entry.fn(input, ctx)
      return c.var.respond({
        data: result,
        key: fnCall.name,
      })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'FUNCTION_ERROR' },
        status: 500,
      })
    }
  })

  // Handle POST requests to bare function name: POST /score
  app.post('*', async (c, next) => {
    // For POST, look at the path to determine the function name.
    // The router may classify this as 'collection' or 'unknown', not 'function',
    // since there are no parens. We need to check if the path matches a function.
    const routeInfo = c.var.routeInfo
    const path = routeInfo?.path || c.req.path
    const fnName = path.replace(/^\/+|\/+$/g, '')

    // Also handle router-detected function calls via POST
    if (routeInfo?.route.kind === 'function') {
      const fnCall = routeInfo.route.fn
      const entry = registry.get(fnCall.name)

      if (!entry) {
        return c.var.respond({
          error: {
            message: `Function '${fnCall.name}' not found`,
            code: 'FUNCTION_NOT_FOUND',
          },
          status: 404,
          links: {
            home: new URL('/', c.req.url).toString(),
          },
        })
      }

      const body = await c.req.json().catch(() => undefined)

      const input: FunctionCallInput = {
        name: fnCall.name,
        args: fnCall.args,
        kwargs: fnCall.kwargs,
        body,
      }

      const ctx: FunctionCallContext = {
        c,
        req: c.req.raw,
      }

      try {
        const result = await entry.fn(input, ctx)
        return c.var.respond({
          data: result,
          key: fnCall.name,
        })
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        return c.var.respond({
          error: { message: err.message, code: 'FUNCTION_ERROR' },
          status: 500,
        })
      }
    }

    // Bare function name via POST (no parens in URL)
    if (!fnName || fnName.includes('/')) {
      // Not a simple function name — pass through
      return next()
    }

    const entry = registry.get(fnName)
    if (!entry) {
      return next()
    }

    const body = await c.req.json().catch(() => undefined)

    const input: FunctionCallInput = {
      name: fnName,
      args: [],
      kwargs: {},
      body,
    }

    const ctx: FunctionCallContext = {
      c,
      req: c.req.raw,
    }

    try {
      const result = await entry.fn(input, ctx)
      return c.var.respond({
        data: result,
        key: fnName,
      })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'FUNCTION_ERROR' },
        status: 500,
      })
    }
  })

  return app
}
