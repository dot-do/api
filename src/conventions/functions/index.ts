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
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv } from '../../types'
import type {
  FunctionsConfig,
  FunctionDef,
  FunctionContext,
  ProxyDef,
  PackageDef,
  MashupDef,
  LookupDef,
  PipelineDef,
  CacheHelper,
  JsonSchema,
} from './types'

export type * from './types'

// =============================================================================
// Main Convention
// =============================================================================

export function functionsConvention(config: FunctionsConfig): {
  routes: Hono<ApiEnv>
  mcpTools: McpTool[]
} {
  const app = new Hono<ApiEnv>()
  const basePath = config.basePath || ''
  const mcpTools: McpTool[] = []

  // Registry of all callable functions
  const registry = new Map<string, CallableFn>()

  // ==========================================================================
  // Register Functions
  // ==========================================================================

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

  // ==========================================================================
  // Register Proxies
  // ==========================================================================

  if (config.proxies) {
    for (const proxy of config.proxies) {
      const proxyPath = `${basePath}/${proxy.name}`

      // Wildcard route for proxy
      app.all(`${proxyPath}/*`, createProxyHandler(proxy, config))
      app.all(proxyPath, createProxyHandler(proxy, config))

      // Register proxy endpoints as functions
      if (proxy.endpoints) {
        for (const endpoint of proxy.endpoints) {
          const fnName = `${proxy.name}.${endpoint.path.replace(/[/:]/g, '_')}`
          mcpTools.push({
            name: fnName,
            description: `Proxy to ${proxy.upstream}${endpoint.path}`,
            inputSchema: { type: 'object', properties: {} },
          })
        }
      }
    }
  }

  // ==========================================================================
  // Register Packages
  // ==========================================================================

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

  // ==========================================================================
  // Register Mashups
  // ==========================================================================

  if (config.mashups) {
    for (const mashup of config.mashups) {
      const path = `${basePath}/${mashup.name.replace(/\./g, '/')}`

      app.post(path, createMashupHandler(mashup, config))
      app.get(path, createMashupHandler(mashup, config))

      mcpTools.push({
        name: mashup.name,
        description: mashup.description,
        inputSchema: mashup.input,
      })
    }
  }

  // ==========================================================================
  // Register Lookups
  // ==========================================================================

  if (config.lookups) {
    for (const lookup of config.lookups) {
      const lookupPath = `${basePath}/${lookup.name}`

      // GET /{name} - list/search
      app.get(lookupPath, createLookupListHandler(lookup, config))

      // GET /{name}/search?q=... - search
      app.get(`${lookupPath}/search`, createLookupSearchHandler(lookup, config))

      // GET /{name}/autocomplete?q=... - autocomplete
      if (lookup.autocomplete) {
        app.get(`${lookupPath}/autocomplete`, createLookupAutocompleteHandler(lookup, config))
      }

      // GET /{name}/:id - get by ID
      app.get(`${lookupPath}/:id`, createLookupGetHandler(lookup, config))

      mcpTools.push({
        name: `${lookup.name}.get`,
        description: `Get ${lookup.name} by ${lookup.primaryKey}`,
        inputSchema: {
          type: 'object',
          properties: { [lookup.primaryKey]: { type: 'string' } },
          required: [lookup.primaryKey],
        },
      })

      mcpTools.push({
        name: `${lookup.name}.search`,
        description: `Search ${lookup.name}`,
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['query'],
        },
      })
    }
  }

  // ==========================================================================
  // Register Pipelines
  // ==========================================================================

  if (config.pipelines) {
    for (const pipeline of config.pipelines) {
      const path = `${basePath}/${pipeline.name.replace(/\./g, '/')}`

      app.post(path, createPipelineHandler(pipeline, registry, config))

      mcpTools.push({
        name: pipeline.name,
        description: pipeline.description,
        inputSchema: pipeline.input,
      })
    }
  }

  // ==========================================================================
  // MCP Endpoint
  // ==========================================================================

  app.post('/mcp', async (c) => {
    const body = await c.req.json<{ jsonrpc: string; method: string; params?: unknown; id?: unknown }>()

    if (body.method === 'tools/list') {
      return c.json({
        jsonrpc: '2.0',
        result: { tools: mcpTools },
        id: body.id,
      })
    }

    if (body.method === 'tools/call') {
      const params = body.params as { name: string; arguments?: Record<string, unknown> }
      const tool = mcpTools.find((t) => t.name === params.name)

      if (!tool) {
        return c.json({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Tool not found: ${params.name}` },
          id: body.id,
        })
      }

      try {
        const fn = registry.get(params.name)
        if (fn) {
          const ctx = createFunctionContext(c, config, registry)
          const result = await fn(params.arguments || {}, ctx)
          return c.json({
            jsonrpc: '2.0',
            result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
            id: body.id,
          })
        }

        return c.json({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Function not implemented: ${params.name}` },
          id: body.id,
        })
      } catch (e) {
        const err = e as Error
        return c.json({
          jsonrpc: '2.0',
          error: { code: -32603, message: err.message },
          id: body.id,
        })
      }
    }

    return c.json({
      jsonrpc: '2.0',
      error: { code: -32601, message: `Method not found: ${body.method}` },
      id: body.id,
    })
  })

  return { routes: app, mcpTools }
}

// =============================================================================
// Types
// =============================================================================

interface McpTool {
  name: string
  description: string
  inputSchema: JsonSchema
}

type CallableFn = (input: unknown, ctx: FunctionContext) => Promise<unknown>

// =============================================================================
// Handlers
// =============================================================================

function createFunctionHandler(fn: FunctionDef, config: FunctionsConfig) {
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
      const err = e as Error
      return c.var.respond({
        error: { message: err.message, code: 'FUNCTION_ERROR' },
        status: 500,
      })
    }
  }
}

function createProxyHandler(proxy: ProxyDef, config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const url = new URL(c.req.url)
    const proxyPath = url.pathname.replace(new RegExp(`^${config.basePath || ''}/${proxy.name}`), '')

    let req = {
      method: c.req.method,
      path: proxyPath || '/',
      query: Object.fromEntries(url.searchParams) as Record<string, string>,
      headers: {} as Record<string, string>,
      body: undefined as unknown,
    }

    // Forward headers
    if (proxy.forwardHeaders) {
      for (const header of proxy.forwardHeaders) {
        const value = c.req.header(header)
        if (value) req.headers[header] = value
      }
    }

    // Add headers
    if (proxy.addHeaders) {
      req.headers = { ...req.headers, ...proxy.addHeaders }
    }

    // Add auth
    if (proxy.auth) {
      req = await applyProxyAuth(req, proxy.auth, c) as typeof req
    }

    // Get body for non-GET requests
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      req.body = await c.req.json().catch(() => undefined)
    }

    // Transform request
    if (proxy.transformRequest) {
      const transformed = await proxy.transformRequest(req as Parameters<typeof proxy.transformRequest>[0])
      req = {
        method: transformed.method,
        path: transformed.path,
        query: transformed.query || {},
        headers: transformed.headers || {},
        body: transformed.body,
      }
    }

    // Build upstream URL
    const upstreamUrl = new URL(req.path, proxy.upstream)
    for (const [key, value] of Object.entries(req.query)) {
      upstreamUrl.searchParams.set(key, value)
    }

    // Check cache for GET requests
    if (proxy.cache && c.req.method === 'GET') {
      const cacheKey = `proxy:${proxy.name}:${upstreamUrl.toString()}`
      const cached = await getCacheValue(c, config, cacheKey)
      if (cached !== null) {
        return c.var.respond({ data: cached, meta: { cached: true } })
      }
    }

    // Make upstream request
    const response = await fetch(upstreamUrl.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body ? JSON.stringify(req.body) : undefined,
    })

    if (!response.ok) {
      const error = {
        status: response.status,
        message: response.statusText,
        body: await response.json().catch(() => null),
      }

      if (proxy.transformError) {
        const transformedError = proxy.transformError(error)
        return c.var.respond({
          error: typeof transformedError === 'object' && transformedError !== null
            ? { message: String((transformedError as Record<string, unknown>).message || error.message), ...(transformedError as Record<string, unknown>) }
            : { message: String(transformedError) },
          status: response.status,
        })
      }

      return c.var.respond({
        error: { message: error.message, code: 'PROXY_ERROR', details: error.body },
        status: response.status,
      })
    }

    let data = await response.json()

    // Transform response
    if (proxy.transformResponse) {
      data = await proxy.transformResponse(
        { status: response.status, headers: Object.fromEntries(response.headers), body: data },
        req
      )
    }

    // Cache response
    if (proxy.cache && c.req.method === 'GET') {
      const cacheKey = `proxy:${proxy.name}:${upstreamUrl.toString()}`
      setCacheValue(c, config, cacheKey, data, proxy.cache.ttl).catch(() => {})
    }

    return c.var.respond({ data })
  }
}

function createPackageHandler(pkg: PackageDef, fnDef: { name: string; as?: string; transformInput?: (i: unknown) => unknown; transformOutput?: (o: unknown) => unknown }, _config: FunctionsConfig) {
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
      const err = e as Error
      return c.var.respond({
        error: { message: err.message, code: 'PACKAGE_ERROR' },
        status: 500,
      })
    }
  }
}

function createMashupHandler(mashup: MashupDef, config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const input = c.req.method === 'GET'
      ? Object.fromEntries(new URL(c.req.url).searchParams)
      : await c.req.json().catch(() => ({}))

    // Check cache
    if (mashup.cache) {
      const cacheKey = buildCacheKey(`mashup:${mashup.name}`, input, mashup.cache.key)
      const cached = await getCacheValue(c, config, cacheKey)
      if (cached !== null) {
        return c.var.respond({ data: cached, meta: { cached: true } })
      }
    }

    // Fetch all sources
    const results: Record<string, unknown> = {}
    const errors: Record<string, string> = {}

    const fetchSource = async (name: string, source: typeof mashup.sources[string]) => {
      try {
        // Interpolate URL with input values
        let url = source.url
        for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
          url = url.replace(`{${key}}`, String(value))
        }
        if (source.params) {
          for (const [param, inputKey] of Object.entries(source.params)) {
            url = url.replace(`{${param}}`, String((input as Record<string, unknown>)[inputKey]))
          }
        }

        const response = await fetch(url, {
          method: source.method || 'GET',
          headers: source.headers,
          body: source.body ? JSON.stringify(source.body) : undefined,
          signal: source.timeout ? AbortSignal.timeout(source.timeout) : undefined,
        })

        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`)
        }

        let data = await response.json()

        if (source.transform) {
          data = source.transform(data)
        }

        results[name] = data
      } catch (e) {
        const err = e as Error
        errors[name] = err.message
        if (source.required !== false) {
          throw new Error(`Required source ${name} failed: ${err.message}`)
        }
      }
    }

    try {
      if (mashup.parallel !== false) {
        await Promise.all(
          Object.entries(mashup.sources).map(([name, source]) => fetchSource(name, source))
        )
      } else {
        for (const [name, source] of Object.entries(mashup.sources)) {
          await fetchSource(name, source)
        }
      }

      // Merge results
      let merged: unknown
      if (typeof mashup.merge === 'function') {
        merged = mashup.merge(results, input)
      } else if (mashup.merge === 'deep') {
        merged = deepMerge({}, ...Object.values(results))
      } else {
        merged = Object.assign({}, ...Object.values(results))
      }

      // Cache result
      if (mashup.cache) {
        const cacheKey = buildCacheKey(`mashup:${mashup.name}`, input, mashup.cache.key)
        setCacheValue(c, config, cacheKey, merged, mashup.cache.ttl).catch(() => {})
      }

      return c.var.respond({ data: merged, meta: { sources: Object.keys(results), errors } })
    } catch (e) {
      const err = e as Error
      return c.var.respond({
        error: { message: err.message, code: 'MASHUP_ERROR', details: errors },
        status: 500,
      })
    }
  }
}

function createLookupListHandler(lookup: LookupDef, _config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const limit = parseInt(c.req.query('limit') || '20', 10)
    const offset = parseInt(c.req.query('offset') || '0', 10)

    try {
      const data = await queryLookupSource(c, lookup, { limit, offset })
      return c.var.respond({ data, meta: { limit, offset } })
    } catch (e) {
      const err = e as Error
      return c.var.respond({
        error: { message: err.message, code: 'LOOKUP_ERROR' },
        status: 500,
      })
    }
  }
}

function createLookupSearchHandler(lookup: LookupDef, _config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const query = c.req.query('q') || ''
    const limit = parseInt(c.req.query('limit') || String(lookup.search?.limit || 20), 10)

    if (lookup.search?.minLength && query.length < lookup.search.minLength) {
      return c.var.respond({
        error: { message: `Query must be at least ${lookup.search.minLength} characters`, code: 'QUERY_TOO_SHORT' },
        status: 400,
      })
    }

    try {
      const data = await searchLookupSource(c, lookup, query, limit)
      return c.var.respond({ data, meta: { query, limit } })
    } catch (e) {
      const err = e as Error
      return c.var.respond({
        error: { message: err.message, code: 'LOOKUP_ERROR' },
        status: 500,
      })
    }
  }
}

function createLookupAutocompleteHandler(lookup: LookupDef, _config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const query = c.req.query('q') || ''
    const limit = parseInt(c.req.query('limit') || String(lookup.autocomplete?.limit || 10), 10)

    if (lookup.autocomplete?.minLength && query.length < lookup.autocomplete.minLength) {
      return c.var.respond({ data: [] })
    }

    try {
      const data = await autocompleteLookupSource(c, lookup, query, limit)
      return c.var.respond({ data })
    } catch (e) {
      const err = e as Error
      return c.var.respond({
        error: { message: err.message, code: 'LOOKUP_ERROR' },
        status: 500,
      })
    }
  }
}

function createLookupGetHandler(lookup: LookupDef, config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const id = c.req.param('id')

    // Check cache
    if (lookup.cache) {
      const cacheKey = `lookup:${lookup.name}:${id}`
      const cached = await getCacheValue(c, config, cacheKey)
      if (cached !== null) {
        return c.var.respond({ data: cached, meta: { cached: true } })
      }
    }

    try {
      const data = await getLookupById(c, lookup, id)

      if (!data) {
        return c.var.respond({
          error: { message: `${lookup.name} not found`, code: 'NOT_FOUND' },
          status: 404,
        })
      }

      // Transform
      const result = lookup.transform ? lookup.transform(data) : data

      // Cache
      if (lookup.cache) {
        const cacheKey = `lookup:${lookup.name}:${id}`
        setCacheValue(c, config, cacheKey, result, lookup.cache.ttl).catch(() => {})
      }

      return c.var.respond({ data: result })
    } catch (e) {
      const err = e as Error
      return c.var.respond({
        error: { message: err.message, code: 'LOOKUP_ERROR' },
        status: 500,
      })
    }
  }
}

function createPipelineHandler(pipeline: PipelineDef, registry: Map<string, CallableFn>, config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const input = c.req.method === 'GET'
      ? Object.fromEntries(new URL(c.req.url).searchParams)
      : await c.req.json().catch(() => ({}))

    const ctx = createFunctionContext(c, config, registry)

    try {
      let data = input

      for (const step of pipeline.steps) {
        if (step.skipIf && step.skipIf(data)) continue

        data = await executePipelineStep(step, data, ctx, registry)
      }

      return c.var.respond({ data })
    } catch (e) {
      const err = e as Error
      return c.var.respond({
        error: { message: err.message, code: 'PIPELINE_ERROR' },
        status: 500,
      })
    }
  }
}

// =============================================================================
// Helpers
// =============================================================================

function registerFunction(registry: Map<string, CallableFn>, fn: FunctionDef, _config: FunctionsConfig) {
  registry.set(fn.name, async (input, ctx) => {
    return fn.handler(input, ctx)
  })
}

function functionToMcpTool(fn: FunctionDef): McpTool {
  return {
    name: fn.name,
    description: fn.description,
    inputSchema: fn.input,
  }
}

function normalizePackageFunctions(pkg: PackageDef): Array<{ name: string; as?: string; description?: string; input?: JsonSchema; transformInput?: (i: unknown) => unknown; transformOutput?: (o: unknown) => unknown }> {
  return pkg.expose.map((item) => {
    if (typeof item === 'string') {
      return { name: item }
    }
    return item
  })
}

function createFunctionContext(c: Context<ApiEnv>, config: FunctionsConfig, registry: Map<string, CallableFn>): FunctionContext {
  const cache = createCacheHelper(c, config)

  return {
    c: c as Context,
    requestId: c.var.requestId,
    user: c.var.user ? { id: c.var.user.id || '', ...c.var.user } : undefined,
    env: c.env as Record<string, unknown>,
    fetch,
    cache,
    call: async <T>(name: string, input: unknown): Promise<T> => {
      const fn = registry.get(name)
      if (!fn) throw new Error(`Function not found: ${name}`)
      return fn(input, createFunctionContext(c, config, registry)) as Promise<T>
    },
  }
}

function createCacheHelper(c: Context<ApiEnv>, config: FunctionsConfig): CacheHelper {
  const kvBinding = config.cache ? (c.env as Record<string, KVNamespace>)[config.cache] : null

  return {
    async get<T>(key: string): Promise<T | null> {
      if (!kvBinding) return null
      return kvBinding.get(key, 'json')
    },
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      if (!kvBinding) return
      await kvBinding.put(key, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined)
    },
    async getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
      const cached = await this.get<T>(key)
      if (cached !== null) return cached
      const value = await fn()
      await this.set(key, value, ttl)
      return value
    },
  }
}

function buildCacheKey(prefix: string, input: unknown, template?: string): string {
  if (template) {
    let key = template
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      key = key.replace(`{${k}}`, String(v))
    }
    return `${prefix}:${key}`
  }
  return `${prefix}:${JSON.stringify(input)}`
}

async function getCacheValue(c: Context<ApiEnv>, config: FunctionsConfig, key: string): Promise<unknown | null> {
  const kvBinding = config.cache ? (c.env as Record<string, KVNamespace>)[config.cache] : null
  if (!kvBinding) return null
  return kvBinding.get(key, 'json')
}

async function setCacheValue(c: Context<ApiEnv>, config: FunctionsConfig, key: string, value: unknown, ttl?: number): Promise<void> {
  const kvBinding = config.cache ? (c.env as Record<string, KVNamespace>)[config.cache] : null
  if (!kvBinding) return
  await kvBinding.put(key, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined)
}

async function applyProxyAuth(req: { method: string; path: string; query: Record<string, string>; headers: Record<string, string>; body?: unknown }, auth: NonNullable<ProxyDef['auth']>, c: Context<ApiEnv>): Promise<typeof req> {
  switch (auth.type) {
    case 'bearer': {
      const token = auth.tokenVar ? (c.env as Record<string, string>)[auth.tokenVar] : auth.token
      if (token) req.headers['Authorization'] = `Bearer ${token}`
      break
    }
    case 'api-key': {
      const token = auth.tokenVar ? (c.env as Record<string, string>)[auth.tokenVar] : auth.token
      const header = auth.header || 'X-API-Key'
      if (token) req.headers[header] = token
      break
    }
    case 'basic': {
      const token = auth.tokenVar ? (c.env as Record<string, string>)[auth.tokenVar] : auth.token
      if (token) req.headers['Authorization'] = `Basic ${btoa(token)}`
      break
    }
    case 'custom': {
      if (auth.custom) {
        const ctx = createFunctionContext(c, {}, new Map())
        const result = await auth.custom(req as unknown as Parameters<NonNullable<typeof auth.custom>>[0], ctx)
        return result as typeof req
      }
      break
    }
  }
  return req
}

function deepMerge(target: Record<string, unknown>, ...sources: unknown[]): Record<string, unknown> {
  for (const source of sources) {
    if (source && typeof source === 'object') {
      for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          target[key] = deepMerge((target[key] || {}) as Record<string, unknown>, value)
        } else {
          target[key] = value
        }
      }
    }
  }
  return target
}

// =============================================================================
// Lookup Helpers
// =============================================================================

async function queryLookupSource(c: Context<ApiEnv>, lookup: LookupDef, options: { limit: number; offset: number }): Promise<unknown[]> {
  switch (lookup.source.type) {
    case 'static':
      return (lookup.source.data || []).slice(options.offset, options.offset + options.limit)

    case 'database': {
      const db = (c.env as Record<string, D1Database>)[lookup.source.binding || 'DB']
      const table = lookup.source.name || lookup.name
      const result = await db.prepare(`SELECT * FROM ${table} LIMIT ? OFFSET ?`).bind(options.limit, options.offset).all()
      return result.results || []
    }

    case 'kv': {
      const kv = (c.env as Record<string, KVNamespace>)[lookup.source.binding || 'KV']
      const prefix = lookup.source.name || lookup.name
      const list = await kv.list({ prefix: `${prefix}:`, limit: options.limit })
      const items = await Promise.all(list.keys.map((k) => kv.get(k.name, 'json')))
      return items.filter(Boolean)
    }

    default:
      return []
  }
}

async function searchLookupSource(c: Context<ApiEnv>, lookup: LookupDef, query: string, limit: number): Promise<unknown[]> {
  const q = query.toLowerCase()

  switch (lookup.source.type) {
    case 'static': {
      const fields = lookup.search?.fields || lookup.fields.filter((f) => f.indexed).map((f) => f.name)
      return (lookup.source.data || []).filter((item) => {
        const record = item as Record<string, unknown>
        return fields.some((field) => String(record[field] || '').toLowerCase().includes(q))
      }).slice(0, limit)
    }

    case 'database': {
      const db = (c.env as Record<string, D1Database>)[lookup.source.binding || 'DB']
      const table = lookup.source.name || lookup.name
      const fields = lookup.search?.fields || lookup.fields.filter((f) => f.indexed).map((f) => f.name)
      const where = fields.map((f) => `${f} LIKE ?`).join(' OR ')
      const params = fields.map(() => `%${query}%`)
      const result = await db.prepare(`SELECT * FROM ${table} WHERE ${where} LIMIT ?`).bind(...params, limit).all()
      return result.results || []
    }

    default:
      return []
  }
}

async function autocompleteLookupSource(c: Context<ApiEnv>, lookup: LookupDef, query: string, limit: number): Promise<unknown[]> {
  const field = lookup.autocomplete?.field || lookup.primaryKey
  const q = query.toLowerCase()

  switch (lookup.source.type) {
    case 'static': {
      return (lookup.source.data || []).filter((item) => {
        const value = String((item as Record<string, unknown>)[field] || '').toLowerCase()
        return value.startsWith(q)
      }).slice(0, limit)
    }

    case 'database': {
      const db = (c.env as Record<string, D1Database>)[lookup.source.binding || 'DB']
      const table = lookup.source.name || lookup.name
      const result = await db.prepare(`SELECT * FROM ${table} WHERE ${field} LIKE ? LIMIT ?`).bind(`${query}%`, limit).all()
      return result.results || []
    }

    default:
      return []
  }
}

async function getLookupById(c: Context<ApiEnv>, lookup: LookupDef, id: string): Promise<unknown | null> {
  switch (lookup.source.type) {
    case 'static':
      return (lookup.source.data || []).find((item) => (item as Record<string, unknown>)[lookup.primaryKey] === id) || null

    case 'database': {
      const db = (c.env as Record<string, D1Database>)[lookup.source.binding || 'DB']
      const table = lookup.source.name || lookup.name
      return db.prepare(`SELECT * FROM ${table} WHERE ${lookup.primaryKey} = ?`).bind(id).first()
    }

    case 'kv': {
      const kv = (c.env as Record<string, KVNamespace>)[lookup.source.binding || 'KV']
      const prefix = lookup.source.name || lookup.name
      return kv.get(`${prefix}:${id}`, 'json')
    }

    default:
      return null
  }
}

async function executePipelineStep(step: NonNullable<PipelineDef['steps']>[number], data: unknown, ctx: FunctionContext, registry: Map<string, CallableFn>): Promise<unknown> {
  switch (step.type) {
    case 'function': {
      const fn = registry.get(step.function!)
      if (!fn) throw new Error(`Function not found: ${step.function}`)
      return fn(data, ctx)
    }

    case 'transform':
      return step.transform!(data, ctx)

    case 'parallel': {
      const results = await Promise.all(
        (step.parallel || []).map((s) => executePipelineStep(s, data, ctx, registry))
      )
      return results
    }

    case 'condition': {
      if (step.condition!.if(data)) {
        let result = data
        for (const s of step.condition!.then) {
          result = await executePipelineStep(s, result, ctx, registry)
        }
        return result
      } else if (step.condition!.else) {
        let result = data
        for (const s of step.condition!.else) {
          result = await executePipelineStep(s, result, ctx, registry)
        }
        return result
      }
      return data
    }

    default:
      return data
  }
}
