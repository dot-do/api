import { describe, it, expect } from 'vitest'
import { parseFunctionCall, isFunctionCall } from '../../src/helpers/function-parser'

describe('Function Call Parser', () => {
  describe('isFunctionCall', () => {
    it('detects function calls with parentheses', () => {
      expect(isFunctionCall('score(contact_abc)')).toBe(true)
      expect(isFunctionCall('merge(a,b)')).toBe(true)
      expect(isFunctionCall('papa.parse(url)')).toBe(true)
      expect(isFunctionCall('fn()')).toBe(true)
    })

    it('rejects strings without parentheses', () => {
      expect(isFunctionCall('contacts')).toBe(false)
      expect(isFunctionCall('contact_abc')).toBe(false)
      expect(isFunctionCall('$schema')).toBe(false)
      expect(isFunctionCall('search')).toBe(false)
    })

    it('rejects strings with only opening paren', () => {
      expect(isFunctionCall('score(')).toBe(false)
    })

    it('rejects strings with only closing paren', () => {
      expect(isFunctionCall('score)')).toBe(false)
    })
  })

  describe('parseFunctionCall', () => {
    it('parses a simple function call with entity arg', () => {
      const result = parseFunctionCall('score(contact_abc)')
      expect(result).toEqual({
        name: 'score',
        args: [{ value: 'contact_abc', type: 'entity' }],
        kwargs: {},
      })
    })

    it('parses a function call with multiple entity args', () => {
      const result = parseFunctionCall('merge(contact_abc,contact_def)')
      expect(result).toEqual({
        name: 'merge',
        args: [
          { value: 'contact_abc', type: 'entity' },
          { value: 'contact_def', type: 'entity' },
        ],
        kwargs: {},
      })
    })

    it('parses a dotted function name with URL and named args', () => {
      const result = parseFunctionCall('papa.parse(https://example.com/data.csv,header=true)')
      expect(result).toEqual({
        name: 'papa.parse',
        args: [{ value: 'https://example.com/data.csv', type: 'url' }],
        kwargs: { header: 'true' },
      })
    })

    it('parses a function call with no arguments', () => {
      const result = parseFunctionCall('healthcheck()')
      expect(result).toEqual({
        name: 'healthcheck',
        args: [],
        kwargs: {},
      })
    })

    it('parses a function call with numeric argument', () => {
      const result = parseFunctionCall('fibonacci(42)')
      expect(result).toEqual({
        name: 'fibonacci',
        args: [{ value: '42', type: 'number' }],
        kwargs: {},
      })
    })

    it('parses a function call with negative number', () => {
      const result = parseFunctionCall('offset(-10)')
      expect(result).toEqual({
        name: 'offset',
        args: [{ value: '-10', type: 'number' }],
        kwargs: {},
      })
    })

    it('parses a function call with decimal number', () => {
      const result = parseFunctionCall('round(3.14)')
      expect(result).toEqual({
        name: 'round',
        args: [{ value: '3.14', type: 'number' }],
        kwargs: {},
      })
    })

    it('parses a function call with string argument', () => {
      const result = parseFunctionCall('greet(world)')
      expect(result).toEqual({
        name: 'greet',
        args: [{ value: 'world', type: 'string' }],
        kwargs: {},
      })
    })

    it('parses multiple named args', () => {
      const result = parseFunctionCall('configure(mode=dark,lang=en)')
      expect(result).toEqual({
        name: 'configure',
        args: [],
        kwargs: { mode: 'dark', lang: 'en' },
      })
    })

    it('parses mixed positional and named args', () => {
      const result = parseFunctionCall('query(contact_abc,limit=10,offset=0)')
      expect(result).toEqual({
        name: 'query',
        args: [{ value: 'contact_abc', type: 'entity' }],
        kwargs: { limit: '10', offset: '0' },
      })
    })

    it('parses HTTP URL argument', () => {
      const result = parseFunctionCall('fetch(http://example.com)')
      expect(result).toEqual({
        name: 'fetch',
        args: [{ value: 'http://example.com', type: 'url' }],
        kwargs: {},
      })
    })

    it('returns null for non-function-call strings', () => {
      expect(parseFunctionCall('contacts')).toBeNull()
      expect(parseFunctionCall('contact_abc')).toBeNull()
    })

    it('returns null for empty function name', () => {
      expect(parseFunctionCall('(abc)')).toBeNull()
    })

    it('returns null for invalid function name characters', () => {
      expect(parseFunctionCall('foo bar(abc)')).toBeNull()
      expect(parseFunctionCall('foo/bar(abc)')).toBeNull()
    })

    it('handles whitespace in arguments', () => {
      const result = parseFunctionCall('merge( contact_abc , contact_def )')
      expect(result).toEqual({
        name: 'merge',
        args: [
          { value: 'contact_abc', type: 'entity' },
          { value: 'contact_def', type: 'entity' },
        ],
        kwargs: {},
      })
    })

    it('handles underscored function names', () => {
      const result = parseFunctionCall('my_func(hello)')
      expect(result).toEqual({
        name: 'my_func',
        args: [{ value: 'hello', type: 'string' }],
        kwargs: {},
      })
    })
  })
})
