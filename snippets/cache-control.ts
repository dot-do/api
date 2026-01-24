/**
 * CDN-layer snippet: Cache control by path pattern
 *
 * Sets cache TTL based on path pattern matching. Allows static/semi-static
 * API responses to be cached at the CDN layer without worker invocation.
 *
 * Configuration variables (set in CF dashboard):
 *   - CACHE_RULES: JSON string of path-to-TTL mappings
 *     Example: {"/**/static/**": 86400, "/api/config": 3600, "/health": 60}
 *   - DEFAULT_TTL: Default cache TTL in seconds (0 = no cache, default)
 */
export default {
  async fetch(request: Request, env: Record<string, string>): Promise<Request | Response> {
    if (request.method !== 'GET') return request

    const url = new URL(request.url)
    const rules: Record<string, number> = env.CACHE_RULES ? JSON.parse(env.CACHE_RULES) : {}
    const defaultTtl = Number(env.DEFAULT_TTL) || 0

    let ttl = defaultTtl
    for (const [pattern, ruleTtl] of Object.entries(rules)) {
      if (matchPath(url.pathname, pattern)) {
        ttl = ruleTtl
        break
      }
    }

    if (ttl <= 0) return request

    // Set cache header for the worker/origin to respect
    const headers = new Headers(request.headers)
    headers.set('X-Snippet-Cache-TTL', String(ttl))

    return new Request(request.url, {
      method: request.method,
      headers,
      body: request.body,
    })
  },
}

function matchPath(pathname: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\*\*/g, '___GLOBSTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___GLOBSTAR___/g, '.*')
  return new RegExp(`^${regex}$`).test(pathname)
}
