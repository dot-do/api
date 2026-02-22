import type { Context, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Actions, ApiConfig, ApiEnv, RespondOptions, ResponseEnvelope, UserContext, UserInfo } from './types'

export function responseMiddleware(config: ApiConfig): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    c.set('apiConfig', config)

    c.set('respond', <T = unknown>(options: RespondOptions<T>): Response => {
      const { data, key, links, actions, options: opts, status = 200, error, user } = options

      const url = new URL(c.req.url)
      const selfUrl = url.toString()
      const baseUrl = `${url.protocol}//${url.host}${config.basePath || ''}`

      const apiType = getApiType(config)

      const envelope: ResponseEnvelope = {
        api: {
          name: config.name,
          ...(config.description && { description: config.description }),
          url: baseUrl,
          ...(apiType !== 'api' && { type: apiType }),
          ...(config.version && { version: config.version }),
        },
      }

      // MDXLD identifiers
      if (options.$context) envelope.$context = options.$context
      if (options.$type) envelope.$type = options.$type
      if (options.$id) envelope.$id = options.$id

      // Pagination summary (lists only)
      if (options.total !== undefined) envelope.total = options.total
      if (options.limit !== undefined) envelope.limit = options.limit
      if (options.page !== undefined) envelope.page = options.page

      // Backcompat: pull total/limit from meta if not provided at top level
      if (options.meta && options.total === undefined && options.meta.total !== undefined) {
        envelope.total = options.meta.total
      }
      if (options.meta && options.limit === undefined && options.meta.limit !== undefined) {
        envelope.limit = options.meta.limit
      }

      // Backcompat: pass through meta for conventions that still use it
      if (options.meta) {
        ;(envelope as Record<string, unknown>).meta = options.meta
      }

      // HATEOAS links — always include self
      envelope.links = {
        self: selfUrl,
        home: baseUrl,
        ...links,
      }

      // Payload or error
      if (error) {
        envelope.error = error
      } else {
        const payloadKey = key || 'data'
        ;(envelope as Record<string, unknown>)[payloadKey] = data
      }

      // Mutation links — normalize legacy {method, href} objects to plain URL strings
      if (actions) envelope.actions = normalizeActions(actions, baseUrl)

      // View customization links
      if (opts) envelope.options = opts

      // Caller context — always last (always included, even for anonymous)
      const resolvedUser = user || c.var.user || { authenticated: false }
      const enriched = enrichUserContext(normalizeUser(resolvedUser), c)
      ;(envelope as Record<string, unknown>).user = enriched

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

/**
 * Normalize actions — convert legacy {method, href} objects to plain URL strings.
 * If the href is relative, resolve against baseUrl.
 */
function normalizeActions(actions: Actions, baseUrl: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [name, value] of Object.entries(actions)) {
    if (typeof value === 'string') {
      result[name] = value
    } else if (value && typeof value === 'object' && 'href' in value) {
      // Legacy format: { method: 'POST', href: '/path' } → resolve to full URL
      const href = value.href
      if (href.startsWith('http://') || href.startsWith('https://')) {
        result[name] = href
      } else {
        result[name] = `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`
      }
    }
  }
  return result
}

/**
 * Normalize legacy UserInfo into the new UserContext shape.
 * If the object already has `authenticated`, pass through as-is.
 */
function normalizeUser(raw: UserContext | UserInfo): UserContext {
  if ('authenticated' in raw) return raw as UserContext
  // Legacy UserInfo → UserContext bridge
  const result: UserContext = {
    authenticated: Boolean(raw.id || raw.email),
  }
  if (raw.id) result.id = raw.id
  if (raw.name) result.name = raw.name
  if (raw.email) result.email = raw.email
  return result
}

/**
 * Enrich user context with geo/request metadata from Cloudflare's cf object.
 * Produces the rich user object matching the .do ecosystem convention
 * (e.g. apis.vin, colo.do).
 */
function enrichUserContext(user: UserContext, c: Context): Record<string, unknown> {
  const cf = (c.req.raw as { cf?: Record<string, unknown> }).cf
  const result: Record<string, unknown> = { ...user }

  // Request metadata
  result.requestId = c.req.header('cf-ray') || c.req.header('x-request-id')

  if (cf) {
    if (cf.asOrganization) result.isp = cf.asOrganization
    if (cf.country) {
      result.country = cf.country
      result.flag = countryFlag(cf.country as string)
    }
    if (cf.city) result.city = cf.city
    if (cf.region) result.region = cf.region
    if (cf.postalCode) result.zipcode = cf.postalCode
    if (cf.metroCode) result.metro = cf.metroCode
    if (cf.continent) result.continent = cf.continent
    if (cf.timezone) {
      result.timezone = cf.timezone
      result.localTime = new Date().toLocaleString('en-US', { timeZone: cf.timezone as string })
    }
    if (cf.colo) result.edgeLocation = cf.colo
    if (cf.clientTcpRtt) result.latencyMilliseconds = cf.clientTcpRtt
  }

  return result
}

/** Convert ISO 3166-1 alpha-2 country code to flag emoji */
function countryFlag(code: string): string {
  if (code.length !== 2) return code
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)))
}
