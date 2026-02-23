import { describe, it, expect } from 'vitest'
import { resolveHostname } from '../src/hostname'

describe('Hostname Resolution', () => {
  it('resolves apis.do as root', () => {
    const ctx = resolveHostname('apis.do')
    expect(ctx.mode).toBe('root')
    expect(ctx.service).toBeUndefined()
  })

  it('resolves events.do as service scope', () => {
    const ctx = resolveHostname('events.do')
    expect(ctx.mode).toBe('service')
    expect(ctx.service).toBe('events')
  })

  it('resolves priya.do as agent scope', () => {
    const ctx = resolveHostname('priya.do')
    expect(ctx.mode).toBe('agent')
    expect(ctx.service).toBe('priya')
  })

  it('resolves cto.do as agent scope', () => {
    const ctx = resolveHostname('cto.do')
    expect(ctx.mode).toBe('agent')
    expect(ctx.service).toBe('cto')
  })

  it('resolves custom domain as customer scope', () => {
    const ctx = resolveHostname('headless.ly')
    expect(ctx.mode).toBe('customer')
    expect(ctx.domain).toBe('headless.ly')
  })

  it('resolves unknown .do domain as service', () => {
    const ctx = resolveHostname('newservice.do')
    expect(ctx.mode).toBe('service')
    expect(ctx.service).toBe('newservice')
  })

  it('strips port from hostname', () => {
    const ctx = resolveHostname('apis.do:8787')
    expect(ctx.mode).toBe('root')
  })
})
