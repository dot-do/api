/**
 * Proxy Snippet - Free API Proxy with Caching
 *
 * Executes within Cloudflare free tier constraints:
 * - < 5ms CPU time
 * - < 32KB compressed size
 * - No bindings (uses Cache API which is free)
 * - 2 subrequests (Pro) / 5 subrequests (Enterprise)
 *
 * Configuration via environment variables (set in CF dashboard):
 *   - PROXY_UPSTREAM: Base URL for upstream (e.g., https://api.example.com)
 *   - PROXY_AUTH_TYPE: "bearer" | "api-key" | "basic" | "none"
 *   - PROXY_AUTH_HEADER: Header name for API key auth (default: "X-Api-Key")
 *   - PROXY_AUTH_TOKEN: Auth token value (or env var name prefixed with $)
 *   - PROXY_CACHE_TTL: Cache TTL in seconds (0 = no cache)
 *   - PROXY_STRIP_PREFIX: Path prefix to strip before forwarding
 *   - PROXY_ADD_HEADERS: JSON string of headers to add (e.g., {"X-Custom": "value"})
 *   - PROXY_ALLOWED_METHODS: Comma-separated allowed methods (default: GET,POST,PUT,PATCH,DELETE)
 *   - PROXY_FLATTEN_DATA: "true" to extract .data from response (common API pattern)
 *
 * Usage:
 *   Deploy as snippet with rule: http.request.uri.path matches "/proxy/*"
 */

export interface ProxyEnv {
  PROXY_UPSTREAM?: string
  PROXY_AUTH_TYPE?: 'bearer' | 'api-key' | 'basic' | 'none'
  PROXY_AUTH_HEADER?: string
  PROXY_AUTH_TOKEN?: string
  PROXY_CACHE_TTL?: string
  PROXY_STRIP_PREFIX?: string
  PROXY_ADD_HEADERS?: string
  PROXY_ALLOWED_METHODS?: string
  PROXY_FLATTEN_DATA?: string
  [key: string]: string | undefined
}

export default {
  async fetch(request: Request, env: ProxyEnv): Promise<Request | Response> {
    const url = new URL(request.url)

    // Get config from env
    const upstream = env.PROXY_UPSTREAM
    if (!upstream) {
      return new Response(JSON.stringify({ error: { message: 'PROXY_UPSTREAM not configured', code: 'CONFIG_ERROR' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check allowed methods
    const allowedMethods = (env.PROXY_ALLOWED_METHODS || 'GET,POST,PUT,PATCH,DELETE').split(',')
    if (!allowedMethods.includes(request.method)) {
      return new Response(JSON.stringify({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Allow': allowedMethods.join(', ') },
      })
    }

    // Build upstream URL
    let path = url.pathname
    const stripPrefix = env.PROXY_STRIP_PREFIX
    if (stripPrefix && path.startsWith(stripPrefix)) {
      path = path.slice(stripPrefix.length) || '/'
    }
    const upstreamUrl = new URL(path + url.search, upstream)

    // Check cache for GET requests
    const cacheTtl = parseInt(env.PROXY_CACHE_TTL || '0', 10)
    const shouldCache = cacheTtl > 0 && request.method === 'GET'

    if (shouldCache) {
      const cache = caches.default
      const cacheKey = new Request(upstreamUrl.toString(), { method: 'GET' })
      const cached = await cache.match(cacheKey)

      if (cached) {
        // Return cached response with cache header
        const response = new Response(cached.body, cached)
        response.headers.set('X-Cache', 'HIT')
        return response
      }
    }

    // Build upstream request headers
    const headers = new Headers()

    // Copy safe headers from original request
    const safeHeaders = ['accept', 'accept-language', 'content-type', 'content-length']
    for (const name of safeHeaders) {
      const value = request.headers.get(name)
      if (value) headers.set(name, value)
    }

    // Add auth header
    const authType = env.PROXY_AUTH_TYPE || 'none'
    const authToken = env.PROXY_AUTH_TOKEN

    if (authType !== 'none' && authToken) {
      // Resolve token (could be direct value or $ENV_VAR reference)
      const token = authToken.startsWith('$') ? env[authToken.slice(1)] || '' : authToken

      if (authType === 'bearer') {
        headers.set('Authorization', `Bearer ${token}`)
      } else if (authType === 'api-key') {
        const authHeader = env.PROXY_AUTH_HEADER || 'X-Api-Key'
        headers.set(authHeader, token)
      } else if (authType === 'basic') {
        headers.set('Authorization', `Basic ${token}`)
      }
    }

    // Add custom headers
    if (env.PROXY_ADD_HEADERS) {
      try {
        const customHeaders = JSON.parse(env.PROXY_ADD_HEADERS) as Record<string, string>
        for (const [name, value] of Object.entries(customHeaders)) {
          headers.set(name, value)
        }
      } catch {
        // Ignore invalid JSON
      }
    }

    // Make upstream request
    const upstreamRequest = new Request(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    })

    let response: Response
    try {
      response = await fetch(upstreamRequest)
    } catch (err) {
      return new Response(JSON.stringify({ error: { message: 'Upstream request failed', code: 'UPSTREAM_ERROR' } }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Optional: flatten .data from response
    if (env.PROXY_FLATTEN_DATA === 'true' && response.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await response.json() as { data?: unknown }
        const data = body.data !== undefined ? body.data : body
        response = new Response(JSON.stringify(data), {
          status: response.status,
          headers: response.headers,
        })
      } catch {
        // Keep original response if JSON parsing fails
      }
    }

    // Add cache headers
    response = new Response(response.body, response)
    response.headers.set('X-Cache', 'MISS')
    response.headers.set('X-Upstream', upstream)

    // Cache successful GET responses
    if (shouldCache && response.ok) {
      const cache = caches.default
      const cacheKey = new Request(upstreamUrl.toString(), { method: 'GET' })
      const responseToCache = response.clone()

      // Set cache-control for CDN
      responseToCache.headers.set('Cache-Control', `public, max-age=${cacheTtl}`)

      // Don't await - fire and forget
      cache.put(cacheKey, responseToCache).catch(() => {})
    }

    return response
  },
}
