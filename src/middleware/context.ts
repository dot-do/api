import type { MiddlewareHandler } from 'hono'
import type { ApiEnv } from '../types'

export function contextMiddleware(): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const requestId = c.req.header('cf-ray') || c.req.header('x-request-id') || crypto.randomUUID()
    c.set('requestId', requestId)

    const cf = (c.req.raw as unknown as { cf?: Record<string, string> }).cf
    if (cf) {
      c.set('geo', {
        country: cf.country,
        city: cf.city,
        continent: cf.continent,
        latitude: cf.latitude,
        longitude: cf.longitude,
        region: cf.region,
        timezone: cf.timezone,
      })
    }

    c.header('X-Request-Id', requestId)
    await next()
  }
}
