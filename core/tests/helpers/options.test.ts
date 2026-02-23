import { describe, it, expect } from 'vitest'
import { buildOptions } from '../../src/helpers/options'

describe('Options helpers', () => {
  describe('buildOptions', () => {
    it('generates standard options block with array, schema, and facets', () => {
      const result = buildOptions({
        baseUrl: 'https://crm.do',
        tenant: 'acme',
        collection: 'contacts',
      })

      expect(result).toEqual({
        array: 'https://crm.do/~acme/contacts?array',
        schema: 'https://crm.do/~acme/contacts/$schema',
        facets: 'https://crm.do/~acme/contacts/$facets',
      })
    })

    it('generates options without tenant', () => {
      const result = buildOptions({
        baseUrl: 'https://crm.do',
        collection: 'contacts',
      })

      expect(result).toEqual({
        array: 'https://crm.do/contacts?array',
        schema: 'https://crm.do/contacts/$schema',
        facets: 'https://crm.do/contacts/$facets',
      })
    })

    it('generates options for different collections', () => {
      const result = buildOptions({
        baseUrl: 'https://billing.do',
        tenant: 'startup',
        collection: 'invoices',
      })

      expect(result).toEqual({
        array: 'https://billing.do/~startup/invoices?array',
        schema: 'https://billing.do/~startup/invoices/$schema',
        facets: 'https://billing.do/~startup/invoices/$facets',
      })
    })

    it('merges additional options when provided', () => {
      const result = buildOptions(
        {
          baseUrl: 'https://crm.do',
          tenant: 'acme',
          collection: 'contacts',
        },
        {
          export: 'https://crm.do/~acme/contacts/$export',
        },
      )

      expect(result).toEqual({
        array: 'https://crm.do/~acme/contacts?array',
        schema: 'https://crm.do/~acme/contacts/$schema',
        facets: 'https://crm.do/~acme/contacts/$facets',
        export: 'https://crm.do/~acme/contacts/$export',
      })
    })

    it('generates map option when in array mode', () => {
      const result = buildOptions({
        baseUrl: 'https://crm.do',
        tenant: 'acme',
        collection: 'contacts',
        isArrayMode: true,
      })

      expect(result).toEqual({
        map: 'https://crm.do/~acme/contacts',
        schema: 'https://crm.do/~acme/contacts/$schema',
        facets: 'https://crm.do/~acme/contacts/$facets',
      })
    })

    it('handles baseUrl with trailing slash', () => {
      const result = buildOptions({
        baseUrl: 'https://crm.do/',
        tenant: 'acme',
        collection: 'contacts',
      })

      expect(result).toEqual({
        array: 'https://crm.do/~acme/contacts?array',
        schema: 'https://crm.do/~acme/contacts/$schema',
        facets: 'https://crm.do/~acme/contacts/$facets',
      })
    })
  })
})
