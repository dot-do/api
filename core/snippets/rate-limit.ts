/**
 * CDN-layer snippet: Rate limiting
 *
 * Rejects requests exceeding rate limits at the CDN layer before the worker
 * is invoked (zero cost rejection).
 *
 * Configuration variables (set in CF dashboard):
 *   - RATE_LIMIT: Max requests per period (default: 100)
 *   - RATE_PERIOD: Period in seconds (default: 60)
 *
 * Bindings required:
 *   - RATE_LIMITER: Rate limiting binding (type = "ratelimit")
 */
export default {
  async fetch(request: Request, env: Record<string, string> & { RATE_LIMITER?: RateLimiter }): Promise<Request | Response> {
    if (!env.RATE_LIMITER) return request

    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const { success } = await env.RATE_LIMITER.limit({ key: ip })

    if (!success) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Rate limit exceeded',
            code: 'RATE_LIMITED',
            status: 429,
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': env.RATE_PERIOD || '60',
          },
        },
      )
    }

    return request
  },
}

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}
