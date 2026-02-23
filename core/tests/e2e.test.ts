import { describe, it, expect, beforeAll } from 'vitest'

const API_URL = 'https://api.example.com.ai'
const DIRECTORY_URL = 'https://directory.example.com.ai'

describe('E2E: api.example.com.ai', () => {
  it('returns root API info with envelope', async () => {
    const res = await fetch(API_URL)
    expect(res.ok).toBe(true)

    const body = await res.json() as Record<string, unknown>
    expect(body.api).toBeDefined()
    expect((body.api as Record<string, unknown>).name).toBe('api.example.com.ai')
    expect(body.links).toBeDefined()
    expect((body.links as Record<string, unknown>).self).toBe(`${API_URL}/`)
  })

  it('lists projects with pagination', async () => {
    const res = await fetch(`${API_URL}/projects`)
    expect(res.ok).toBe(true)

    const body = await res.json() as Record<string, unknown>
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.meta).toBeDefined()
    expect((body.meta as Record<string, unknown>).total).toBeGreaterThan(0)
    expect(body.actions).toBeDefined()
  })

  it('gets single project by ID', async () => {
    const res = await fetch(`${API_URL}/projects/proj-1`)
    expect(res.ok).toBe(true)

    const body = await res.json() as Record<string, unknown>
    const data = body.data as Record<string, unknown>
    expect(data.id).toBe('proj-1')
    expect(data.name).toBe('api.do')
  })

  it('returns 404 for missing project', async () => {
    const res = await fetch(`${API_URL}/projects/nonexistent`)
    expect(res.status).toBe(404)

    const body = await res.json() as Record<string, unknown>
    expect(body.error).toBeDefined()
    expect((body.error as Record<string, unknown>).code).toBe('NOT_FOUND')
  })

  it('supports search with q parameter', async () => {
    const res = await fetch(`${API_URL}/projects?q=api`)
    expect(res.ok).toBe(true)

    const body = await res.json() as Record<string, unknown>
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('returns health check', async () => {
    const res = await fetch(`${API_URL}/health`)
    expect(res.ok).toBe(true)

    const body = await res.json() as Record<string, unknown>
    expect((body.data as Record<string, unknown>).status).toBe('ok')
  })
})

describe('E2E: directory.example.com.ai', () => {
  it('returns root API info with envelope', async () => {
    const res = await fetch(DIRECTORY_URL)
    expect(res.ok).toBe(true)

    const body = await res.json() as Record<string, unknown>
    expect((body.api as Record<string, unknown>).name).toBe('directory.example.com.ai')
  })

  it('lists APIs with pagination', async () => {
    const res = await fetch(`${DIRECTORY_URL}/apis`)
    expect(res.ok).toBe(true)

    const body = await res.json() as Record<string, unknown>
    expect(Array.isArray(body.data)).toBe(true)
    expect((body.meta as Record<string, unknown>).total).toBeGreaterThanOrEqual(10)
  })

  it('supports search across name, description, domain', async () => {
    const res = await fetch(`${DIRECTORY_URL}/apis?q=framework`)
    expect(res.ok).toBe(true)

    const body = await res.json() as Record<string, unknown>
    const data = body.data as Array<Record<string, unknown>>
    expect(data.length).toBeGreaterThan(0)
    expect(data.some(api => api.category === 'frameworks')).toBe(true)
  })

  it('returns categories endpoint', async () => {
    const res = await fetch(`${DIRECTORY_URL}/categories`)
    expect(res.ok).toBe(true)

    const body = await res.json() as Record<string, unknown>
    expect(body.categories).toBeDefined()
  })

  it('returns featured APIs', async () => {
    const res = await fetch(`${DIRECTORY_URL}/featured`)
    expect(res.ok).toBe(true)

    const body = await res.json() as Record<string, unknown>
    expect(body.apis).toBeDefined()
    const apis = body.apis as Array<Record<string, unknown>>
    expect(apis.every(api => api.featured === 1)).toBe(true)
  })
})
