import { describe, it, expect } from 'vitest'
import { resolveType, TYPE_SYNONYMS, STRIPE_PREFIXES, SOURCE_ROUTES } from '../src/type-synonyms'

describe('Type Synonyms', () => {
  it('resolves short forms to canonical types', () => {
    expect(resolveType('org')).toBe('organization')
    expect(resolveType('req')).toBe('request')
  })

  it('resolves long forms to canonical types', () => {
    expect(resolveType('organization')).toBe('organization')
    expect(resolveType('request')).toBe('request')
  })

  it('passes through unknown types unchanged', () => {
    expect(resolveType('contact')).toBe('contact')
    expect(resolveType('deal')).toBe('deal')
    expect(resolveType('workflow')).toBe('workflow')
  })

  it('identifies Stripe-native prefixes', () => {
    expect(STRIPE_PREFIXES.has('cus')).toBe(true)
    expect(STRIPE_PREFIXES.has('pi')).toBe(true)
    expect(STRIPE_PREFIXES.has('sub')).toBe(true)
    expect(STRIPE_PREFIXES.has('contact')).toBe(false)
  })

  it('maps canonical types to source bindings', () => {
    expect(SOURCE_ROUTES.organization).toBe('AUTH')
    expect(SOURCE_ROUTES.user).toBe('AUTH')
    expect(SOURCE_ROUTES.request).toBe('EVENTS')
  })
})
