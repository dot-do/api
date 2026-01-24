import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { crudConvention } from '../src/conventions/crud'
import { responseMiddleware } from '../src/response'
import { contextMiddleware } from '../src/middleware/context'
import type { ApiEnv } from '../src/types'

function createTestApp() {
  const app = new Hono<ApiEnv>()

  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware({ name: 'crud-test' }))

  app.route('/items', crudConvention({ db: 'DB', table: 'items', searchable: ['name'], pageSize: 10 }))

  return app
}

function createMockDb(data: Record<string, unknown>[] = []) {
  const bindResult = {
    all: vi.fn().mockResolvedValue({ results: data }),
    first: vi.fn().mockResolvedValue(data[0] || null),
    run: vi.fn().mockResolvedValue({}),
    bind: vi.fn(),
  }
  bindResult.bind = vi.fn().mockReturnValue(bindResult) as typeof bindResult.bind
  return {
    prepare: vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue(bindResult) }),
    _bind: bindResult,
  }
}

describe('CRUD convention', () => {
  it('generates list query with pagination', async () => {
    const items = [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }]
    const mockDb = createMockDb(items)
    // Override first for count query to return total
    mockDb._bind.first.mockResolvedValue({ total: 2 })

    const app = createTestApp()
    const res = await app.request('/items', {}, { DB: mockDb })
    expect(res.status).toBe(200)

    const body = await res.json() as Record<string, unknown>
    expect(body.data).toEqual(items)
    expect((body.meta as Record<string, unknown>).total).toBe(2)
  })

  it('generates search query when q param provided', async () => {
    const mockDb = createMockDb([])
    mockDb._bind.first.mockResolvedValue({ total: 0 })

    const app = createTestApp()
    await app.request('/items?q=test', {}, { DB: mockDb })

    // Verify the search query was built with LIKE
    const prepareCall = mockDb.prepare.mock.calls[0][0] as string
    expect(prepareCall).toContain('WHERE')
    expect(prepareCall).toContain('LIKE')
  })

  it('handles get by id', async () => {
    const item = { id: '123', name: 'Test Item' }
    const mockDb = createMockDb([item])

    const app = createTestApp()
    const res = await app.request('/items/123', {}, { DB: mockDb })
    expect(res.status).toBe(200)

    const body = await res.json() as Record<string, unknown>
    expect(body.data).toEqual(item)
  })

  it('returns 404 for missing item', async () => {
    const mockDb = createMockDb([])
    mockDb._bind.first.mockResolvedValue(null)

    const app = createTestApp()
    const res = await app.request('/items/nonexistent', {}, { DB: mockDb })
    expect(res.status).toBe(404)

    const body = await res.json() as Record<string, unknown>
    expect((body.error as Record<string, unknown>).code).toBe('NOT_FOUND')
  })

  it('handles create with POST', async () => {
    const newItem = { id: 'new-id', name: 'New Item' }
    const mockDb = createMockDb([])
    // After insert, the first() call returns the newly created item
    mockDb._bind.first.mockResolvedValue(newItem)

    const app = createTestApp()
    const res = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Item' }),
    }, { DB: mockDb })
    expect(res.status).toBe(201)
  })

  it('handles delete', async () => {
    const item = { id: '123', name: 'To Delete' }
    const mockDb = createMockDb([item])
    mockDb._bind.first.mockResolvedValue(item)

    const app = createTestApp()
    const res = await app.request('/items/123', { method: 'DELETE' }, { DB: mockDb })
    expect(res.status).toBe(200)

    const body = await res.json() as Record<string, unknown>
    expect(body.data).toEqual(item)
  })
})
