import { describe, it, expect } from 'vitest'
import {
  match,
  matchType,
  matchPattern,
  matchFormat,
  matchRange,
  matchLength,
  matchEnum,
  deepEqual,
  isMatcher,
  matchPartial,
  matchExact,
  matchWithPaths,
  getValueByPath,
  parsePath,
  validateSchema,
  inferSchema,
} from '../src/assertions/index.js'

describe('matchers', () => {
  describe('matchType', () => {
    it('matches string type', () => {
      expect(matchType('hello', 'string').passed).toBe(true)
      expect(matchType(123, 'string').passed).toBe(false)
    })

    it('matches number type', () => {
      expect(matchType(123, 'number').passed).toBe(true)
      expect(matchType('123', 'number').passed).toBe(false)
    })

    it('matches boolean type', () => {
      expect(matchType(true, 'boolean').passed).toBe(true)
      expect(matchType('true', 'boolean').passed).toBe(false)
    })

    it('matches array type', () => {
      expect(matchType([1, 2, 3], 'array').passed).toBe(true)
      expect(matchType({}, 'array').passed).toBe(false)
    })

    it('matches object type', () => {
      expect(matchType({}, 'object').passed).toBe(true)
      expect(matchType([], 'object').passed).toBe(false)
    })

    it('matches null type', () => {
      expect(matchType(null, 'null').passed).toBe(true)
      expect(matchType(undefined, 'null').passed).toBe(false)
    })
  })

  describe('matchPattern', () => {
    it('matches regex patterns', () => {
      expect(matchPattern('user-123', '^user-\\d+$').passed).toBe(true)
      expect(matchPattern('admin-abc', '^user-\\d+$').passed).toBe(false)
    })

    it('returns error for non-string values', () => {
      expect(matchPattern(123, '^\\d+$').passed).toBe(false)
    })
  })

  describe('matchFormat', () => {
    it('validates email format', () => {
      expect(matchFormat('test@example.com', 'email').passed).toBe(true)
      expect(matchFormat('invalid', 'email').passed).toBe(false)
    })

    it('validates date-time format', () => {
      expect(matchFormat('2024-01-15T10:30:00Z', 'date-time').passed).toBe(true)
      expect(matchFormat('2024-01-15', 'date-time').passed).toBe(false)
    })

    it('validates uuid format', () => {
      expect(matchFormat('550e8400-e29b-41d4-a716-446655440000', 'uuid').passed).toBe(true)
      expect(matchFormat('not-a-uuid', 'uuid').passed).toBe(false)
    })

    it('validates uri format', () => {
      expect(matchFormat('https://example.com', 'uri').passed).toBe(true)
      expect(matchFormat('not-a-uri', 'uri').passed).toBe(false)
    })
  })

  describe('matchRange', () => {
    it('matches gte constraint', () => {
      expect(matchRange(5, { gte: 5 }).passed).toBe(true)
      expect(matchRange(4, { gte: 5 }).passed).toBe(false)
    })

    it('matches lte constraint', () => {
      expect(matchRange(5, { lte: 5 }).passed).toBe(true)
      expect(matchRange(6, { lte: 5 }).passed).toBe(false)
    })

    it('matches combined constraints', () => {
      expect(matchRange(5, { gte: 0, lte: 10 }).passed).toBe(true)
      expect(matchRange(15, { gte: 0, lte: 10 }).passed).toBe(false)
    })
  })

  describe('matchLength', () => {
    it('matches exact length', () => {
      expect(matchLength('hello', { length: 5 }).passed).toBe(true)
      expect(matchLength('hi', { length: 5 }).passed).toBe(false)
    })

    it('matches minLength', () => {
      expect(matchLength('hello', { minLength: 3 }).passed).toBe(true)
      expect(matchLength('hi', { minLength: 3 }).passed).toBe(false)
    })

    it('matches array length', () => {
      expect(matchLength([1, 2, 3], { length: 3 }).passed).toBe(true)
    })
  })

  describe('matchEnum', () => {
    it('matches enum values', () => {
      expect(matchEnum('active', ['active', 'inactive']).passed).toBe(true)
      expect(matchEnum('pending', ['active', 'inactive']).passed).toBe(false)
    })
  })

  describe('match', () => {
    it('matches literal values', () => {
      expect(match('hello', 'hello').passed).toBe(true)
      expect(match('hello', 'world').passed).toBe(false)
    })

    it('matches type matchers', () => {
      expect(match('hello', { type: 'string' }).passed).toBe(true)
    })

    it('matches combined matchers', () => {
      expect(match('user-123', { type: 'string', pattern: '^user-' }).passed).toBe(true)
    })
  })

  describe('isMatcher', () => {
    it('identifies type matchers', () => {
      expect(isMatcher({ type: 'string' })).toBe(true)
    })

    it('identifies pattern matchers', () => {
      expect(isMatcher({ pattern: '^test' })).toBe(true)
    })

    it('returns false for literal objects', () => {
      expect(isMatcher({ name: 'test' })).toBe(false)
    })
  })
})

describe('deepEqual', () => {
  it('compares primitives', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(1, 2)).toBe(false)
  })

  it('compares arrays', () => {
    expect(deepEqual([1, 2], [1, 2])).toBe(true)
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
  })

  it('compares objects', () => {
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
  })

  it('compares nested structures', () => {
    expect(deepEqual({ a: { b: [1, 2] } }, { a: { b: [1, 2] } })).toBe(true)
  })
})

describe('partial matching', () => {
  describe('matchPartial', () => {
    it('matches subset of object', () => {
      const result = matchPartial(
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { name: 'Alice' }
      )
      expect(result.passed).toBe(true)
    })

    it('fails when expected value does not match', () => {
      const result = matchPartial(
        { name: 'Bob' },
        { name: 'Alice' }
      )
      expect(result.passed).toBe(false)
    })

    it('matches nested objects', () => {
      const result = matchPartial(
        { user: { id: '1', name: 'Alice' } },
        { user: { name: 'Alice' } }
      )
      expect(result.passed).toBe(true)
    })
  })

  describe('matchExact', () => {
    it('requires exact match', () => {
      const result = matchExact(
        { name: 'Alice' },
        { name: 'Alice' }
      )
      expect(result.passed).toBe(true)
    })

    it('fails when extra keys present', () => {
      const result = matchExact(
        { name: 'Alice', extra: true },
        { name: 'Alice' }
      )
      expect(result.passed).toBe(false)
    })
  })

  describe('matchWithPaths', () => {
    it('matches values at JSONPath expressions', () => {
      const result = matchWithPaths(
        { data: { user: { name: 'Alice' } } },
        { 'data.user.name': 'Alice' }
      )
      expect(result.passed).toBe(true)
    })

    it('supports matchers in path values', () => {
      const result = matchWithPaths(
        { data: { count: 5 } },
        { 'data.count': { type: 'number', gte: 1 } }
      )
      expect(result.passed).toBe(true)
    })
  })
})

describe('jsonpath', () => {
  describe('parsePath', () => {
    it('parses dot notation', () => {
      expect(parsePath('a.b.c')).toEqual(['a', 'b', 'c'])
    })

    it('parses bracket notation', () => {
      expect(parsePath('a[0].b')).toEqual(['a', 0, 'b'])
    })

    it('parses quoted keys', () => {
      expect(parsePath("a['key with spaces'].b")).toEqual(['a', 'key with spaces', 'b'])
    })
  })

  describe('getValueByPath', () => {
    const obj = {
      user: {
        name: 'Alice',
        emails: ['alice@example.com', 'a@test.com'],
      },
    }

    it('gets nested values', () => {
      expect(getValueByPath(obj, 'user.name')).toBe('Alice')
    })

    it('gets array elements', () => {
      expect(getValueByPath(obj, 'user.emails[0]')).toBe('alice@example.com')
    })

    it('returns undefined for missing paths', () => {
      expect(getValueByPath(obj, 'user.missing')).toBeUndefined()
    })
  })
})

describe('schema validation', () => {
  describe('validateSchema', () => {
    it('validates against JSON Schema', () => {
      const result = validateSchema(
        { name: 'Alice', age: 30 },
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name'],
        }
      )
      expect(result.valid).toBe(true)
    })

    it('returns errors for invalid data', () => {
      const result = validateSchema(
        { name: 123 },
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        }
      )
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('inferSchema', () => {
    it('infers schema from string', () => {
      expect(inferSchema('hello')).toEqual({ type: 'string' })
    })

    it('infers schema from email', () => {
      expect(inferSchema('test@example.com')).toEqual({ type: 'string', format: 'email' })
    })

    it('infers schema from object', () => {
      const schema = inferSchema({ name: 'Alice', count: 5 })
      expect(schema.type).toBe('object')
      expect(schema.properties?.name).toEqual({ type: 'string' })
      expect(schema.properties?.count).toEqual({ type: 'integer' })
    })
  })
})
