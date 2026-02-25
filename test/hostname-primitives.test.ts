import { describe, it, expect } from 'vitest'
import { resolveHostname } from '../src/hostname'

describe('Hostname → Primitive Mapping', () => {
  it('maps database.do to database primitive', () => {
    const ctx = resolveHostname('database.do')
    expect(ctx.mode).toBe('service')
    expect(ctx.service).toBe('database')
    expect(ctx.primitive).toBe('database')
  })

  it('maps events.do to events primitive', () => {
    const ctx = resolveHostname('events.do')
    expect(ctx.mode).toBe('service')
    expect(ctx.primitive).toBe('events')
  })

  it('maps functions.do to functions primitive', () => {
    const ctx = resolveHostname('functions.do')
    expect(ctx.mode).toBe('service')
    expect(ctx.primitive).toBe('functions')
  })

  it('maps agents.do to agents primitive', () => {
    const ctx = resolveHostname('agents.do')
    expect(ctx.mode).toBe('service')
    expect(ctx.primitive).toBe('agents')
  })

  it('maps workflows.do to workflows primitive', () => {
    const ctx = resolveHostname('workflows.do')
    expect(ctx.mode).toBe('service')
    expect(ctx.primitive).toBe('workflows')
  })

  it('returns no primitive for apis.do (root)', () => {
    const ctx = resolveHostname('apis.do')
    expect(ctx.mode).toBe('root')
    expect(ctx.primitive).toBeUndefined()
  })

  it('returns no primitive for unknown .do domains', () => {
    const ctx = resolveHostname('random.do')
    expect(ctx.mode).toBe('service')
    expect(ctx.primitive).toBeUndefined()
  })

  it('strips port from hostname', () => {
    const ctx = resolveHostname('database.do:8787')
    expect(ctx.primitive).toBe('database')
  })
})
