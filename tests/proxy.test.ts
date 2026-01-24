import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { proxyConvention } from '../src/conventions/proxy'
import { responseMiddleware } from '../src/response'
import { contextMiddleware } from '../src/middleware/context'
import type { ApiEnv } from '../src/types'

describe('Proxy convention', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function createProxyApp(upstream: string, options: { cacheTtl?: number; headers?: Record<string, string> } = {}) {
    const app = new Hono<ApiEnv>()
    app.use('*', contextMiddleware())
    app.use('*', responseMiddleware({ name: 'proxy-test' }))
    app.route('/', proxyConvention({ upstream, ...options }))
    return app
  }

  it('proxies requests to upstream URL', async () => {
    const mockResponse = new Response(JSON.stringify({ result: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const app = createProxyApp('https://api.example.com')
    const res = await app.request('/data')

    expect(globalThis.fetch).toHaveBeenCalled()
    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const fetchedRequest = fetchCall[0] as Request
    expect(new URL(fetchedRequest.url).hostname).toBe('api.example.com')
    expect(new URL(fetchedRequest.url).pathname).toBe('/data')
  })

  it('wraps JSON upstream responses in envelope', async () => {
    const upstreamData = { users: [{ id: 1 }] }
    const mockResponse = new Response(JSON.stringify(upstreamData), {
      headers: { 'Content-Type': 'application/json' },
    })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const app = createProxyApp('https://api.example.com')
    const res = await app.request('/users')
    const body = await res.json()

    expect(body.api.name).toBe('proxy-test')
    expect(body.data).toEqual(upstreamData)
  })

  it('passes through non-JSON responses', async () => {
    const mockResponse = new Response('plain text', {
      headers: { 'Content-Type': 'text/plain' },
    })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const app = createProxyApp('https://api.example.com')
    const res = await app.request('/text')

    expect(await res.text()).toBe('plain text')
  })

  it('forwards query parameters', async () => {
    const mockResponse = new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const app = createProxyApp('https://api.example.com')
    await app.request('/search?q=test&page=2')

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const fetchedUrl = new URL((fetchCall[0] as Request).url)
    expect(fetchedUrl.searchParams.get('q')).toBe('test')
    expect(fetchedUrl.searchParams.get('page')).toBe('2')
  })

  it('adds custom headers to upstream request', async () => {
    const mockResponse = new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const app = createProxyApp('https://api.example.com', {
      headers: { 'X-Api-Key': 'secret123' },
    })
    await app.request('/data')

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const fetchedRequest = fetchCall[0] as Request
    expect(fetchedRequest.headers.get('X-Api-Key')).toBe('secret123')
  })

  it('passes cache TTL option to fetch', async () => {
    const mockResponse = new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const app = createProxyApp('https://api.example.com', { cacheTtl: 300 })
    await app.request('/cached')

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(fetchCall[1]).toEqual({ cf: { cacheTtl: 300 } })
  })

  it('constructs correct upstream URL from path', async () => {
    const mockResponse = new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

    const app = createProxyApp('https://api.github.com')
    await app.request('/repos/user/repo/issues')

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const fetchedUrl = new URL((fetchCall[0] as Request).url)
    expect(fetchedUrl.toString()).toBe('https://api.github.com/repos/user/repo/issues')
  })

  describe('SSRF prevention', () => {
    it('blocks paths containing .. in raw URL (when detectable)', async () => {
      const mockResponse = new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
      })
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

      const app = new Hono<ApiEnv>()
      app.use('*', contextMiddleware())
      app.use('*', responseMiddleware({ name: 'proxy-test' }))
      app.route('/', proxyConvention({
        upstream: 'https://api.example.com',
        blockTraversal: true
      }))

      // Use raw path with ..
      const req = new Request('http://localhost/public/../internal/secrets')
      // Add header with raw path to simulate edge server forwarding original path
      req.headers.set('X-Original-Path', '/public/../internal/secrets')

      const res = await app.fetch(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_PATH')
    })

    it('blocks encoded traversal via X-Original-Path header', async () => {
      const mockResponse = new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
      })
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

      const app = new Hono<ApiEnv>()
      app.use('*', contextMiddleware())
      app.use('*', responseMiddleware({ name: 'proxy-test' }))
      app.route('/', proxyConvention({
        upstream: 'https://api.example.com',
        blockTraversal: true
      }))

      // Use encoded path in header
      const req = new Request('http://localhost/internal/secrets')
      req.headers.set('X-Original-Path', '/public/%2e%2e/internal/secrets')

      const res = await app.fetch(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_PATH')
    })

    it('allows valid nested paths', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      })
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

      const app = createProxyApp('https://api.example.com')
      const res = await app.request('/api/v1/users/123')

      expect(res.status).toBe(200)
      expect(globalThis.fetch).toHaveBeenCalled()
    })

    it('enforces allowedPaths when configured', async () => {
      const mockResponse = new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
      })
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

      const app = new Hono<ApiEnv>()
      app.use('*', contextMiddleware())
      app.use('*', responseMiddleware({ name: 'proxy-test' }))
      app.route('/', proxyConvention({
        upstream: 'https://api.example.com',
        allowedPaths: ['/public', '/api']
      }))

      // Request to allowed path should succeed
      const res1 = await app.request('/public/data')
      expect(res1.status).toBe(200)

      // Request to disallowed path should fail
      const res2 = await app.request('/internal/secrets')
      expect(res2.status).toBe(403)
      const body = await res2.json()
      expect(body.error.code).toBe('PATH_NOT_ALLOWED')
    })

    it('blocks traversal attempts that bypass allowedPaths after normalization', async () => {
      const mockResponse = new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
      })
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

      const app = new Hono<ApiEnv>()
      app.use('*', contextMiddleware())
      app.use('*', responseMiddleware({ name: 'proxy-test' }))
      app.route('/', proxyConvention({
        upstream: 'https://api.example.com',
        allowedPaths: ['/public'],
        blockTraversal: true
      }))

      // The URL standard normalizes /public/../internal to /internal
      // But with blockTraversal and X-Original-Path, we detect the attempt
      const req = new Request('http://localhost/internal/secrets')
      req.headers.set('X-Original-Path', '/public/../internal/secrets')

      const res = await app.fetch(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_PATH')
    })

    it('does not allow bypassing allowedPaths via URL normalization', async () => {
      const mockResponse = new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
      })
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse)

      const app = new Hono<ApiEnv>()
      app.use('*', contextMiddleware())
      app.use('*', responseMiddleware({ name: 'proxy-test' }))
      app.route('/', proxyConvention({
        upstream: 'https://api.example.com',
        allowedPaths: ['/public']
      }))

      // Even though /public/../internal normalizes to /internal,
      // the result /internal should be blocked by allowedPaths
      // (URL class normalizes before we see it)
      const res = await app.request('/internal/secrets')
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error.code).toBe('PATH_NOT_ALLOWED')
    })
  })
})
