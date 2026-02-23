import { describe, it, expect } from 'vitest'
import { buildRegistry, getService, getCategory, listCategories, searchServices } from '../src/registry'

describe('Service Registry', () => {
  const registry = buildRegistry()

  it('loads all services from do.tsv', () => {
    expect(registry.services.length).toBeGreaterThan(300)
  })

  it('categorizes services', () => {
    const categories = listCategories(registry)
    expect(categories.length).toBeGreaterThan(5)
    expect(categories.map((c) => c.slug)).toContain('infrastructure')
    expect(categories.map((c) => c.slug)).toContain('ai')
  })

  it('finds a service by name', () => {
    const svc = getService(registry, 'events')
    expect(svc).toBeDefined()
    expect(svc!.domain).toBe('events.do')
  })

  it('searches services', () => {
    const results = searchServices(registry, 'database')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((s) => s.name === 'database')).toBe(true)
  })

  it('returns category with services', () => {
    const cat = getCategory(registry, 'ai')
    expect(cat).toBeDefined()
    expect(cat!.services.length).toBeGreaterThan(3)
  })

  it('categorizes named agents', () => {
    const svc = getService(registry, 'priya')
    expect(svc).toBeDefined()
    expect(svc!.category).toBe('agents')
  })

  it('categorizes c-suite as agents', () => {
    const svc = getService(registry, 'cto')
    expect(svc).toBeDefined()
    expect(svc!.category).toBe('agents')
  })
})
