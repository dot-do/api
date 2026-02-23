import { env } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { databaseConvention } from '../../src/conventions/database'
import { responseMiddleware } from '../../src/response'
import { contextMiddleware } from '../../src/middleware/context'
import type { ApiEnv } from '../../src/types'

function createTestApp(schema: Record<string, Record<string, string>>) {
  const app = new Hono<ApiEnv>()

  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware({ name: 'database-test' }))

  const { routes } = databaseConvention({ schema, database: 'DATABASE' })
  app.route('', routes)

  return app
}

function createTestAppWithConfig(config: Parameters<typeof databaseConvention>[0]) {
  const app = new Hono<ApiEnv>()

  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware({ name: 'database-test' }))

  const result = databaseConvention({ ...config, database: 'DATABASE' })
  app.route('', result.routes)

  return { app, ...result }
}

// Pass real env with DATABASE binding from cloudflare:test
function req(app: Hono<ApiEnv>, path: string, init?: RequestInit) {
  return app.request(path, init, env)
}

// =============================================================================
// Input validation tests that require DB (successful creates/updates)
// =============================================================================

describe('Database convention input validation (DB-dependent)', () => {
  const schema = {
    User: {
      name: 'string!',
      email: 'string! #unique',
      age: 'number',
      active: 'boolean',
    },
    Post: {
      title: 'string!',
      content: 'text!',
      authorId: '-> User!',
    },
  }

  describe('CREATE validation (POST) - successful creates', () => {
    it('accepts valid data with all required fields', async () => {
      const app = createTestApp(schema)

      const res = await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          active: true,
        }),
      })

      expect(res.status).toBe(201)
    })

    it('accepts valid data with only required fields', async () => {
      const app = createTestApp(schema)

      const res = await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
        }),
      })

      expect(res.status).toBe(201)
    })
  })

  describe('UPDATE validation (PUT)', () => {
    it('returns 400 when field has wrong type on update', async () => {
      const app = createTestApp(schema)

      // First create a user
      await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'test-user-1',
          name: 'John',
          email: 'john@example.com',
        }),
      })

      // Then try to update with invalid data
      const res = await req(app, '/users/test-user-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Updated',
          email: 'john@example.com',
          age: 'invalid-number',
        }),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PATCH validation', () => {
    it('returns 400 when partial update has wrong type', async () => {
      const app = createTestApp(schema)

      // First create a user
      await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'test-user-2',
          name: 'Jane',
          email: 'jane@example.com',
        }),
      })

      // Then try to patch with invalid data
      const res = await req(app, '/users/test-user-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: 'not-a-boolean',
        }),
      })

      expect(res.status).toBe(400)
      const body = (await res.json()) as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
    })

    it('accepts valid partial updates (passes validation)', async () => {
      const app = createTestApp(schema)

      // First create a user - need to use the same app instance for persistence
      const createRes = await req(app, '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'test-user-3',
          name: 'Bob',
          email: 'bob@example.com',
        }),
      })
      expect(createRes.status).toBe(201)

      // Then patch with valid data - should not fail validation
      const res = await req(app, '/users/test-user-3', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: 35,
        }),
      })

      // The key assertion: valid data should NOT return a validation error
      // If it's 200, the update succeeded; if 404, the resource wasn't found
      // but validation passed. We just ensure it's not 400 (validation failure)
      expect(res.status).not.toBe(400)
    })
  })
})

// =============================================================================
// REST Endpoints
// =============================================================================

describe('REST endpoints', () => {
  const schema = {
    Task: {
      title: 'string!',
      description: 'text',
      completed: 'boolean = false',
      priority: 'number = 0',
    },
  }

  it('creates a document and returns 201 with data', async () => {
    const app = createTestApp(schema)

    const createRes = await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'task-1',
        title: 'Test Task',
        description: 'A test task',
      }),
    })

    expect(createRes.status).toBe(201)
    const createBody = (await createRes.json()) as { data: Record<string, unknown> }
    expect(createBody.data.$id).toBe('task-1')
    expect(createBody.data.title).toBe('Test Task')
    expect(createBody.data.$version).toBe(1)
    expect(createBody.data.$createdAt).toBeDefined()
  })

  it('returns list structure with pagination metadata', async () => {
    const app = createTestApp(schema)

    const listRes = await req(app, '/tasks?limit=3')
    expect(listRes.status).toBe(200)
    const listBody = (await listRes.json()) as { data: unknown[]; meta: { total: number; limit: number; offset: number }; links: { self: string } }
    expect(listBody.data).toBeDefined()
    expect(Array.isArray(listBody.data)).toBe(true)
    expect(listBody.meta.limit).toBe(3)
    expect(listBody.meta.offset).toBe(0)
    expect(listBody.links.self).toBeDefined()
  })

  it('returns search structure with query metadata', async () => {
    const app = createTestApp(schema)

    const searchRes = await req(app, '/tasks/search?q=test')
    expect(searchRes.status).toBe(200)
    const searchBody = (await searchRes.json()) as { data: unknown[]; meta: { query: string } }
    expect(searchBody.meta.query).toBe('test')
    expect(Array.isArray(searchBody.data)).toBe(true)
  })

  it('returns 404 for non-existent document', async () => {
    const app = createTestApp(schema)

    const res = await req(app, '/tasks/non-existent-id')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('delete returns success structure', async () => {
    const app = createTestApp(schema)

    // Create a task first
    const createRes = await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'del-test', title: 'To Delete', status: 'open' }),
    })
    expect(createRes.status).toBe(201)

    const deleteRes = await req(app, '/tasks/del-test', {
      method: 'DELETE',
    })

    expect(deleteRes.status).toBe(200)
    const deleteBody = (await deleteRes.json()) as { data: { deleted: boolean; id: string } }
    expect(deleteBody.data.deleted).toBe(true)
    expect(deleteBody.data.id).toBe('del-test')
  })

  it('delete returns 404 for non-existent document', async () => {
    const app = createTestApp(schema)

    const deleteRes = await req(app, '/tasks/nonexistent', {
      method: 'DELETE',
    })

    expect(deleteRes.status).toBe(404)
    const body = (await deleteRes.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('respects custom limit parameter', async () => {
    const app = createTestApp(schema)

    const listRes = await req(app, '/tasks?limit=50')
    expect(listRes.status).toBe(200)
    const listBody = (await listRes.json()) as { meta: { limit: number } }
    expect(listBody.meta.limit).toBe(50)
  })

  it('respects offset parameter', async () => {
    const app = createTestApp(schema)

    const listRes = await req(app, '/tasks?offset=10')
    expect(listRes.status).toBe(200)
    const listBody = (await listRes.json()) as { meta: { offset: number } }
    expect(listBody.meta.offset).toBe(10)
  })

  it('validates PUT request body type', async () => {
    const app = createTestApp(schema)

    // First create (so the document exists)
    await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'put-test', title: 'Original' }),
    })

    // PUT with wrong type
    const putRes = await req(app, '/tasks/put-test', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 12345, // wrong type
      }),
    })

    expect(putRes.status).toBe(400)
    const body = (await putRes.json()) as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('validates PATCH request body type', async () => {
    const app = createTestApp(schema)

    const patchRes = await req(app, '/tasks/any-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed: 'not-a-boolean', // wrong type
      }),
    })

    expect(patchRes.status).toBe(400)
    const body = (await patchRes.json()) as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

// =============================================================================
// matchesWhere filter engine (via REST API)
// =============================================================================

describe('matchesWhere filter engine', () => {
  const schema = {
    Product: {
      name: 'string!',
      price: 'number!',
      category: 'string',
      active: 'boolean = true',
      stock: 'number = 0',
    },
  }

  async function seedProducts(app: Hono<ApiEnv>) {
    const products = [
      { id: 'p1', name: 'Widget', price: 10, category: 'tools', active: true, stock: 100 },
      { id: 'p2', name: 'Gadget', price: 25, category: 'electronics', active: true, stock: 50 },
      { id: 'p3', name: 'Doohickey', price: 50, category: 'tools', active: false, stock: 0 },
      { id: 'p4', name: 'Thingamajig', price: 100, category: 'electronics', active: true, stock: 200 },
      { id: 'p5', name: 'Whatchamacallit', price: 5, category: 'misc', active: false, stock: 10 },
    ]
    for (const p of products) {
      await req(app, '/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      })
    }
  }

  it('$eq matches exact value via query param', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?category=tools')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; category: string }[] }
    expect(body.data.every((d) => d.category === 'tools')).toBe(true)
    expect(body.data.length).toBe(2)
  })

  it('$gt filters greater than via operator syntax', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?price[$gt]=25')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; price: number }[] }
    expect(body.data.every((d) => d.price > 25)).toBe(true)
    expect(body.data.length).toBe(2) // Doohickey (50) and Thingamajig (100)
  })

  it('$gte filters greater than or equal', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?price[$gte]=25')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; price: number }[] }
    expect(body.data.every((d) => d.price >= 25)).toBe(true)
    expect(body.data.length).toBe(3) // Gadget (25), Doohickey (50), Thingamajig (100)
  })

  it('$lt filters less than', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?price[$lt]=25')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; price: number }[] }
    expect(body.data.every((d) => d.price < 25)).toBe(true)
    expect(body.data.length).toBe(2) // Widget (10) and Whatchamacallit (5)
  })

  it('$lte filters less than or equal', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?price[$lte]=10')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; price: number }[] }
    expect(body.data.every((d) => d.price <= 10)).toBe(true)
    expect(body.data.length).toBe(2) // Widget (10) and Whatchamacallit (5)
  })

  it('$in matches values in array', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?category[$in]=tools,misc')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; category: string }[] }
    expect(body.data.every((d) => ['tools', 'misc'].includes(d.category))).toBe(true)
    expect(body.data.length).toBe(3) // Widget, Doohickey, Whatchamacallit
  })

  it('$nin rejects values in array', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?category[$nin]=tools,misc')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; category: string }[] }
    expect(body.data.every((d) => !['tools', 'misc'].includes(d.category))).toBe(true)
    expect(body.data.length).toBe(2) // Gadget and Thingamajig
  })

  it('$ne rejects matching value', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?category[$ne]=tools')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; category: string }[] }
    expect(body.data.every((d) => d.category !== 'tools')).toBe(true)
    expect(body.data.length).toBe(3) // Gadget, Thingamajig, Whatchamacallit
  })

  it('$exists checks field presence (true)', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    // All products have 'category' set, so $exists=true should return all
    const res = await req(app, '/products?category[$exists]=true')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string }[] }
    expect(body.data.length).toBe(5)
  })

  it('$regex matches pattern', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?name[$regex]=^W')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; name: string }[] }
    expect(body.data.every((d) => d.name.startsWith('W'))).toBe(true)
    expect(body.data.length).toBe(2) // Widget, Whatchamacallit
  })

  it('returns all items when no filter is specified', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string }[]; meta: { total: number } }
    expect(body.data.length).toBe(5)
    expect(body.meta.total).toBe(5)
  })

  it('handles multiple filters combined (AND semantics)', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?category=tools&price[$gt]=20')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; category: string; price: number }[] }
    expect(body.data.length).toBe(1) // Doohickey (tools, price=50)
    expect(body.data[0]!.category).toBe('tools')
    expect(body.data[0]!.price).toBe(50)
  })

  it('returns empty array when no items match filter', async () => {
    const app = createTestApp(schema)
    await seedProducts(app)

    const res = await req(app, '/products?price[$gt]=1000')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[]; meta: { total: number } }
    expect(body.data.length).toBe(0)
    expect(body.meta.total).toBe(0)
  })
})

// =============================================================================
// $count Endpoint Tests
// =============================================================================

describe('$count endpoint', () => {
  const schema = {
    Item: {
      name: 'string!',
      category: 'string',
      value: 'number = 0',
    },
  }

  it('returns count of all entities', async () => {
    const app = createTestApp(schema)

    // Seed some items
    for (let i = 0; i < 5; i++) {
      await req(app, '/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `item-${i}`, name: `Item ${i}`, category: i % 2 === 0 ? 'A' : 'B' }),
      })
    }

    const res = await req(app, '/items/$count')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: number }
    expect(body.data).toBe(5)
  })

  it('returns count with filter', async () => {
    const app = createTestApp(schema)

    // Seed items in different categories
    await req(app, '/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'a1', name: 'A1', category: 'alpha' }),
    })
    await req(app, '/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'a2', name: 'A2', category: 'alpha' }),
    })
    await req(app, '/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'b1', name: 'B1', category: 'beta' }),
    })

    const res = await req(app, '/items/$count?category=alpha')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: number }
    expect(body.data).toBe(2)
  })

  it('returns 0 for empty collection', async () => {
    const app = createTestApp(schema)

    const res = await req(app, '/items/$count')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: number }
    expect(body.data).toBe(0)
  })
})

// =============================================================================
// Global /:id Routes Tests
// =============================================================================

describe('Global /:id routes', () => {
  const schema = {
    Contact: {
      name: 'string!',
      email: 'email',
    },
    Deal: {
      title: 'string!',
      value: 'number',
    },
  }

  it('GET /:id resolves entity by prefix', async () => {
    const app = createTestApp(schema)

    // Create a contact via the typed endpoint
    await req(app, '/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'contact_abc123', name: 'Alice', email: 'alice@test.com' }),
    })

    // Fetch via global /:id route
    const res = await req(app, '/contact_abc123')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Record<string, unknown> }
    expect(body.data.$id).toBe('contact_abc123')
    expect(body.data.name).toBe('Alice')
  })

  it('GET /:id returns 404 for unknown prefix', async () => {
    const app = createTestApp(schema)

    const res = await req(app, '/unknown_abc123')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toContain('Unknown entity type prefix')
  })

  it('GET /:id returns 404 for nonexistent entity', async () => {
    const app = createTestApp(schema)

    const res = await req(app, '/contact_doesnotexist')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('PUT /:id updates entity by prefix', async () => {
    const app = createTestApp(schema)

    // Create a deal
    await req(app, '/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'deal_xyz789', title: 'Big Deal', value: 50000 }),
    })

    // Update via global /:id route
    const res = await req(app, '/deal_xyz789', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Bigger Deal', value: 75000 }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; title: string; value: number } }
    expect(body.data.title).toBe('Bigger Deal')
    expect(body.data.value).toBe(75000)
  })

  it('DELETE /:id deletes entity by prefix', async () => {
    const app = createTestApp(schema)

    // Create then delete
    await req(app, '/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'contact_del1', name: 'ToDelete' }),
    })

    const res = await req(app, '/contact_del1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { deleted: boolean; id: string } }
    expect(body.data.deleted).toBe(true)
    expect(body.data.id).toBe('contact_del1')
  })

  it('DELETE /:id returns 404 for nonexistent entity', async () => {
    const app = createTestApp(schema)

    const res = await req(app, '/contact_nonexist', { method: 'DELETE' })
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('PUT /:id returns 404 for unknown prefix', async () => {
    const app = createTestApp(schema)

    const res = await req(app, '/bogus_abc123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    })
    expect(res.status).toBe(404)
  })
})

// =============================================================================
// Verb Execution Tests
// =============================================================================

describe('Verb execution', () => {
  const schema = {
    Contact: {
      name: 'string!',
      stage: 'Lead | Qualified | Customer',
      qualify: 'Qualified',
      archive: 'Archived',
    },
  }

  it('POST /:id/:verb stores verb on entity', async () => {
    const app = createTestApp(schema)

    // Create a contact
    await req(app, '/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'contact_v1', name: 'Alice', stage: 'Lead' }),
    })

    // Execute a verb
    const res = await req(app, '/contact_v1/qualify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'Qualified' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; lastVerb: string; stage: string }; meta: { verb: string } }
    expect(body.data.lastVerb).toBe('qualify')
    expect(body.data.stage).toBe('Qualified')
    expect(body.meta.verb).toBe('qualify')
  })

  it('POST /:id/:verb returns 404 for nonexistent entity', async () => {
    const app = createTestApp(schema)

    const res = await req(app, '/contact_nonexist/qualify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('POST /:id/:verb works with empty body', async () => {
    const app = createTestApp(schema)

    await req(app, '/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'contact_v2', name: 'Bob', stage: 'Lead' }),
    })

    // Execute verb with no body at all
    const res = await req(app, '/contact_v2/archive', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { lastVerb: string }; meta: { verb: string } }
    expect(body.data.lastVerb).toBe('archive')
    expect(body.meta.verb).toBe('archive')
  })
})

// =============================================================================
// formatDocument with metaPrefix Tests
// =============================================================================

describe('formatDocument with metaPrefix', () => {
  it('transforms _ prefix to $ prefix when metaPrefix is $', async () => {
    const { app } = createTestAppWithConfig({
      schema: {
        Contact: {
          name: 'string!',
          email: 'email',
        },
      },
      metaPrefix: '$',
    })

    const createRes = await req(app, '/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'contact_fmt1', name: 'Alice', email: 'alice@test.com' }),
    })

    expect(createRes.status).toBe(201)
    const body = (await createRes.json()) as { data: Record<string, unknown> }
    const data = body.data

    // Meta fields should use $ prefix
    expect(data.$id).toBe('contact_fmt1')
    expect(data.$version).toBe(1)
    expect(data.$createdAt).toBeDefined()
    expect(data.$type).toBe('Contact')

    // User data fields should be preserved without prefix
    expect(data.name).toBe('Alice')
    expect(data.email).toBe('alice@test.com')

    // Old _ prefix fields should NOT be present
    expect(data.id).toBeUndefined()
    expect(data._version).toBeUndefined()
    expect(data._createdAt).toBeUndefined()
  })

  it('adds $type field', async () => {
    const { app } = createTestAppWithConfig({
      schema: {
        Deal: {
          title: 'string!',
          value: 'number',
        },
      },
      metaPrefix: '$',
    })

    const createRes = await req(app, '/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'deal_fmt1', title: 'Big Deal', value: 100000 }),
    })
    expect(createRes.status).toBe(201)
    const body = (await createRes.json()) as { data: Record<string, unknown> }
    expect(body.data.$type).toBe('Deal')
  })

  it('preserves user data fields', async () => {
    const { app } = createTestAppWithConfig({
      schema: {
        Product: {
          name: 'string!',
          price: 'number!',
          description: 'text',
        },
      },
      metaPrefix: '$',
    })

    const createRes = await req(app, '/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'product_fmt1',
        name: 'Widget',
        price: 29.99,
        description: 'A fine widget',
      }),
    })
    expect(createRes.status).toBe(201)
    const body = (await createRes.json()) as { data: Record<string, unknown> }
    expect(body.data.name).toBe('Widget')
    expect(body.data.price).toBe(29.99)
    expect(body.data.description).toBe('A fine widget')
  })

  it('uses $ prefix by default', async () => {
    const app = createTestApp({
      Contact: {
        name: 'string!',
      },
    })

    const createRes = await req(app, '/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'c1', name: 'Alice' }),
    })
    expect(createRes.status).toBe(201)
    const body = (await createRes.json()) as { data: Record<string, unknown> }
    // Default $ prefix means fields come back with $ prefix
    expect(body.data.$id).toBe('c1')
    expect(body.data.$version).toBe(1)
    expect(body.data.$createdAt).toBeDefined()
    expect(body.data.$type).toBe('Contact')
    // Old _ prefix fields and bare id should NOT be present
    expect(body.data.id).toBeUndefined()
    expect(body.data._version).toBeUndefined()
    expect(body.data._createdAt).toBeUndefined()
  })

  it('uses _ prefix when explicitly configured', async () => {
    const { app } = createTestAppWithConfig({
      schema: {
        Contact: {
          name: 'string!',
        },
      },
      metaPrefix: '_',
    })

    const createRes = await req(app, '/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'c1', name: 'Alice' }),
    })
    expect(createRes.status).toBe(201)
    const body = (await createRes.json()) as { data: Record<string, unknown> }
    // Explicit _ prefix means fields come back with _ prefix (no transformation)
    expect(body.data.id).toBe('c1')
    expect(body.data._version).toBe(1)
    expect(body.data._createdAt).toBeDefined()
  })

  it('list endpoint also uses $ prefix format', async () => {
    const { app } = createTestAppWithConfig({
      schema: {
        Note: {
          content: 'string!',
        },
      },
      metaPrefix: '$',
    })

    await req(app, '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'note_1', content: 'Hello' }),
    })

    const listRes = await req(app, '/notes')
    expect(listRes.status).toBe(200)
    const body = (await listRes.json()) as { data: Record<string, unknown>[] }
    expect(body.data.length).toBe(1)
    expect(body.data[0]!.$id).toBe('note_1')
    expect(body.data[0]!.$type).toBe('Note')
    expect(body.data[0]!.content).toBe('Hello')
  })
})

// =============================================================================
// sqid generation through REST API
// =============================================================================

describe('sqid ID generation via REST', () => {
  it('sqid generation through REST API creates prefixed IDs', async () => {
    const { app } = createTestAppWithConfig({
      schema: { Contact: { name: 'string!' } },
      idFormat: 'sqid',
    })

    const res = await req(app, '/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice' }),
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: Record<string, unknown> }
    // ID should start with the singular model name followed by underscore
    expect(body.data.$id).toMatch(/^contact_/)
    // The sqid segment should have minimum length of 8
    const segment = (body.data.$id as string).split('_')[1]!
    expect(segment.length).toBeGreaterThanOrEqual(8)
  })
})

// =============================================================================
// Sorting via $sort param
// =============================================================================

describe('Sorting via $sort param', () => {
  const schema = {
    Task: {
      title: 'string!',
      priority: 'number = 0',
      status: 'string',
    },
  }

  it('sorts ascending by default', async () => {
    const app = createTestApp(schema)

    await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 't1', title: 'C Task', priority: 3 }),
    })
    await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 't2', title: 'A Task', priority: 1 }),
    })
    await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 't3', title: 'B Task', priority: 2 }),
    })

    const res = await req(app, '/tasks?$sort=priority')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { priority: number }[] }
    expect(body.data[0]!.priority).toBe(1)
    expect(body.data[1]!.priority).toBe(2)
    expect(body.data[2]!.priority).toBe(3)
  })

  it('sorts descending with - prefix', async () => {
    const app = createTestApp(schema)

    await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 't1', title: 'Low', priority: 1 }),
    })
    await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 't2', title: 'High', priority: 3 }),
    })
    await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 't3', title: 'Mid', priority: 2 }),
    })

    const res = await req(app, '/tasks?$sort=-priority')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { priority: number }[] }
    expect(body.data[0]!.priority).toBe(3)
    expect(body.data[1]!.priority).toBe(2)
    expect(body.data[2]!.priority).toBe(1)
  })
})

// =============================================================================
// Search Endpoint Tests
// =============================================================================

describe('Search endpoint', () => {
  const schema = {
    Article: {
      title: 'string!',
      body: 'text',
      author: 'string',
    },
  }

  it('finds documents matching search query', async () => {
    const app = createTestApp(schema)

    await req(app, '/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'a1', title: 'Introduction to TypeScript', body: 'TypeScript is great', author: 'Alice' }),
    })
    await req(app, '/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'a2', title: 'Python Basics', body: 'Python is versatile', author: 'Bob' }),
    })
    await req(app, '/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'a3', title: 'Advanced TypeScript', body: 'Generics and more', author: 'Alice' }),
    })

    const res = await req(app, '/articles/search?q=typescript')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; title: string }[]; meta: { query: string; total: number } }
    expect(body.meta.query).toBe('typescript')
    expect(body.data.length).toBe(2) // Both TypeScript articles
    expect(body.data.every((d) => d.title.toLowerCase().includes('typescript'))).toBe(true)
  })

  it('search is case-insensitive', async () => {
    const app = createTestApp(schema)

    await req(app, '/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'a1', title: 'HELLO WORLD', body: 'test' }),
    })

    const res = await req(app, '/articles/search?q=hello')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string }[] }
    expect(body.data.length).toBe(1)
  })

  it('returns empty results for no matches', async () => {
    const app = createTestApp(schema)

    await req(app, '/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'a1', title: 'Hello', body: 'world' }),
    })

    const res = await req(app, '/articles/search?q=nonexistent')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[]; meta: { total: number } }
    expect(body.data.length).toBe(0)
    expect(body.meta.total).toBe(0)
  })
})

// =============================================================================
// CRUD Lifecycle Integration Tests
// =============================================================================

describe('CRUD lifecycle integration', () => {
  const schema = {
    Customer: {
      name: 'string!',
      email: 'email!',
      tier: 'Free | Pro | Enterprise = "Free"',
      mrr: 'number = 0',
    },
  }

  it('full create-read-update-delete cycle', async () => {
    const app = createTestApp(schema)

    // CREATE
    const createRes = await req(app, '/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'cust_1', name: 'Acme Inc', email: 'billing@acme.co', tier: 'Free', mrr: 0 }),
    })
    expect(createRes.status).toBe(201)
    const created = ((await createRes.json()) as { data: Record<string, unknown> }).data
    expect(created.$version).toBe(1)

    // READ
    const getRes = await req(app, '/customers/cust_1')
    expect(getRes.status).toBe(200)
    const fetched = ((await getRes.json()) as { data: Record<string, unknown> }).data
    expect(fetched.name).toBe('Acme Inc')
    expect(fetched.email).toBe('billing@acme.co')

    // UPDATE (PUT)
    const putRes = await req(app, '/customers/cust_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Acme Corp', email: 'billing@acme.co', tier: 'Pro', mrr: 99 }),
    })
    expect(putRes.status).toBe(200)
    const updated = ((await putRes.json()) as { data: Record<string, unknown> }).data
    expect(updated.$version).toBe(2)
    expect(updated.name).toBe('Acme Corp')
    expect(updated.tier).toBe('Pro')
    expect(updated.mrr).toBe(99)

    // PATCH
    const patchRes = await req(app, '/customers/cust_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mrr: 199 }),
    })
    expect(patchRes.status).toBe(200)
    const patched = ((await patchRes.json()) as { data: Record<string, unknown> }).data
    expect(patched.$version).toBe(3)
    expect(patched.mrr).toBe(199)
    expect(patched.name).toBe('Acme Corp') // Unchanged fields preserved

    // DELETE
    const deleteRes = await req(app, '/customers/cust_1', { method: 'DELETE' })
    expect(deleteRes.status).toBe(200)
    const deleted = ((await deleteRes.json()) as { data: { deleted: boolean; id: string } }).data
    expect(deleted.deleted).toBe(true)
  })
})

// =============================================================================
// Relation Traversal Endpoints
// =============================================================================

describe('Relation traversal endpoints', () => {
  const relSchema = {
    User: {
      name: 'string!',
      posts: '<- Post[]',
    },
    Post: {
      title: 'string!',
      author: '-> User!',
    },
  }

  it('GET /posts/:id/author returns related user (to-one forward)', async () => {
    const app = createTestApp(relSchema)

    // Create a user
    await req(app, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'user_rel1', name: 'Alice' }),
    })

    // Create a post referencing that user
    await req(app, '/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'post_rel1', title: 'My Post', author: 'user_rel1' }),
    })

    // Traverse the to-one forward relation
    const res = await req(app, '/posts/post_rel1/author')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Record<string, unknown> }
    expect(body.data.$id).toBe('user_rel1')
    expect(body.data.name).toBe('Alice')
  })

  it('returns 404 when parent entity not found (to-one forward)', async () => {
    const app = createTestApp(relSchema)

    const res = await req(app, '/posts/nonexistent_post/author')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 404 when to-one relation field is not set', async () => {
    const app = createTestApp(relSchema)

    // Create a post without setting the author field value to a real user
    // The field will have a value but the target user won't exist
    await req(app, '/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'post_noauthor', title: 'Orphan Post', author: 'user_nonexistent' }),
    })

    const res = await req(app, '/posts/post_noauthor/author')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('GET /users/:id/posts returns related posts (to-many inverse)', async () => {
    const app = createTestApp(relSchema)

    // Create a user
    await req(app, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'user_inv1', name: 'Bob' }),
    })

    // Traverse the inverse relation - should return an array
    const res = await req(app, '/users/user_inv1/posts')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[]; meta: { total: number } }
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.meta.total).toBeDefined()
  })

  it('returns 404 when parent entity not found (to-many inverse)', async () => {
    const app = createTestApp(relSchema)

    const res = await req(app, '/users/nonexistent_user/posts')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

// =============================================================================
// Soft Delete Visibility
// =============================================================================

describe('Soft delete visibility', () => {
  const schema = {
    Note: {
      content: 'string!',
      tag: 'string',
    },
  }

  it('GET returns 404 after DELETE (soft-deleted entity not visible via get)', async () => {
    const app = createTestApp(schema)

    // Create
    await req(app, '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'note_sd1', content: 'Will be deleted' }),
    })

    // Verify it exists
    const getRes1 = await req(app, '/notes/note_sd1')
    expect(getRes1.status).toBe(200)

    // Delete
    const deleteRes = await req(app, '/notes/note_sd1', { method: 'DELETE' })
    expect(deleteRes.status).toBe(200)

    // GET should now return 404 — the real DatabaseDO correctly filters soft-deleted entities
    // via `deleted_at IS NULL` in its SQL WHERE clause
    const getRes2 = await req(app, '/notes/note_sd1')
    expect(getRes2.status).toBe(404)
  })

  it('deleted entities excluded from list', async () => {
    const app = createTestApp(schema)

    // Create 3 notes
    await req(app, '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'note_list1', content: 'Note 1', tag: 'keep' }),
    })
    await req(app, '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'note_list2', content: 'Note 2', tag: 'keep' }),
    })
    await req(app, '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'note_list3', content: 'Note 3', tag: 'remove' }),
    })

    // Delete one
    await req(app, '/notes/note_list3', { method: 'DELETE' })

    // List should return 2
    const listRes = await req(app, '/notes')
    expect(listRes.status).toBe(200)
    const body = (await listRes.json()) as { data: { id: string }[]; meta: { total: number } }
    expect(body.data.length).toBe(2)
    expect(body.meta.total).toBe(2)
    expect(body.data.map((d) => d.id)).not.toContain('note_list3')
  })

  it('deleted entities excluded from count', async () => {
    const app = createTestApp(schema)

    // Create 3 notes
    await req(app, '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'note_cnt1', content: 'Count 1' }),
    })
    await req(app, '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'note_cnt2', content: 'Count 2' }),
    })
    await req(app, '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'note_cnt3', content: 'Count 3' }),
    })

    // Delete one
    await req(app, '/notes/note_cnt3', { method: 'DELETE' })

    // Count should be 2
    const countRes = await req(app, '/notes/$count')
    expect(countRes.status).toBe(200)
    const body = (await countRes.json()) as { data: number }
    expect(body.data).toBe(2)
  })

  it('deleted entities excluded from search', async () => {
    const app = createTestApp(schema)

    // Create 2 notes with searchable content
    await req(app, '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'note_srch1', content: 'Searchable Alpha' }),
    })
    await req(app, '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'note_srch2', content: 'Searchable Beta' }),
    })

    // Delete one
    await req(app, '/notes/note_srch2', { method: 'DELETE' })

    // Search for "Searchable" should only find the non-deleted one
    const searchRes = await req(app, '/notes/search?q=Searchable')
    expect(searchRes.status).toBe(200)
    const body = (await searchRes.json()) as { data: Record<string, unknown>[]; meta: { total: number } }
    expect(body.data.length).toBe(1)
    expect(body.data[0]!.$id).toBe('note_srch1')
  })
})

// =============================================================================
// System Field Protection
// =============================================================================

describe('System field protection', () => {
  const schema = {
    Task: {
      title: 'string!',
      status: 'string = "open"',
    },
  }

  it('strips _ prefixed fields from create input', async () => {
    const app = createTestApp(schema)

    // Attempt to inject _deletedAt via create
    const res = await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'task_prot1', title: 'Protected', _deletedAt: '2025-01-01T00:00:00Z', _version: 999 }),
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: Record<string, unknown> }
    // $version should be 1 (set by system), not 999
    expect(body.data.$version).toBe(1)
    // $deletedAt should not be set
    expect(body.data.$deletedAt).toBeUndefined()
  })

  it('strips $ prefixed fields from create input', async () => {
    const app = createTestApp(schema)

    // Attempt to inject $deletedAt and $version via create
    const res = await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'task_prot1b', title: 'Protected', $deletedAt: '2025-01-01T00:00:00Z', $version: 999 }),
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: Record<string, unknown> }
    // $version should be 1 (set by system), not 999
    expect(body.data.$version).toBe(1)
    // $deletedAt should not be set
    expect(body.data.$deletedAt).toBeUndefined()
  })

  it('update preserves system fields ($version increments, $createdAt preserved)', async () => {
    const app = createTestApp(schema)

    // Create
    const createRes = await req(app, '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'task_prot2', title: 'Original' }),
    })
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()) as { data: Record<string, unknown> }
    const originalCreatedAt = created.data.$createdAt

    // Update via PUT - try to set _version and _createdAt
    const putRes = await req(app, '/tasks/task_prot2', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated', _version: 999, _createdAt: '1999-01-01T00:00:00Z' }),
    })
    expect(putRes.status).toBe(200)
    const updated = (await putRes.json()) as { data: Record<string, unknown> }
    // $version should be 2 (auto-incremented), not 999
    expect(updated.data.$version).toBe(2)
    // $createdAt should be the original value, not the injected one
    expect(updated.data.$createdAt).toBe(originalCreatedAt)
  })
})

// =============================================================================
// maxPageSize Enforcement
// =============================================================================

describe('maxPageSize enforcement', () => {
  const schema = {
    Widget: {
      name: 'string!',
    },
  }

  it('clamps limit to maxPageSize', async () => {
    const { app } = createTestAppWithConfig({ schema, rest: { maxPageSize: 5 } })

    const res = await req(app, '/widgets?limit=999')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { meta: { limit: number } }
    expect(body.meta.limit).toBe(5)
  })

  it('allows limit within maxPageSize', async () => {
    const { app } = createTestAppWithConfig({ schema, rest: { maxPageSize: 50 } })

    const res = await req(app, '/widgets?limit=10')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { meta: { limit: number } }
    expect(body.meta.limit).toBe(10)
  })

  it('uses default pageSize when no limit specified', async () => {
    const { app } = createTestAppWithConfig({ schema, rest: { pageSize: 15, maxPageSize: 50 } })

    const res = await req(app, '/widgets')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { meta: { limit: number } }
    expect(body.meta.limit).toBe(15)
  })
})

// =============================================================================
// basePath Configuration
// =============================================================================

describe('basePath configuration', () => {
  const schema = {
    Task: {
      title: 'string!',
    },
  }

  it('mounts routes under basePath', async () => {
    const { app } = createTestAppWithConfig({ schema, rest: { basePath: '/api/v1' } })

    // Create via basePath
    const createRes = await req(app, '/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'bp_task1', title: 'Base Path Task' }),
    })
    expect(createRes.status).toBe(201)

    // List via basePath
    const listRes = await req(app, '/api/v1/tasks')
    expect(listRes.status).toBe(200)
    const body = (await listRes.json()) as { data: { id: string }[] }
    expect(body.data.length).toBe(1)
  })

  it('original path returns 404 with basePath', async () => {
    const { app } = createTestAppWithConfig({ schema, rest: { basePath: '/api/v1' } })

    const res = await req(app, '/tasks')
    expect(res.status).toBe(404)
  })

  it('count endpoint works under basePath', async () => {
    const { app } = createTestAppWithConfig({ schema, rest: { basePath: '/api/v1' } })

    const res = await req(app, '/api/v1/tasks/$count')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: number }
    expect(body.data).toBe(0)
  })

  it('search endpoint works under basePath', async () => {
    const { app } = createTestAppWithConfig({ schema, rest: { basePath: '/api/v1' } })

    const res = await req(app, '/api/v1/tasks/search?q=test')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[] }
    expect(Array.isArray(body.data)).toBe(true)
  })
})

// =============================================================================
// $exists: false filter via REST
// =============================================================================

describe('$exists: false filter via REST', () => {
  it('$exists false via REST filters correctly', async () => {
    const schema = {
      Product: {
        name: 'string!',
        description: 'text',
      },
    }
    const app = createTestApp(schema)

    // Create one with description, one without
    await req(app, '/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'ex_p1', name: 'With Desc', description: 'Has description' }),
    })
    await req(app, '/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'ex_p2', name: 'No Desc' }),
    })

    // $exists=false should only return the product without description
    const res = await req(app, '/products?description[$exists]=false')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; name: string }[] }
    // Note: both products may have the description field (undefined vs string),
    // which depends on how the DB stores the data
    // The one without description should have description as undefined
    expect(body.data.every((d) => (d as Record<string, unknown>).description === undefined)).toBe(true)
  })
})

// =============================================================================
// Duplicate ID Creation
// =============================================================================

describe('Duplicate ID creation', () => {
  const schema = {
    Item: {
      name: 'string!',
    },
  }

  it('creating with same ID overwrites the existing document', async () => {
    const app = createTestApp(schema)

    // Create first item
    const res1 = await req(app, '/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'dup_item1', name: 'Original' }),
    })
    expect(res1.status).toBe(201)

    // Create second item with the same ID
    const res2 = await req(app, '/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'dup_item1', name: 'Duplicate' }),
    })
    // The DB does a Map.set(), so it overwrites silently
    expect(res2.status).toBe(201)

    // Fetch the item - should have the duplicate's data
    const getRes = await req(app, '/items/dup_item1')
    expect(getRes.status).toBe(200)
    const body = (await getRes.json()) as { data: { id: string; name: string } }
    expect(body.data.name).toBe('Duplicate')
  })
})

// =============================================================================
// links.next Pagination
// =============================================================================

describe('links.next pagination', () => {
  const schema = {
    Entry: {
      title: 'string!',
    },
  }

  it('returns links.next when hasMore is true', async () => {
    const app = createTestApp(schema)

    // Create 5 items
    for (let i = 0; i < 5; i++) {
      await req(app, '/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `entry_pg${i}`, title: `Entry ${i}` }),
      })
    }

    // Request with limit=2 - should have hasMore
    const res = await req(app, '/entries?limit=2')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[]; meta: { total: number; limit: number; offset: number }; links: { self: string; next?: string } }
    expect(body.data.length).toBe(2)
    expect(body.meta.total).toBe(5)
    expect(body.links.next).toBeDefined()
    expect(body.links.next).toContain('offset=2')
    expect(body.links.next).toContain('limit=2')
  })

  it('does not return links.next when all items are returned', async () => {
    const app = createTestApp(schema)

    // Create 2 items
    for (let i = 0; i < 2; i++) {
      await req(app, '/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `entry_all${i}`, title: `Entry ${i}` }),
      })
    }

    // Request with limit=10 - should NOT have hasMore
    const res = await req(app, '/entries?limit=10')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[]; meta: { total: number }; links: { self: string; next?: string } }
    expect(body.data.length).toBe(2)
    expect(body.links.next).toBeUndefined()
  })

  it('links.next advances correctly through pages', async () => {
    const app = createTestApp(schema)

    // Create 5 items
    for (let i = 0; i < 5; i++) {
      await req(app, '/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `entry_nav${i}`, title: `Entry ${i}` }),
      })
    }

    // Page 1: offset=0, limit=2
    const res1 = await req(app, '/entries?limit=2&offset=0')
    const body1 = (await res1.json()) as { data: { id: string }[]; links: { next?: string } }
    expect(body1.data.length).toBe(2)
    expect(body1.links.next).toBeDefined()

    // Page 2: offset=2, limit=2
    const res2 = await req(app, '/entries?limit=2&offset=2')
    const body2 = (await res2.json()) as { data: { id: string }[]; links: { next?: string } }
    expect(body2.data.length).toBe(2)
    expect(body2.links.next).toBeDefined()

    // Page 3: offset=4, limit=2 - only 1 item left
    const res3 = await req(app, '/entries?limit=2&offset=4')
    const body3 = (await res3.json()) as { data: { id: string }[]; links: { next?: string } }
    expect(body3.data.length).toBe(1)
    expect(body3.links.next).toBeUndefined()
  })
})
