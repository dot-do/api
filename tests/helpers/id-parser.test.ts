import { describe, it, expect } from 'vitest'
import { parseEntityId, isEntityId } from '../../src/helpers/id-parser'

describe('Entity ID Parser', () => {
  describe('isEntityId', () => {
    it('recognizes valid entity IDs', () => {
      expect(isEntityId('contact_abc')).toBe(true)
      expect(isEntityId('deal_kRziM')).toBe(true)
      expect(isEntityId('user_V1StG')).toBe(true)
      expect(isEntityId('lead_123')).toBe(true)
      expect(isEntityId('featureFlag_x9z')).toBe(true)
      expect(isEntityId('apiKey_abc123')).toBe(true)
    })

    it('rejects empty strings', () => {
      expect(isEntityId('')).toBe(false)
    })

    it('rejects plain words without underscores', () => {
      expect(isEntityId('contacts')).toBe(false)
      expect(isEntityId('search')).toBe(false)
      expect(isEntityId('hello')).toBe(false)
    })

    it('rejects meta-resources starting with $', () => {
      expect(isEntityId('$schema')).toBe(false)
      expect(isEntityId('$history')).toBe(false)
    })

    it('rejects tenant prefixes starting with ~', () => {
      expect(isEntityId('~acme')).toBe(false)
    })

    it('rejects function calls containing (', () => {
      expect(isEntityId('score(contact_abc)')).toBe(false)
    })

    it('rejects IDs that start with uppercase', () => {
      expect(isEntityId('Contact_abc')).toBe(false)
    })

    it('rejects IDs with empty type or sqid', () => {
      expect(isEntityId('_abc')).toBe(false)
      expect(isEntityId('contact_')).toBe(false)
    })

    it('rejects IDs with special characters in sqid', () => {
      expect(isEntityId('contact_ab-c')).toBe(false)
      expect(isEntityId('contact_ab.c')).toBe(false)
      expect(isEntityId('contact_ab/c')).toBe(false)
    })

    it('rejects IDs with multiple underscores', () => {
      // The regex requires the pattern to be type_sqid with a single underscore boundary
      // 'feature_flag_abc' matches because 'feature' is the type and 'flag' starts the sqid...
      // Actually with our regex: /^[a-z][a-zA-Z]*_[a-zA-Z0-9]+$/ this won't match
      // because 'flag_abc' contains an underscore which is not in [a-zA-Z0-9]
      expect(isEntityId('feature_flag_abc')).toBe(false)
    })
  })

  describe('parseEntityId', () => {
    it('parses a simple entity ID', () => {
      const result = parseEntityId('contact_abc')
      expect(result).toEqual({
        type: 'contact',
        collection: 'contacts',
        id: 'contact_abc',
        sqid: 'abc',
      })
    })

    it('parses entity IDs with mixed-case sqids', () => {
      const result = parseEntityId('deal_kRziM')
      expect(result).toEqual({
        type: 'deal',
        collection: 'deals',
        id: 'deal_kRziM',
        sqid: 'kRziM',
      })
    })

    it('parses camelCase type prefixes', () => {
      const result = parseEntityId('featureFlag_x9z')
      expect(result).toEqual({
        type: 'featureFlag',
        collection: 'featureFlags',
        id: 'featureFlag_x9z',
        sqid: 'x9z',
      })
    })

    it('parses entity IDs with numeric sqids', () => {
      const result = parseEntityId('lead_123')
      expect(result).toEqual({
        type: 'lead',
        collection: 'leads',
        id: 'lead_123',
        sqid: '123',
      })
    })

    it('pluralizes correctly for words ending in y', () => {
      const result = parseEntityId('activity_abc')
      expect(result).toEqual({
        type: 'activity',
        collection: 'activities',
        id: 'activity_abc',
        sqid: 'abc',
      })
    })

    it('pluralizes correctly for words ending in s', () => {
      const result = parseEntityId('address_abc')
      expect(result).toEqual({
        type: 'address',
        collection: 'addresses',
        id: 'address_abc',
        sqid: 'abc',
      })
    })

    it('pluralizes correctly for words ending in ch', () => {
      const result = parseEntityId('search_abc')
      expect(result).toEqual({
        type: 'search',
        collection: 'searches',
        id: 'search_abc',
        sqid: 'abc',
      })
    })

    it('does not double-pluralize words ending in ey', () => {
      const result = parseEntityId('survey_abc')
      expect(result).toEqual({
        type: 'survey',
        collection: 'surveys',
        id: 'survey_abc',
        sqid: 'abc',
      })
    })

    it('returns null for invalid entity IDs', () => {
      expect(parseEntityId('contacts')).toBeNull()
      expect(parseEntityId('$schema')).toBeNull()
      expect(parseEntityId('')).toBeNull()
      expect(parseEntityId('score(abc)')).toBeNull()
    })

    it('handles apiKey type prefix', () => {
      const result = parseEntityId('apiKey_V1StGXR8')
      expect(result).toEqual({
        type: 'apiKey',
        collection: 'apiKeys',
        id: 'apiKey_V1StGXR8',
        sqid: 'V1StGXR8',
      })
    })
  })
})
