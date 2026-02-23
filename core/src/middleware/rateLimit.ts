import type { MiddlewareHandler } from 'hono'
import type { ApiEnv, RateLimitConfig } from '../types'

const DEFAULT_LIMIT = 1000
const DEFAULT_PERIOD = 60 // seconds

export function rateLimitMiddleware(config: RateLimitConfig): MiddlewareHandler<ApiEnv> {
  const limit = config.limit ?? DEFAULT_LIMIT
  const period = config.period ?? DEFAULT_PERIOD

  return async (c, next) => {
    const binding = (c.env as Record<string, unknown>)[config.binding] as RateLimiter | undefined
    if (!binding) {
      await next()
      return
    }

    const key = c.var.user?.id || c.req.header('cf-connecting-ip') || 'anonymous'
    const result = await binding.limit({ key })

    // Calculate reset time if not provided by the rate limiter
    const now = Math.floor(Date.now() / 1000)
    const reset = result.reset ?? now + period
    const remaining = result.remaining ?? (result.success ? limit - 1 : 0)

    // Set standard rate limit headers (RFC 6585 and common conventions)
    c.header('X-RateLimit-Limit', String(limit))
    c.header('X-RateLimit-Remaining', String(remaining))
    c.header('X-RateLimit-Reset', String(reset))

    if (!result.success) {
      // Calculate seconds until reset for Retry-After header
      const retryAfter = Math.max(1, reset - now)
      c.header('Retry-After', String(retryAfter))

      return c.json(
        {
          error: {
            message: 'Rate limit exceeded',
            code: 'RATE_LIMITED',
            status: 429,
          },
        },
        429,
      )
    }

    await next()
  }
}

interface RateLimitResult {
  success: boolean
  remaining?: number
  reset?: number
}

interface RateLimiter {
  limit(options: { key: string }): Promise<RateLimitResult>
}
