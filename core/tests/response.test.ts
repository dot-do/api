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
    expect(body.links.home).toBeDefined()
    expect(body.data).toEqual([{ id: 1 }, { id: 2 }])
    // success field should no longer exist
    expect(body.success).toBeUndefined()
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

  it('promotes total/limit from meta to top-level (backward compat)', async () => {
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

    expect(body.total).toBe(100)
    expect(body.limit).toBe(25)
  })

  it('supports top-level total/limit/page', async () => {
    const app = API({
      name: 'pagination-test',
      routes: (a) => {
        a.get('/items', (c) =>
          c.var.respond({
            data: [{ id: 1 }],
            total: 42,
            limit: 10,
            page: 3,
          }),
        )
      },
    })

    const res = await app.request('/items')
    const body = await res.json()

    expect(body.total).toBe(42)
    expect(body.limit).toBe(10)
    expect(body.page).toBe(3)
  })

  it('normalizes legacy actions to URL strings', async () => {
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

    // Legacy {method, href} should be normalized to a URL string
    expect(typeof body.actions.create).toBe('string')
    expect(body.actions.create).toContain('/items')
  })

  it('passes through string actions as-is', async () => {
    const app = API({
      name: 'string-actions-test',
      routes: (a) => {
        a.get('/items', (c) =>
          c.var.respond({
            data: [],
            actions: { create: 'https://api.example.com/items' },
          }),
        )
      },
    })

    const res = await app.request('/items')
    const body = await res.json()

    expect(body.actions.create).toBe('https://api.example.com/items')
  })

  it('returns error envelope without data', async () => {
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
    expect(body.data).toBeUndefined()
    expect(body.success).toBeUndefined()
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

  it('normalizes legacy UserInfo into UserContext', async () => {
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
    expect(body.user.authenticated).toBe(true)
    expect(body.user.id).toBe('u1')
    expect(body.user.email).toBe('test@example.com')
  })

  it('passes through UserContext as-is', async () => {
    const app = API({
      name: 'user-context-test',
      routes: (a) => {
        a.get('/me', (c) => {
          return c.var.respond({
            data: { greeting: 'hello' },
            user: {
              authenticated: true,
              level: 'L2',
              name: 'Alice',
              tenant: 'acme',
              plan: 'pro',
            },
          })
        })
      },
    })

    const res = await app.request('/me')
    const body = await res.json()
    expect(body.user.authenticated).toBe(true)
    expect(body.user.level).toBe('L2')
    expect(body.user.name).toBe('Alice')
    expect(body.user.tenant).toBe('acme')
    expect(body.user.plan).toBe('pro')
  })
})

describe('Response envelope — MDXLD identifiers', () => {
  it('includes $context, $type, $id when provided', async () => {
    const app = API({
      name: 'mdxld-test',
      routes: (a) => {
        a.get('/contact/:id', (c) =>
          c.var.respond({
            data: { name: 'Alice' },
            key: 'contact',
            $context: 'https://headless.ly/~acme',
            $type: 'https://headless.ly/~acme/contacts',
            $id: 'https://headless.ly/~acme/contacts/contact_abc123',
          }),
        )
      },
    })

    const res = await app.request('/contact/abc123')
    const body = await res.json()

    expect(body.$context).toBe('https://headless.ly/~acme')
    expect(body.$type).toBe('https://headless.ly/~acme/contacts')
    expect(body.$id).toBe('https://headless.ly/~acme/contacts/contact_abc123')
    expect(body.contact).toEqual({ name: 'Alice' })
  })

  it('omits MDXLD fields when not provided', async () => {
    const app = API({
      name: 'mdxld-omit-test',
      routes: (a) => {
        a.get('/items', (c) => c.var.respond({ data: [] }))
      },
    })

    const res = await app.request('/items')
    const body = await res.json()

    expect(body.$context).toBeUndefined()
    expect(body.$type).toBeUndefined()
    expect(body.$id).toBeUndefined()
  })
})

describe('Response envelope — options', () => {
  it('includes options block when provided', async () => {
    const app = API({
      name: 'options-test',
      routes: (a) => {
        a.get('/contacts', (c) =>
          c.var.respond({
            data: [],
            options: {
              sort_by_name: 'https://api.example.com/contacts?sort=name',
              sort_by_date: 'https://api.example.com/contacts?sort=date',
            },
          }),
        )
      },
    })

    const res = await app.request('/contacts')
    const body = await res.json()

    expect(body.options.sort_by_name).toBe('https://api.example.com/contacts?sort=name')
    expect(body.options.sort_by_date).toBe('https://api.example.com/contacts?sort=date')
  })
})

describe('Response envelope — reading order', () => {
  it('api is always first, user is always last', async () => {
    const app = API({
      name: 'order-test',
      routes: (a) => {
        a.get('/items', (c) =>
          c.var.respond({
            data: [{ id: 1 }],
            key: 'items',
            $context: 'https://headless.ly/~acme',
            $type: 'https://headless.ly/~acme/items',
            total: 1,
            limit: 10,
            page: 1,
            actions: { create: 'https://api.example.com/items' },
            options: { sort: 'https://api.example.com/items?sort=name' },
            user: { authenticated: true, name: 'Alice' },
          }),
        )
      },
    })

    const res = await app.request('/items')
    const body = await res.json()
    const keys = Object.keys(body)

    // api is the first key
    expect(keys[0]).toBe('api')
    // user is the last key
    expect(keys[keys.length - 1]).toBe('user')
  })
})
