/**
 * Proxy Wrappers Sub-module
 *
 * Handles proxying requests to external APIs (Apollo.io, Stripe, etc.)
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv } from '../../types'
import type {
  FunctionsConfig,
  ProxyDef,
} from './types'
import {
  type McpTool,
  getCacheValue,
  setCacheValue,
  createFunctionContext,
} from './utils'
import { validateProxyPath } from '../../helpers/path'

// =============================================================================
// Proxy Auth Helpers
// =============================================================================

async function applyProxyAuth(
  req: {
    method: string
    path: string
    query: Record<string, string>
    headers: Record<string, string>
    body?: unknown
  },
  auth: NonNullable<ProxyDef['auth']>,
  c: Context<ApiEnv>
): Promise<typeof req> {
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

// =============================================================================
// Request Handler
// =============================================================================

export function createProxyHandler(proxy: ProxyDef, config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const url = new URL(c.req.url)
    const proxyPath = url.pathname.replace(new RegExp(`^${config.basePath || ''}/${proxy.name}`), '')

    // Get original path from header (if set by edge server/CDN before URL normalization)
    const originalPath = c.req.header('X-Original-Path')

    // Validate path to prevent path traversal attacks
    const validation = validateProxyPath(proxyPath || '/', {
      blockTraversal: true,
      originalPath,
    })

    if (!validation.valid) {
      const status = validation.error === 'PATH_NOT_ALLOWED' ? 403 : 400
      return c.var.respond({
        error: {
          code: validation.error,
          message: validation.message || 'Invalid path',
          status
        },
        status
      })
    }

    let req: {
      method: string
      path: string
      query: Record<string, string>
      headers: Record<string, string>
      body: unknown
    } = {
      method: c.req.method,
      path: validation.normalized,
      query: Object.fromEntries(url.searchParams),
      headers: {},
      body: undefined,
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

    let data: unknown
    try {
      data = await response.json()
    } catch (parseError) {
      // Upstream claimed JSON but returned invalid JSON
      const contentType = response.headers.get('content-type') || ''
      return c.var.respond({
        error: {
          code: 'UPSTREAM_INVALID_JSON',
          message: 'Upstream returned invalid JSON',
          details: {
            upstream: proxy.upstream,
            contentType,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
          },
        },
        status: 502,
      })
    }

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

// =============================================================================
// Route Registration
// =============================================================================

export function registerProxyRoutes(
  app: Hono<ApiEnv>,
  config: FunctionsConfig,
  mcpTools: McpTool[]
): void {
  const basePath = config.basePath || ''

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
}
