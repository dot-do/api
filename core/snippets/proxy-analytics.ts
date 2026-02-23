/**
 * Proxy Snippet with Analytics
 *
 * Full API proxy with analytics capture using the efficient pattern:
 * - Snippet buffers events and fires to Worker (fire-and-forget)
 * - Worker maintains hibernatable WebSocket to DO (95% cost savings)
 * - DO batches events before R2 flush (90-98% additional savings)
 * - Tested to 100k req/s
 *
 * Cost savings architecture:
 * ```
 * Snippet → HTTP/sendBeacon → Worker → WebSocket (hibernatable) → DO → R2
 *    │                           │                                  │
 *    └─ 1 req per batch          └─ 95% hibernation discount        └─ 90-98% batch savings
 * ```
 *
 * Configuration via environment variables:
 *   Proxy:
 *   - PROXY_UPSTREAM: Base URL for upstream
 *   - PROXY_AUTH_TYPE: "bearer" | "api-key" | "basic" | "none"
 *   - PROXY_AUTH_HEADER: Header name for API key auth
 *   - PROXY_AUTH_TOKEN: Auth token value
 *   - PROXY_CACHE_TTL: Cache TTL in seconds
 *   - PROXY_STRIP_PREFIX: Path prefix to strip
 *
 *   Analytics:
 *   - ANALYTICS_ENDPOINT: Worker endpoint for events (e.g., https://analytics.workers.do/events)
 *   - ANALYTICS_WRITE_KEY: Write key for analytics
 *   - ANALYTICS_BUFFER_SIZE: Events to buffer before sending (default: 10)
 *   - ANALYTICS_FLUSH_MS: Max time to buffer (default: 5000)
 *
 * The snippet uses fire-and-forget HTTP POST to the Worker, which then uses
 * hibernatable WebSocket to forward to the BufferDO for maximum cost efficiency.
 */

export interface ProxyAnalyticsEnv {
  // Proxy config
  PROXY_UPSTREAM?: string
  PROXY_AUTH_TYPE?: 'bearer' | 'api-key' | 'basic' | 'none'
  PROXY_AUTH_HEADER?: string
  PROXY_AUTH_TOKEN?: string
  PROXY_CACHE_TTL?: string
  PROXY_STRIP_PREFIX?: string
  PROXY_ADD_HEADERS?: string
  PROXY_FLATTEN_DATA?: string

  // Analytics config
  ANALYTICS_ENDPOINT?: string
  ANALYTICS_WRITE_KEY?: string
  ANALYTICS_BUFFER_SIZE?: string
  ANALYTICS_FLUSH_MS?: string

  [key: string]: string | undefined
}

interface AnalyticsEvent {
  timestamp: number
  type: string
  source: string
  importance: 'debug' | 'info' | 'warn' | 'error'
  data: {
    method: string
    path: string
    upstream: string
    status: number
    cache: 'HIT' | 'MISS' | 'SKIP'
    duration: number
    country?: string
    colo?: string
    asn?: number
    userAgent?: string
  }
}

// Global state (persists across requests in the same isolate - free!)
let eventBuffer: AnalyticsEvent[] = []
let inFlight: AnalyticsEvent[] = [] // Events currently being sent
let lastFlush = Date.now()
let consecutiveFailures = 0
let flushInProgress = false
const MAX_BUFFER_SIZE = 1000 // Prevent unbounded growth
const MAX_RETRY_FAILURES = 5 // Drop events after this many failures

/**
 * Flush events to analytics Worker - only removes from state on confirmed write
 *
 * The Worker maintains a hibernatable WebSocket to the BufferDO,
 * providing 95% cost savings. The DO batches before R2 flush for
 * another 90-98% savings.
 *
 * Events stay in memory until confirmed delivered. On failure, they're
 * retried on the next request. This is free - isolate state persists.
 */
function flushEvents(env: ProxyAnalyticsEnv): void {
  if (!env.ANALYTICS_ENDPOINT) return
  if (flushInProgress) return // Don't overlap flushes
  if (eventBuffer.length === 0 && inFlight.length === 0) return

  // Move buffer to in-flight (keep events until confirmed)
  const eventsToSend = [...inFlight, ...eventBuffer].slice(0, MAX_BUFFER_SIZE)
  if (eventsToSend.length === 0) return

  inFlight = eventsToSend
  eventBuffer = eventBuffer.slice(eventsToSend.length - inFlight.length) // Keep overflow
  flushInProgress = true
  lastFlush = Date.now()

  // POST to Worker endpoint - only clear on success
  fetch(env.ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writeKey: env.ANALYTICS_WRITE_KEY,
      events: eventsToSend,
    }),
  })
    .then((res) => {
      flushInProgress = false
      if (res.ok) {
        // Confirmed write - NOW we can clear the in-flight buffer
        inFlight = []
        consecutiveFailures = 0
      } else {
        // Server rejected - keep events for retry
        throw new Error(`HTTP ${res.status}`)
      }
    })
    .catch(() => {
      flushInProgress = false
      consecutiveFailures++

      // Keep events in inFlight for retry (already there)
      // After MAX_RETRY_FAILURES, drop oldest events to prevent memory growth
      if (consecutiveFailures >= MAX_RETRY_FAILURES) {
        // Drop oldest half to make room
        inFlight = inFlight.slice(Math.floor(inFlight.length / 2))
        consecutiveFailures = 0
      }
    })
}

/**
 * Queue an analytics event
 */
function queueEvent(event: AnalyticsEvent, env: ProxyAnalyticsEnv): void {
  eventBuffer.push(event)

  const bufferSize = parseInt(env.ANALYTICS_BUFFER_SIZE || '10', 10)
  const flushMs = parseInt(env.ANALYTICS_FLUSH_MS || '5000', 10)

  // Flush if buffer is full or time exceeded
  if (eventBuffer.length >= bufferSize || (Date.now() - lastFlush) >= flushMs) {
    flushEvents(env)
  }
}

export default {
  async fetch(request: Request, env: ProxyAnalyticsEnv): Promise<Request | Response> {
    const startTime = Date.now()
    const url = new URL(request.url)
    const cf = (request as unknown as { cf?: { country?: string; colo?: string; asn?: number } }).cf

    // Get upstream config
    const upstream = env.PROXY_UPSTREAM
    if (!upstream) {
      return new Response(JSON.stringify({ error: { message: 'PROXY_UPSTREAM not configured' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build upstream URL
    let path = url.pathname
    const stripPrefix = env.PROXY_STRIP_PREFIX
    if (stripPrefix && path.startsWith(stripPrefix)) {
      path = path.slice(stripPrefix.length) || '/'
    }
    const upstreamUrl = new URL(path + url.search, upstream)

    // Check cache for GET requests
    const cacheTtl = parseInt(env.PROXY_CACHE_TTL || '0', 10)
    const shouldCache = cacheTtl > 0 && request.method === 'GET'
    let cacheStatus: 'HIT' | 'MISS' | 'SKIP' = 'SKIP'

    if (shouldCache) {
      const cache = caches.default
      const cacheKey = new Request(upstreamUrl.toString(), { method: 'GET' })
      const cached = await cache.match(cacheKey)

      if (cached) {
        cacheStatus = 'HIT'
        const response = new Response(cached.body, cached)
        response.headers.set('X-Cache', 'HIT')

        // Queue analytics event
        queueEvent({
          timestamp: Date.now(),
          type: 'proxy_request',
          source: 'snippet',
          importance: 'info',
          data: {
            method: request.method,
            path: url.pathname,
            upstream,
            status: response.status,
            cache: 'HIT',
            duration: Date.now() - startTime,
            country: cf?.country,
            colo: cf?.colo,
            asn: cf?.asn,
            userAgent: request.headers.get('user-agent') || undefined,
          },
        }, env)

        return response
      }
      cacheStatus = 'MISS'
    }

    // Build upstream request headers
    const headers = new Headers()
    const safeHeaders = ['accept', 'accept-language', 'content-type', 'content-length']
    for (const name of safeHeaders) {
      const value = request.headers.get(name)
      if (value) headers.set(name, value)
    }

    // Add auth header
    const authType = env.PROXY_AUTH_TYPE || 'none'
    const authToken = env.PROXY_AUTH_TOKEN
    if (authType !== 'none' && authToken) {
      const token = authToken.startsWith('$') ? env[authToken.slice(1)] || '' : authToken
      if (authType === 'bearer') {
        headers.set('Authorization', `Bearer ${token}`)
      } else if (authType === 'api-key') {
        headers.set(env.PROXY_AUTH_HEADER || 'X-Api-Key', token)
      } else if (authType === 'basic') {
        headers.set('Authorization', `Basic ${token}`)
      }
    }

    // Add custom headers
    if (env.PROXY_ADD_HEADERS) {
      try {
        const customHeaders = JSON.parse(env.PROXY_ADD_HEADERS) as Record<string, string>
        for (const [name, value] of Object.entries(customHeaders)) {
          headers.set(name, value)
        }
      } catch {}
    }

    // Make upstream request
    let response: Response
    try {
      response = await fetch(new Request(upstreamUrl.toString(), {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      }))
    } catch {
      // Queue error analytics
      queueEvent({
        timestamp: Date.now(),
        type: 'proxy_error',
        source: 'snippet',
        importance: 'error',
        data: {
          method: request.method,
          path: url.pathname,
          upstream,
          status: 502,
          cache: cacheStatus,
          duration: Date.now() - startTime,
          country: cf?.country,
          colo: cf?.colo,
          asn: cf?.asn,
        },
      }, env)

      return new Response(JSON.stringify({ error: { message: 'Upstream request failed' } }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Optional: flatten .data from response
    if (env.PROXY_FLATTEN_DATA === 'true' && response.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await response.json() as { data?: unknown }
        const data = body.data !== undefined ? body.data : body
        response = new Response(JSON.stringify(data), {
          status: response.status,
          headers: response.headers,
        })
      } catch {}
    }

    // Add cache/proxy headers
    response = new Response(response.body, response)
    response.headers.set('X-Cache', cacheStatus)
    response.headers.set('X-Upstream', upstream)

    // Cache successful GET responses
    if (shouldCache && response.ok) {
      const cache = caches.default
      const cacheKey = new Request(upstreamUrl.toString(), { method: 'GET' })
      const responseToCache = response.clone()
      responseToCache.headers.set('Cache-Control', `public, max-age=${cacheTtl}`)
      cache.put(cacheKey, responseToCache).catch(() => {})
    }

    // Queue analytics event
    queueEvent({
      timestamp: Date.now(),
      type: 'proxy_request',
      source: 'snippet',
      importance: 'info',
      data: {
        method: request.method,
        path: url.pathname,
        upstream,
        status: response.status,
        cache: cacheStatus,
        duration: Date.now() - startTime,
        country: cf?.country,
        colo: cf?.colo,
        asn: cf?.asn,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    }, env)

    return response
  },
}
