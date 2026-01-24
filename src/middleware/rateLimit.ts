import type { MiddlewareHandler } from 'hono'
import type { ApiEnv, RateLimitConfig } from '../types'

export function rateLimitMiddleware(config: RateLimitConfig): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const binding = (c.env as Record<string, unknown>)[config.binding] as RateLimiter | undefined
    if (!binding) {
      await next()
      return
    }

    const key = c.var.user?.id || c.req.header('cf-connecting-ip') || 'anonymous'
    const { success } = await binding.limit({ key })

    if (!success) {
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

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}
