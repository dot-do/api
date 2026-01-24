import { Hono } from 'hono'
import type { ApiEnv, ProxyConfig } from '../types'
import { validateProxyPath } from '../helpers/path'

export function proxyConvention(config: ProxyConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()

  app.all('/*', async (c) => {
    const url = new URL(c.req.url)
    const upstreamUrl = new URL(config.upstream)

    // Get original path from header (if set by edge server/CDN before URL normalization)
    const originalPath = c.req.header('X-Original-Path')

    // Validate path to prevent SSRF and path traversal attacks
    const validation = validateProxyPath(url.pathname, {
      allowedPaths: config.allowedPaths,
      blockTraversal: config.blockTraversal,
      originalPath
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

    // Use normalized path for upstream request
    const normalizedPath = validation.normalized

    // Rewrite path (applied after normalization for security)
    const path = config.rewritePath
      ? config.rewritePath(normalizedPath)
      : normalizedPath

    upstreamUrl.pathname = path
    upstreamUrl.search = url.search

    // Build upstream request headers
    const headers = new Headers(c.req.raw.headers)
    headers.delete('host')
    headers.set('host', upstreamUrl.host)

    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        headers.set(key, value)
      }
    }

    // Add user context if available
    if (c.var.user) {
      headers.set('X-User-Id', c.var.user.id || '')
      headers.set('X-User-Email', c.var.user.email || '')
    }

    const upstreamReq = new Request(upstreamUrl.toString(), {
      method: c.req.method,
      headers,
      body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
    })

    const response = await fetch(upstreamReq, {
      cf: config.cacheTtl ? { cacheTtl: config.cacheTtl } : undefined,
    } as RequestInit)

    // If upstream returns JSON, wrap in envelope
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      let data: unknown
      try {
        data = await response.json()
      } catch (parseError) {
        // Upstream claimed JSON but returned invalid JSON
        return c.var.respond({
          error: {
            code: 'UPSTREAM_INVALID_JSON',
            message: 'Upstream returned invalid JSON',
            status: 502,
            details: {
              upstream: config.upstream,
              contentType,
              parseError: parseError instanceof Error ? parseError.message : String(parseError),
            },
          },
          status: 502,
        })
      }
      return c.var.respond({
        data,
        meta: {
          upstream: config.upstream,
          status: response.status,
        },
      })
    }

    // Pass through non-JSON responses
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    })
  })

  return app
}
