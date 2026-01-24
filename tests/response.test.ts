import { describe, it, expect } from 'vitest'
import { API } from '../src/index'

describe('Response envelope', () => {
  it('wraps data in standard envelope', async () => {
    const app = API({
      name: 'envelope-test',
      routes: (a) => {
        a.get('/items', (c) => c.var.respond({ data: [{ id: 1 }, { id: 2 }] }))
      },
    })

    const res = await app.request('/items')
    const body = await res.json()

    expect(body.api.name).toBe('envelope-test')
    expect(body.links.self).toContain('/items')
    expect(body.data).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('supports custom key instead of data', async () => {
    const app = API({
      name: 'key-test',
      routes: (a) => {
        a.get('/users', (c) => c.var.respond({ data: [{ id: 1 }], key: 'users' }))
      },
    })

    const res = await app.request('/users')
    const body = await res.json()

    expect(body.users).toEqual([{ id: 1 }])
    expect(body.data).toBeUndefined()
  })

  it('includes meta when provided', async () => {
    const app = API({
      name: 'meta-test',
      routes: (a) => {
        a.get('/items', (c) =>
          c.var.respond({
            data: [],
            meta: { total: 100, limit: 25, offset: 0 },
          }),
        )
      },
    })

    const res = await app.request('/items')
    const body = await res.json()

    expect(body.meta.total).toBe(100)
    expect(body.meta.limit).toBe(25)
  })

  it('includes actions when provided', async () => {
    const app = API({
      name: 'actions-test',
      routes: (a) => {
        a.get('/items', (c) =>
          c.var.respond({
            data: [],
            actions: { create: { method: 'POST', href: '/items' } },
          }),
        )
      },
    })

    const res = await app.request('/items')
    const body = await res.json()

    expect(body.actions.create.method).toBe('POST')
    expect(body.actions.create.href).toBe('/items')
  })

  it('returns error envelope', async () => {
    const app = API({
      name: 'error-test',
      routes: (a) => {
        a.get('/fail', (c) =>
          c.var.respond({
            error: { message: 'Something went wrong', code: 'OOPS', status: 500 },
            status: 500,
          }),
        )
      },
    })

    const res = await app.request('/fail')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error.message).toBe('Something went wrong')
    expect(body.error.code).toBe('OOPS')
  })

  it('sets custom status codes', async () => {
    const app = API({
      name: 'status-test',
      routes: (a) => {
        a.post('/items', (c) => c.var.respond({ data: { id: 'new' }, status: 201 }))
      },
    })

    const res = await app.request('/items', { method: 'POST' })
    expect(res.status).toBe(201)
  })

  it('includes user info when available', async () => {
    const app = API({
      name: 'user-test',
      routes: (a) => {
        a.get('/me', (c) => {
          return c.var.respond({
            data: { greeting: 'hello' },
            user: { id: 'u1', email: 'test@example.com' },
          })
        })
      },
    })

    const res = await app.request('/me')
    const body = await res.json()
    expect(body.user.id).toBe('u1')
    expect(body.user.email).toBe('test@example.com')
  })
})
