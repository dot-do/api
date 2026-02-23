/**
 * Utils Tests - deepMerge prototype pollution protection
 *
 * TDD tests for issue api-4us: Fix prototype pollution in deepMerge utility
 */

import { describe, it, expect } from 'vitest'
import { deepMerge } from '../../../src/conventions/functions/utils'

describe('deepMerge', () => {
  describe('prototype pollution protection', () => {
    it('should reject __proto__ key', () => {
      const target = { a: 1 }
      const malicious = JSON.parse('{"__proto__": {"polluted": true}}')

      const result = deepMerge(target, malicious)

      // The __proto__ key should be ignored
      expect(result).toEqual({ a: 1 })
      // Verify prototype was not polluted
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    })

    it('should reject constructor key', () => {
      const target = { a: 1 }
      const malicious = { constructor: { prototype: { polluted: true } } }

      const result = deepMerge(target, malicious)

      // The constructor key should be ignored
      expect(result).toEqual({ a: 1 })
      expect(result.constructor).toBe(Object)
    })

    it('should reject prototype key', () => {
      const target = { a: 1 }
      const malicious = { prototype: { polluted: true } }

      const result = deepMerge(target, malicious)

      // The prototype key should be ignored
      expect(result).toEqual({ a: 1 })
      expect((result as Record<string, unknown>).prototype).toBeUndefined()
    })

    it('should reject nested dangerous keys', () => {
      const target = { nested: { safe: true } }
      const malicious = {
        nested: JSON.parse('{"__proto__": {"polluted": true}}'),
      }

      const result = deepMerge(target, malicious)

      // Nested __proto__ should also be ignored
      expect(result).toEqual({ nested: { safe: true } })
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    })
  })

  describe('normal merge behavior', () => {
    it('should merge simple objects', () => {
      const target = { a: 1 }
      const source = { b: 2 }

      const result = deepMerge(target, source)

      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should deep merge nested objects', () => {
      const target = { user: { name: 'John' } }
      const source = { user: { age: 30 } }

      const result = deepMerge(target, source)

      expect(result).toEqual({ user: { name: 'John', age: 30 } })
    })

    it('should override primitive values', () => {
      const target = { a: 1, b: 2 }
      const source = { b: 3 }

      const result = deepMerge(target, source)

      expect(result).toEqual({ a: 1, b: 3 })
    })

    it('should handle arrays by replacing them', () => {
      const target = { items: [1, 2] }
      const source = { items: [3, 4, 5] }

      const result = deepMerge(target, source)

      expect(result).toEqual({ items: [3, 4, 5] })
    })

    it('should handle multiple sources', () => {
      const target = { a: 1 }
      const source1 = { b: 2 }
      const source2 = { c: 3 }

      const result = deepMerge(target, source1, source2)

      expect(result).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('should handle null and undefined sources gracefully', () => {
      const target = { a: 1 }

      const result = deepMerge(target, null, undefined, { b: 2 })

      expect(result).toEqual({ a: 1, b: 2 })
    })
  })
})
