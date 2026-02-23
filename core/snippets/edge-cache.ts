/**
 * Edge Cache Snippet - Free CDN Caching
 *
 * Caches responses at the edge using Cloudflare's free Cache API.
 * No bindings required - works within free tier constraints.
 *
 * Configuration via environment variables (set in CF dashboard):
 *   - CACHE_RULES: JSON string of path-to-TTL mappings
 *     Example: {"/**/static/**": 86400, "/api/config": 3600, "/health": 60}
 *   - DEFAULT_CACHE_TTL: Default cache TTL in seconds (0 = no cache)
 *   - CACHE_METHODS: Methods to cache (default: "GET")
 *   - CACHE_STATUSES: Status codes to cache (default: "200,201,204")
 *   - CACHE_KEY_INCLUDE_QUERY: "true" to include query string in cache key
 *   - CACHE_KEY_INCLUDE_HOST: "true" to include host in cache key (multi-tenant)
 *   - CACHE_BYPASS_HEADER: Header that bypasses cache if present (e.g., "X-Cache-Bypass")
 *   - CACHE_VARY_HEADERS: Comma-separated headers to vary on (e.g., "Accept,Accept-Language")
 *
 * Constraints:
 *   - < 5ms CPU time
 *   - < 32KB compressed size
 *   - No bindings - uses free caches.default API
 */

export interface CacheEnv {
  CACHE_RULES?: string
  DEFAULT_CACHE_TTL?: string
  CACHE_METHODS?: string
  CACHE_STATUSES?: string
  CACHE_KEY_INCLUDE_QUERY?: string
  CACHE_KEY_INCLUDE_HOST?: string
  CACHE_BYPASS_HEADER?: string
  CACHE_VARY_HEADERS?: string
}

export default {
  async fetch(request: Request, env: CacheEnv): Promise<Request | Response> {
    // Only cache specified methods (default: GET only)
    const cacheMethods = (env.CACHE_METHODS || 'GET').split(',')
    if (!cacheMethods.includes(request.method)) {
      return request // Pass through to origin
    }

    // Check bypass header
    if (env.CACHE_BYPASS_HEADER && request.headers.get(env.CACHE_BYPASS_HEADER)) {
      const newHeaders = new Headers(request.headers)
      newHeaders.set('X-Cache-Bypass', 'true')
      return new Request(request.url, { ...request, headers: newHeaders })
    }

    const url = new URL(request.url)

    // Build cache key
    let cacheKeyUrl = url.origin + url.pathname
    if (env.CACHE_KEY_INCLUDE_QUERY === 'true' && url.search) {
      cacheKeyUrl += url.search
    }
    if (env.CACHE_KEY_INCLUDE_HOST !== 'true') {
      // Normalize host for multi-tenant (default: include host)
      cacheKeyUrl = url.pathname + (env.CACHE_KEY_INCLUDE_QUERY === 'true' ? url.search : '')
    }

    // Include vary headers in cache key
    let varyKey = ''
    if (env.CACHE_VARY_HEADERS) {
      const varyHeaders = env.CACHE_VARY_HEADERS.split(',')
      varyKey = varyHeaders
        .map((h) => request.headers.get(h.trim()) || '')
        .join('|')
    }

    const cacheKey = new Request(cacheKeyUrl + (varyKey ? `#${varyKey}` : ''), {
      method: 'GET',
    })

    // Check cache
    const cache = caches.default
    const cached = await cache.match(cacheKey)

    if (cached) {
      // Return cached response
      const response = new Response(cached.body, cached)
      response.headers.set('X-Cache', 'HIT')
      response.headers.set('X-Cache-Key', cacheKeyUrl)
      return response
    }

    // Determine TTL from rules
    const rules: Record<string, number> = env.CACHE_RULES ? JSON.parse(env.CACHE_RULES) : {}
    const defaultTtl = parseInt(env.DEFAULT_CACHE_TTL || '0', 10)

    let ttl = defaultTtl
    for (const [pattern, ruleTtl] of Object.entries(rules)) {
      if (matchPath(url.pathname, pattern)) {
        ttl = ruleTtl
        break
      }
    }

    // If no caching, pass through
    if (ttl <= 0) {
      return request
    }

    // Fetch from origin
    const response = await fetch(request)

    // Check if status is cacheable
    const cacheStatuses = (env.CACHE_STATUSES || '200,201,204').split(',').map(Number)
    if (!cacheStatuses.includes(response.status)) {
      const newResponse = new Response(response.body, response)
      newResponse.headers.set('X-Cache', 'SKIP')
      return newResponse
    }

    // Clone and cache the response
    const responseToCache = new Response(response.body, response)
    responseToCache.headers.set('Cache-Control', `public, max-age=${ttl}`)
    responseToCache.headers.set('X-Cache', 'MISS')
    responseToCache.headers.set('X-Cache-Key', cacheKeyUrl)
    responseToCache.headers.set('X-Cache-TTL', String(ttl))

    // Store in cache (fire and forget)
    const responseToPut = responseToCache.clone()
    cache.put(cacheKey, responseToPut).catch(() => {})

    return responseToCache
  },
}

/**
 * Match path against glob-like pattern
 * Supports * (single segment) and ** (multiple segments)
 */
function matchPath(pathname: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\*\*/g, '___GLOBSTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___GLOBSTAR___/g, '.*')
  return new RegExp(`^${regex}$`).test(pathname)
}
