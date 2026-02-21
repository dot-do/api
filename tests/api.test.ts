import { describe, it, expect } from 'vitest'
import { API } from '../src/index'

describe('API factory', () => {
  it('creates a Hono app with root endpoint', async () => {
    const app = API({ name: 'test-api', description: 'Test', version: '1.0.0' })

    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.api.name).toBe('test-api')
    expect(body.api.description).toBe('Test')
    expect(body.api.version).toBe('1.0.0')
    expect(body.data.name).toBe('test-api')
  })

  it('sets api.type based on config', async () => {
    const crudApp = API({ name: 'crud-api', crud: { db: 'DB', table: 'items' } })
    const res = await crudApp.request('/')
    const body = await res.json()
    expect(body.api.type).toBe('crud')

    const proxyApp = API({ name: 'proxy-api', proxy: { upstream: 'https://example.com' } })
    const res2 = await proxyApp.request('/')
    const body2 = await res2.json()
    expect(body2.api.type).toBe('proxy')
  })

  it('supports custom routes', async () => {
    const app = API({
      name: 'custom-api',
      routes: (a) => {
        a.get('/health', (c) => c.var.respond({ data: { status: 'ok' } }))
      },
    })

    const res = await app.request('/health')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.status).toBe('ok')
  })

  it('includes links.self in responses', async () => {
    const app = API({ name: 'links-api' })

    const res = await app.request('http://localhost/')
    const body = await res.json()
    expect(body.links.self).toBe('http://localhost/')
  })

  it('includes CORS headers', async () => {
    const app = API({ name: 'cors-api' })

    const res = await app.request('/', {
      method: 'OPTIONS',
      headers: { Origin: 'http://example.com' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('includes X-Request-Id header', async () => {
    const app = API({ name: 'request-id-api' })

    const res = await app.request('/')
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })
})

describe('API zero-config', () => {
  it('creates a valid Hono app with no args', async () => {
    const app = API()

    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.api.name).toBe('api')
  })

  it('creates app with functions-only input', async () => {
    const scoreFn = (contact: unknown) => ({ value: 87, grade: 'A' })
    const app = API({
      score: scoreFn,
    })

    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.api.name).toBe('api')
  })

  it('creates app with mixed config and functions', async () => {
    const scoreFn = (contact: unknown) => ({ value: 87 })
    const app = API({
      name: 'crm.do',
      description: 'AI-native CRM',
      score: scoreFn,
    })

    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.api.name).toBe('crm.do')
    expect(body.api.description).toBe('AI-native CRM')
  })

  it('backward compatible — full ApiConfig still works', async () => {
    const app = API({
      name: 'legacy-api',
      description: 'Legacy',
      version: '1.0.0',
      routes: (a) => {
        a.get('/ping', (c) => c.var.respond({ data: 'pong' }))
      },
    })

    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.api.name).toBe('legacy-api')

    const pingRes = await app.request('/ping')
    expect(pingRes.status).toBe(200)
    const pingBody = await pingRes.json()
    expect(pingBody.data).toBe('pong')
  })
})
