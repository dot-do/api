/**
 * Test that demonstrates the type narrowing issue with `unknown` in Matcher union
 *
 * RED PHASE: This test shows that TypeScript cannot narrow the Matcher type
 * when `unknown` is part of the union, because `unknown` absorbs all other types.
 */
import { describe, it, expect, expectTypeOf } from 'vitest'
import type {
  Matcher,
  TypeMatcher,
  PatternMatcher,
  FormatMatcher,
  RangeMatcher,
  LengthMatcher,
  EnumMatcher,
  OptionalMatcher,
  LiteralMatcher,
} from '../src/types.js'
import {
  isMatcher,
  isTypeMatcher,
  isPatternMatcher,
  isLiteralMatcher,
} from '../src/assertions/index.js'

describe('Matcher type narrowing', () => {
  describe('type guards should narrow Matcher type correctly', () => {
    it('should narrow to TypeMatcher', () => {
      const matcher: Matcher = { type: 'string' }

      if (isTypeMatcher(matcher)) {
        // After narrowing, matcher should be TypeMatcher
        expectTypeOf(matcher).toMatchTypeOf<TypeMatcher>()
        expect(matcher.type).toBe('string')
      }
    })

    it('should narrow to PatternMatcher', () => {
      const matcher: Matcher = { pattern: '^test' }

      if (isPatternMatcher(matcher)) {
        // After narrowing, matcher should be PatternMatcher
        expectTypeOf(matcher).toMatchTypeOf<PatternMatcher>()
        expect(matcher.pattern).toBe('^test')
      }
    })

    it('should identify LiteralMatcher for literal values', () => {
      // Create a literal matcher using the new branded type
      const matcher: Matcher = { __literal: true, value: 'hello' } as LiteralMatcher

      if (isLiteralMatcher(matcher)) {
        // After narrowing, matcher should be LiteralMatcher
        expectTypeOf(matcher).toMatchTypeOf<LiteralMatcher>()
        expect(matcher.value).toBe('hello')
      }
    })

    it('should distinguish between matchers and literal matchers', () => {
      const typeMatcher: Matcher = { type: 'string' }
      const literalMatcher: Matcher = { __literal: true, value: { name: 'test' } } as LiteralMatcher

      expect(isMatcher(typeMatcher)).toBe(true)
      expect(isLiteralMatcher(typeMatcher)).toBe(false)

      expect(isLiteralMatcher(literalMatcher)).toBe(true)
      // LiteralMatcher is a valid Matcher, so isMatcher should return true
      expect(isMatcher(literalMatcher)).toBe(true)
    })
  })

  describe('Matcher union type completeness', () => {
    it('should handle all matcher types without unknown', () => {
      // These should all be valid Matcher types
      const matchers: Matcher[] = [
        { type: 'string' } satisfies TypeMatcher,
        { pattern: '^test' } satisfies PatternMatcher,
        { format: 'email' } satisfies FormatMatcher,
        { gte: 0, lte: 100 } satisfies RangeMatcher,
        { length: 5 } satisfies LengthMatcher,
        { oneOf: ['a', 'b'] } satisfies EnumMatcher,
        { optional: true } satisfies OptionalMatcher,
        { __literal: true, value: 'literal' } satisfies LiteralMatcher,
      ]

      expect(matchers.length).toBe(8)
    })

    it('should create LiteralMatcher for arbitrary literal values', () => {
      const literalString: LiteralMatcher = { __literal: true, value: 'hello' }
      const literalNumber: LiteralMatcher = { __literal: true, value: 42 }
      const literalObject: LiteralMatcher = { __literal: true, value: { nested: true } }

      expect(literalString.value).toBe('hello')
      expect(literalNumber.value).toBe(42)
      expect(literalObject.value).toEqual({ nested: true })
    })
  })
})
