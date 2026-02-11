import type { MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ApiConfig, ApiEnv, RespondOptions, ResponseEnvelope } from './types'

export function responseMiddleware(config: ApiConfig): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    c.set('apiConfig', config)

    c.set('respond', <T = unknown>(options: RespondOptions<T>): Response => {
      const { data, key, links, actions, meta, status = 200, error, user } = options

      const url = new URL(c.req.url)
      const selfUrl = url.toString()

      const envelope: ResponseEnvelope<T> = {
        api: {
          name: config.name,
          description: config.description,
          url: `${url.protocol}//${url.host}${config.basePath || ''}`,
          type: getApiType(config),
          version: config.version,
        },
        success: !error,
        links: {
          self: selfUrl,
          ...links,
        },
        user: user || c.var.user,
      }

      if (error) {
        envelope.error = error
      } else if (key && key !== 'data') {
        ;(envelope as Record<string, unknown>)[key] = data
      } else {
        envelope.data = data
      }

      if (actions) envelope.actions = actions
      if (meta) envelope.meta = meta

      return c.json(envelope, status as ContentfulStatusCode)
    })

    await next()
  }
}

function getApiType(config: ApiConfig): string {
  if (config.proxy) return 'proxy'
  if (config.crud) return 'crud'
  if (config.rpc) return 'rpc'
  if (config.mcp) return 'mcp'
  return 'api'
}
