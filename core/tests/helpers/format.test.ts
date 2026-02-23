import { describe, it, expect } from 'vitest'
import { toMapFormat, toArrayFormat, formatCollection, isArrayMode } from '../../src/helpers/format'

describe('Format helpers', () => {
  const sampleContacts = [
    { id: 'contact_abc', name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 'contact_def', name: 'Bob Smith', email: 'bob@example.com' },
  ]

  const sampleContent = [
    { id: 'content_xyz', title: 'Getting Started', slug: 'getting-started' },
    { id: 'content_uvw', title: 'Advanced Guide', slug: 'advanced-guide' },
  ]

  const baseOpts = {
    baseUrl: 'https://crm.do',
    tenant: 'acme',
    collection: 'contacts',
  }

  describe('toMapFormat', () => {
    it('transforms entities with name field into display-name → URL map', () => {
      const result = toMapFormat(sampleContacts, baseOpts)

      expect(result).toEqual({
        'Alice Johnson': 'https://crm.do/~acme/contact_abc',
        'Bob Smith': 'https://crm.do/~acme/contact_def',
      })
    })

    it('uses title field when name is not available', () => {
      const result = toMapFormat(sampleContent, {
        baseUrl: 'https://crm.do',
        tenant: 'acme',
        collection: 'content',
      })

      expect(result).toEqual({
        'Getting Started': 'https://crm.do/~acme/content_xyz',
        'Advanced Guide': 'https://crm.do/~acme/content_uvw',
      })
    })

    it('uses explicit titleField when provided', () => {
      const result = toMapFormat(sampleContacts, {
        ...baseOpts,
        titleField: 'email',
      })

      expect(result).toEqual({
        'alice@example.com': 'https://crm.do/~acme/contact_abc',
        'bob@example.com': 'https://crm.do/~acme/contact_def',
      })
    })

    it('falls back to id when no name/title fields exist', () => {
      const items = [
        { id: 'event_abc', timestamp: '2024-01-01', value: 42 },
        { id: 'event_def', timestamp: '2024-01-02', value: 99 },
      ]

      const result = toMapFormat(items, {
        baseUrl: 'https://analytics.do',
        tenant: 'acme',
        collection: 'events',
      })

      expect(result).toEqual({
        event_abc: 'https://analytics.do/~acme/event_abc',
        event_def: 'https://analytics.do/~acme/event_def',
      })
    })

    it('falls back to first string field when no name/title/id', () => {
      const items = [
        { slug: 'hello-world', count: 5 },
        { slug: 'goodbye', count: 3 },
      ]

      const result = toMapFormat(items, baseOpts)

      expect(result).toEqual({
        'hello-world': 'https://crm.do/~acme/hello-world',
        goodbye: 'https://crm.do/~acme/goodbye',
      })
    })

    it('returns empty object for empty collection', () => {
      const result = toMapFormat([], baseOpts)

      expect(result).toEqual({})
    })

    it('handles single item collection', () => {
      const result = toMapFormat([sampleContacts[0]], baseOpts)

      expect(result).toEqual({
        'Alice Johnson': 'https://crm.do/~acme/contact_abc',
      })
    })

    it('handles entities with duplicate names by using the last one', () => {
      const items = [
        { id: 'contact_abc', name: 'Alice', email: 'alice1@example.com' },
        { id: 'contact_def', name: 'Alice', email: 'alice2@example.com' },
      ]

      const result = toMapFormat(items, baseOpts)

      // Last one wins in a map
      expect(result['Alice']).toBe('https://crm.do/~acme/contact_def')
    })

    it('builds URLs without tenant when tenant is not provided', () => {
      const result = toMapFormat(sampleContacts, {
        baseUrl: 'https://crm.do',
        collection: 'contacts',
      })

      expect(result).toEqual({
        'Alice Johnson': 'https://crm.do/contact_abc',
        'Bob Smith': 'https://crm.do/contact_def',
      })
    })
  })

  describe('toArrayFormat', () => {
    it('transforms entities into array with $id, id, and display fields', () => {
      const result = toArrayFormat(sampleContacts, baseOpts)

      expect(result).toEqual([
        { $id: 'https://crm.do/~acme/contact_abc', id: 'contact_abc', name: 'Alice Johnson' },
        { $id: 'https://crm.do/~acme/contact_def', id: 'contact_def', name: 'Bob Smith' },
      ])
    })

    it('uses title field for display when name is not available', () => {
      const result = toArrayFormat(sampleContent, {
        baseUrl: 'https://crm.do',
        tenant: 'acme',
        collection: 'content',
      })

      expect(result).toEqual([
        { $id: 'https://crm.do/~acme/content_xyz', id: 'content_xyz', name: 'Getting Started' },
        { $id: 'https://crm.do/~acme/content_uvw', id: 'content_uvw', name: 'Advanced Guide' },
      ])
    })

    it('uses explicit titleField', () => {
      const result = toArrayFormat(sampleContacts, {
        ...baseOpts,
        titleField: 'email',
      })

      expect(result).toEqual([
        { $id: 'https://crm.do/~acme/contact_abc', id: 'contact_abc', name: 'alice@example.com' },
        { $id: 'https://crm.do/~acme/contact_def', id: 'contact_def', name: 'bob@example.com' },
      ])
    })

    it('uses id as name when no display field exists', () => {
      const items = [
        { id: 'event_abc', timestamp: '2024-01-01', value: 42 },
      ]

      const result = toArrayFormat(items, {
        baseUrl: 'https://analytics.do',
        tenant: 'acme',
        collection: 'events',
      })

      expect(result).toEqual([
        { $id: 'https://analytics.do/~acme/event_abc', id: 'event_abc', name: 'event_abc' },
      ])
    })

    it('returns empty array for empty collection', () => {
      const result = toArrayFormat([], baseOpts)

      expect(result).toEqual([])
    })

    it('handles single item', () => {
      const result = toArrayFormat([sampleContacts[0]], baseOpts)

      expect(result).toEqual([
        { $id: 'https://crm.do/~acme/contact_abc', id: 'contact_abc', name: 'Alice Johnson' },
      ])
    })

    it('builds URLs without tenant when tenant is not provided', () => {
      const result = toArrayFormat(sampleContacts, {
        baseUrl: 'https://crm.do',
        collection: 'contacts',
      })

      expect(result).toEqual([
        { $id: 'https://crm.do/contact_abc', id: 'contact_abc', name: 'Alice Johnson' },
        { $id: 'https://crm.do/contact_def', id: 'contact_def', name: 'Bob Smith' },
      ])
    })
  })

  describe('formatCollection', () => {
    it('returns map format by default (array = false)', () => {
      const result = formatCollection(sampleContacts, { ...baseOpts, array: false })

      expect(result).toEqual({
        'Alice Johnson': 'https://crm.do/~acme/contact_abc',
        'Bob Smith': 'https://crm.do/~acme/contact_def',
      })
    })

    it('returns map format when array is undefined', () => {
      const result = formatCollection(sampleContacts, baseOpts)

      expect(result).toEqual({
        'Alice Johnson': 'https://crm.do/~acme/contact_abc',
        'Bob Smith': 'https://crm.do/~acme/contact_def',
      })
    })

    it('returns array format when array = true', () => {
      const result = formatCollection(sampleContacts, { ...baseOpts, array: true })

      expect(result).toEqual([
        { $id: 'https://crm.do/~acme/contact_abc', id: 'contact_abc', name: 'Alice Johnson' },
        { $id: 'https://crm.do/~acme/contact_def', id: 'contact_def', name: 'Bob Smith' },
      ])
    })

    it('handles empty collection in both modes', () => {
      expect(formatCollection([], { ...baseOpts, array: false })).toEqual({})
      expect(formatCollection([], { ...baseOpts, array: true })).toEqual([])
    })
  })

  describe('isArrayMode', () => {
    it('returns true when ?array is present (no value)', () => {
      const url = new URL('https://crm.do/~acme/contacts?array')
      expect(isArrayMode(url)).toBe(true)
    })

    it('returns true when ?array= has empty value', () => {
      const url = new URL('https://crm.do/~acme/contacts?array=')
      expect(isArrayMode(url)).toBe(true)
    })

    it('returns true when ?array=true', () => {
      const url = new URL('https://crm.do/~acme/contacts?array=true')
      expect(isArrayMode(url)).toBe(true)
    })

    it('returns false when ?array is not present', () => {
      const url = new URL('https://crm.do/~acme/contacts')
      expect(isArrayMode(url)).toBe(false)
    })

    it('returns false when ?array is not present but other params exist', () => {
      const url = new URL('https://crm.do/~acme/contacts?page=1&limit=10')
      expect(isArrayMode(url)).toBe(false)
    })

    it('detects ?array among other query parameters', () => {
      const url = new URL('https://crm.do/~acme/contacts?page=1&array&limit=10')
      expect(isArrayMode(url)).toBe(true)
    })
  })
})
