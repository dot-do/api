/**
 * Response Modes Middleware
 *
 * Intercepts JSON responses and transforms them based on query parameters:
 *
 * - `?domains` — rewrites all links from path-style (apis.do/events) to domain-style (events.do)
 * - `?stream` — converts JSON response to SSE text/event-stream
 * - `?raw` — strips the response envelope, returns just the data field
 * - `?debug` — adds debug metadata (timing, request headers, route info)
 * - `?format=md` — converts response to markdown table for agent consumption
 */

import type { MiddlewareHandler } from 'hono'
import type { ApiEnv } from '../types'

/** Supported response mode flags */
export type ResponseMode = 'domains' | 'stream' | 'raw' | 'debug' | 'format'

/** Configuration for the response modes middleware */
export interface ResponseModeConfig {
  /** Base domain used for domain-style rewrites (e.g., 'do' yields events.do, crm.do) */
  domainSuffix?: string
  /** Mapping of path segments to domain prefixes for ?domains rewriting */
  domainMap?: Record<string, string>
  /** Whether to include request headers in ?debug output. Defaults to true */
  debugHeaders?: boolean
}

/** Parsed set of active response modes from the current request */
interface ActiveModes {
  domains: boolean
  stream: boolean
  raw: boolean
  debug: boolean
  format: string | null
}

/**
 * Parse active response modes from query parameters.
 * Presence-only check for boolean flags (e.g., ?raw, ?stream).
 */
function parseResponseModes(url: URL): ActiveModes {
  return {
    domains: url.searchParams.has('domains'),
    stream: url.searchParams.has('stream'),
    raw: url.searchParams.has('raw'),
    debug: url.searchParams.has('debug'),
    format: url.searchParams.get('format'),
  }
}

/**
 * Check whether any response mode is active.
 */
function hasActiveMode(modes: ActiveModes): boolean {
  return modes.domains || modes.stream || modes.raw || modes.debug || modes.format !== null
}

/**
 * Rewrite a URL from path-style to domain-style.
 *
 * Path-style: https://apis.do/events
 * Domain-style: https://events.do
 *
 * Uses the domainMap for explicit mappings, falls back to extracting the
 * first path segment as the subdomain prefix.
 */
export function rewriteUrlToDomainStyle(urlStr: string, suffix: string, domainMap?: Record<string, string>): string {
  try {
    const url = new URL(urlStr)
    const pathSegments = url.pathname.split('/').filter(Boolean)

    if (pathSegments.length === 0) return urlStr

    const firstSegment = pathSegments[0]!

    // Skip tenant paths (~acme)
    if (firstSegment.startsWith('~')) return urlStr

    // Check explicit mapping first
    if (domainMap && domainMap[firstSegment]) {
      const domainPrefix = domainMap[firstSegment]!
      const remainingPath = pathSegments.slice(1).join('/')
      const newUrl = new URL(`${url.protocol}//${domainPrefix}.${suffix}`)
      newUrl.pathname = remainingPath ? `/${remainingPath}` : '/'
      newUrl.search = url.search
      newUrl.hash = url.hash
      return newUrl.toString().replace(/\/$/, '') || newUrl.origin
    }

    // Default: first segment becomes subdomain
    const remainingPath = pathSegments.slice(1).join('/')
    const newUrl = new URL(`${url.protocol}//${firstSegment}.${suffix}`)
    newUrl.pathname = remainingPath ? `/${remainingPath}` : '/'
    newUrl.search = url.search
    newUrl.hash = url.hash
    return newUrl.toString().replace(/\/$/, '') || newUrl.origin
  } catch {
    return urlStr
  }
}

/**
 * Recursively rewrite all URL string values in an object from path-style to domain-style.
 */
function rewriteLinksInObject(obj: unknown, suffix: string, domainMap?: Record<string, string>): unknown {
  if (typeof obj === 'string') {
    if (obj.startsWith('http://') || obj.startsWith('https://')) {
      return rewriteUrlToDomainStyle(obj, suffix, domainMap)
    }
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => rewriteLinksInObject(item, suffix, domainMap))
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = rewriteLinksInObject(value, suffix, domainMap)
    }
    return result
  }

  return obj
}

/**
 * Apply ?domains transform: rewrite all link URLs from path-style to domain-style.
 */
function applyDomainsTransform(
  body: Record<string, unknown>,
  config: ResponseModeConfig,
): Record<string, unknown> {
  const suffix = config.domainSuffix || 'do'

  // Rewrite links, actions, and options URL values
  if (body.links) {
    body.links = rewriteLinksInObject(body.links, suffix, config.domainMap)
  }
  if (body.actions) {
    body.actions = rewriteLinksInObject(body.actions, suffix, config.domainMap)
  }
  if (body.options) {
    body.options = rewriteLinksInObject(body.options, suffix, config.domainMap)
  }
  if (body.api && typeof body.api === 'object' && 'url' in (body.api as Record<string, unknown>)) {
    body.api = rewriteLinksInObject(body.api, suffix, config.domainMap)
  }

  return body
}

/**
 * Apply ?raw transform: strip the envelope, return just the data field.
 */
function applyRawTransform(body: Record<string, unknown>): unknown {
  // Look for the data payload — check common key names
  if ('data' in body) return body.data
  if ('error' in body) return body.error

  // Find the semantic payload key (anything that isn't a standard envelope field)
  const envelopeKeys = new Set(['api', 'links', 'actions', 'options', 'user', 'total', 'limit', 'page', 'meta', '$context', '$type', '$id'])
  for (const [key, value] of Object.entries(body)) {
    if (!envelopeKeys.has(key)) {
      return value
    }
  }

  return body
}

/**
 * Apply ?debug transform: add debug metadata.
 */
function applyDebugTransform(
  body: Record<string, unknown>,
  req: Request,
  startTime: number,
  config: ResponseModeConfig,
): Record<string, unknown> {
  const duration = Date.now() - startTime

  const debug: Record<string, unknown> = {
    timing: {
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    },
    request: {
      method: req.method,
      url: req.url,
    },
  }

  if (config.debugHeaders !== false) {
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      // Omit sensitive headers
      if (!key.toLowerCase().startsWith('authorization') && !key.toLowerCase().startsWith('cookie')) {
        headers[key] = value
      }
    })
    debug.request = {
      ...(debug.request as Record<string, unknown>),
      headers,
    }
  }

  body.debug = debug
  return body
}

/**
 * Convert response data to a markdown table.
 */
function toMarkdownTable(data: unknown): string {
  // Handle arrays of objects
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
    const items = data as Record<string, unknown>[]
    const columns = [...new Set(items.flatMap((item) => Object.keys(item)))]

    const header = `| ${columns.join(' | ')} |`
    const separator = `| ${columns.map(() => '---').join(' | ')} |`
    const rows = items.map((item) => {
      return `| ${columns.map((col) => formatMdValue(item[col])).join(' | ')} |`
    })

    return [header, separator, ...rows].join('\n')
  }

  // Handle single object as key-value table
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>)
    const header = '| Key | Value |'
    const separator = '| --- | --- |'
    const rows = entries.map(([key, value]) => `| ${key} | ${formatMdValue(value)} |`)
    return [header, separator, ...rows].join('\n')
  }

  // Handle map-style object (string values)
  if (data && typeof data === 'object') {
    return String(data)
  }

  return String(data ?? '')
}

/**
 * Format a value for use in a markdown table cell.
 */
function formatMdValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Apply ?format=md transform: convert to markdown.
 */
function applyFormatMdTransform(body: Record<string, unknown>): string {
  const sections: string[] = []

  // API header
  if (body.api && typeof body.api === 'object') {
    const api = body.api as Record<string, unknown>
    sections.push(`# ${api.name || 'API Response'}`)
    if (api.description) sections.push(`\n${api.description}`)
    sections.push('')
  }

  // Find the data payload
  const envelopeKeys = new Set(['api', 'links', 'actions', 'options', 'user', 'total', 'limit', 'page', 'meta', '$context', '$type', '$id', 'error', 'debug'])
  let dataKey = 'data'
  let dataValue: unknown = body.data

  if (!dataValue) {
    for (const [key, value] of Object.entries(body)) {
      if (!envelopeKeys.has(key)) {
        dataKey = key
        dataValue = value
        break
      }
    }
  }

  // Error
  if (body.error) {
    const err = body.error as Record<string, unknown>
    sections.push(`## Error\n`)
    sections.push(`**${err.code || 'ERROR'}**: ${err.message}`)
    sections.push('')
  }

  // Pagination info
  if (body.total !== undefined) {
    sections.push(`> ${body.total} total | page ${body.page || 1} | limit ${body.limit || '-'}`)
    sections.push('')
  }

  // Data table
  if (dataValue !== undefined && dataValue !== null) {
    sections.push(`## ${dataKey}\n`)
    sections.push(toMarkdownTable(dataValue))
    sections.push('')
  }

  // Links
  if (body.links && typeof body.links === 'object') {
    const links = body.links as Record<string, string>
    const linkEntries = Object.entries(links).filter(([, v]) => v)
    if (linkEntries.length > 0) {
      sections.push('## Links\n')
      for (const [name, url] of linkEntries) {
        sections.push(`- [${name}](${url})`)
      }
      sections.push('')
    }
  }

  // Actions
  if (body.actions && typeof body.actions === 'object') {
    const actions = body.actions as Record<string, string>
    const actionEntries = Object.entries(actions).filter(([, v]) => v)
    if (actionEntries.length > 0) {
      sections.push('## Actions\n')
      for (const [name, url] of actionEntries) {
        sections.push(`- [${name}](${url})`)
      }
      sections.push('')
    }
  }

  return sections.join('\n')
}

/**
 * Convert a JSON response body to an SSE event stream.
 *
 * Emits structured events:
 * - `event: api` — the api metadata
 * - `event: data` — the main payload (chunked if array)
 * - `event: links` — HATEOAS links
 * - `event: done` — signals end of stream
 */
function toSSEStream(body: Record<string, unknown>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      function send(event: string, data: unknown) {
        const json = JSON.stringify(data)
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${json}\n\n`))
      }

      // API metadata
      if (body.api) {
        send('api', body.api)
      }

      // Find the data payload
      const envelopeKeys = new Set(['api', 'links', 'actions', 'options', 'user', 'total', 'limit', 'page', 'meta', '$context', '$type', '$id', 'error', 'debug'])
      let dataValue: unknown = body.data

      if (dataValue === undefined) {
        for (const [key, value] of Object.entries(body)) {
          if (!envelopeKeys.has(key)) {
            dataValue = value
            break
          }
        }
      }

      // Error event
      if (body.error) {
        send('error', body.error)
      }

      // Data events — chunk arrays into individual items
      if (Array.isArray(dataValue)) {
        for (const item of dataValue) {
          send('data', item)
        }
      } else if (dataValue !== undefined && dataValue !== null) {
        send('data', dataValue)
      }

      // Links
      if (body.links) {
        send('links', body.links)
      }

      // Actions
      if (body.actions) {
        send('actions', body.actions)
      }

      // Debug
      if (body.debug) {
        send('debug', body.debug)
      }

      // Done signal
      send('done', { ok: true })

      controller.close()
    },
  })
}

/**
 * Create the response modes middleware.
 *
 * Intercepts JSON responses after downstream handlers and transforms
 * them based on query parameter flags.
 *
 * Processing order: debug (adds metadata) -> domains (rewrites URLs) -> raw/stream/format (output transform)
 */
export function responseModesMiddleware(config: ResponseModeConfig = {}): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const url = new URL(c.req.url)
    const modes = parseResponseModes(url)

    // No modes active — pass through untouched
    if (!hasActiveMode(modes)) {
      return next()
    }

    const startTime = Date.now()

    // Run downstream handlers
    await next()

    // Only transform JSON responses
    const res = c.res
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return

    // Clone and parse the response body
    let body: Record<string, unknown>
    try {
      body = (await res.json()) as Record<string, unknown>
    } catch {
      return
    }

    // Apply transforms in order

    // 1. Debug — adds metadata to the envelope
    if (modes.debug) {
      body = applyDebugTransform(body, c.req.raw, startTime, config)
    }

    // 2. Domains — rewrites URLs
    if (modes.domains) {
      body = applyDomainsTransform(body, config)
    }

    // 3. Output transforms (mutually exclusive — first match wins)

    // ?stream — SSE event stream
    if (modes.stream) {
      const stream = toSSEStream(body)
      c.res = new Response(stream, {
        status: res.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Request-Id': res.headers.get('X-Request-Id') || '',
        },
      })
      return
    }

    // ?format=md — markdown output
    if (modes.format === 'md') {
      const markdown = applyFormatMdTransform(body)
      c.res = new Response(markdown, {
        status: res.status,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'X-Request-Id': res.headers.get('X-Request-Id') || '',
        },
      })
      return
    }

    // ?raw — strip envelope
    if (modes.raw) {
      const rawData = applyRawTransform(body)
      c.res = new Response(JSON.stringify(rawData), {
        status: res.status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Request-Id': res.headers.get('X-Request-Id') || '',
        },
      })
      return
    }

    // Default: replace response with transformed body (debug/domains only)
    c.res = new Response(JSON.stringify(body), {
      status: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Request-Id': res.headers.get('X-Request-Id') || '',
      },
    })
  }
}
