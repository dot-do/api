import type { MiddlewareHandler } from 'hono'
import { Hono } from 'hono'
import type { ApiEnv, AnalyticsConfig } from '../types'

export function analyticsMiddleware(config: AnalyticsConfig): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const start = Date.now()
    await next()
    const duration = Date.now() - start

    const binding = (c.env as Record<string, unknown>)[config.binding] as AnalyticsEngine | undefined
    if (!binding) return

    const url = new URL(c.req.url)

    binding.writeDataPoint({
      blobs: [
        c.req.method,
        url.pathname,
        c.res.status.toString(),
        c.var.user?.id || '',
        c.var.requestId || '',
        c.req.header('cf-connecting-ip') || '',
        c.var.geo?.country || '',
      ],
      doubles: [duration, c.res.status],
      indexes: [config.dataset || 'requests'],
    })
  }
}

export function analyticsRoutes(config: AnalyticsConfig): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>()

  app.get('/analytics', async (c) => {
    const url = new URL(c.req.url)
    const since = url.searchParams.get('since') || '24h'
    const path = url.searchParams.get('path')

    return c.var.respond({
      data: {
        dataset: config.dataset || 'requests',
        since,
        path,
        note: 'Query Analytics Engine via CF API for full data',
      },
      links: {
        docs: 'https://developers.cloudflare.com/analytics/analytics-engine/',
      },
    })
  })

  return app
}

interface AnalyticsEngine {
  writeDataPoint(data: {
    blobs?: string[]
    doubles?: number[]
    indexes?: string[]
  }): void
}
