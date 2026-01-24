import type { MiddlewareHandler } from 'hono'
import type { ApiEnv } from '../types'

/**
 * Cloudflare's IncomingRequestCfProperties interface (partial)
 * @see https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
 */
interface CloudflareCfProperties {
  country?: string
  city?: string
  continent?: string
  latitude?: string
  longitude?: string
  region?: string
  timezone?: string
  [key: string]: string | undefined
}

/**
 * Request with Cloudflare-specific cf property
 */
interface RequestWithCf extends Request {
  cf?: CloudflareCfProperties
}

export function contextMiddleware(): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const requestId = c.req.header('cf-ray') || c.req.header('x-request-id') || crypto.randomUUID()
    c.set('requestId', requestId)

    const cf = (c.req.raw as RequestWithCf).cf
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
