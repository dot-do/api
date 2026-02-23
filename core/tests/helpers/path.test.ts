import { describe, it, expect } from 'vitest'
import {
  normalizePath,
  hasTraversalSequence,
  validateProxyPath
} from '../../src/helpers/path'

describe('Path helpers', () => {
  describe('normalizePath', () => {
    it('normalizes simple paths', () => {
      expect(normalizePath('/api/users')).toBe('/api/users')
      expect(normalizePath('/api/users/')).toBe('/api/users')
      expect(normalizePath('/')).toBe('/')
    })

    it('removes redundant slashes and dots', () => {
      expect(normalizePath('/api//users')).toBe('/api/users')
      expect(normalizePath('/api/./users')).toBe('/api/users')
      expect(normalizePath('/./api/users')).toBe('/api/users')
    })

    it('resolves parent directory references within bounds', () => {
      expect(normalizePath('/api/v1/../v2/users')).toBe('/api/v2/users')
      expect(normalizePath('/api/foo/bar/../baz')).toBe('/api/foo/baz')
    })

    it('returns null for paths that escape root', () => {
      expect(normalizePath('/../secrets')).toBe(null)
      expect(normalizePath('/../../etc/passwd')).toBe(null)
      expect(normalizePath('/api/../../etc')).toBe(null)
    })

    it('decodes and normalizes URL-encoded paths', () => {
      // normalizePath decodes and normalizes - traversal detection is done by hasTraversalSequence
      expect(normalizePath('/api/%2e%2e/secrets')).toBe('/secrets')
      // This is a valid path after decoding (users/../secrets = secrets)
      expect(normalizePath('/api/users/../secrets')).toBe('/api/secrets')
    })

    it('returns null for invalid encoding', () => {
      expect(normalizePath('/api/%ZZ/invalid')).toBe(null)
    })
  })

  describe('hasTraversalSequence', () => {
    it('detects .. in path', () => {
      expect(hasTraversalSequence('/public/../internal')).toBe(true)
      expect(hasTraversalSequence('/../secrets')).toBe(true)
      expect(hasTraversalSequence('/api/../../etc')).toBe(true)
    })

    it('detects encoded .. sequences', () => {
      expect(hasTraversalSequence('/public/%2e%2e/internal')).toBe(true)
      expect(hasTraversalSequence('/public/%2E%2E/internal')).toBe(true)
    })

    it('does not flag paths without traversal', () => {
      expect(hasTraversalSequence('/api/users')).toBe(false)
      expect(hasTraversalSequence('/api/v1/users/123')).toBe(false)
      expect(hasTraversalSequence('/files/data..json')).toBe(false)
      expect(hasTraversalSequence('/api/..data')).toBe(false)
    })

    it('detects double-encoded traversal', () => {
      // %252e = %2e (encoded percent sign)
      expect(hasTraversalSequence('/public/%252e%252e/internal')).toBe(true)
    })
  })

  describe('validateProxyPath', () => {
    it('validates simple paths', () => {
      const result = validateProxyPath('/api/users')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('/api/users')
    })

    it('enforces allowedPaths', () => {
      const result = validateProxyPath('/internal/secrets', {
        allowedPaths: ['/public', '/api']
      })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('PATH_NOT_ALLOWED')
    })

    it('allows paths matching allowedPaths prefix', () => {
      const result = validateProxyPath('/api/users/123', {
        allowedPaths: ['/api']
      })
      expect(result.valid).toBe(true)
    })

    it('allows exact match of allowedPaths', () => {
      const result = validateProxyPath('/api', {
        allowedPaths: ['/api']
      })
      expect(result.valid).toBe(true)
    })

    it('blocks traversal when blockTraversal is enabled', () => {
      const result = validateProxyPath('/internal', {
        blockTraversal: true,
        originalPath: '/public/../internal'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('INVALID_PATH')
    })

    it('uses originalPath for traversal detection', () => {
      // Simulates URL normalization: browser normalizes /public/../internal to /internal
      // But X-Original-Path header preserves the original
      const result = validateProxyPath('/internal', {
        blockTraversal: true,
        originalPath: '/public/../internal'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('INVALID_PATH')
    })

    it('passes when no traversal in originalPath', () => {
      const result = validateProxyPath('/api/users', {
        blockTraversal: true,
        originalPath: '/api/users'
      })
      expect(result.valid).toBe(true)
    })

    it('combines allowedPaths and blockTraversal checks', () => {
      // Traversal detected first
      const result1 = validateProxyPath('/internal', {
        allowedPaths: ['/public'],
        blockTraversal: true,
        originalPath: '/public/../internal'
      })
      expect(result1.valid).toBe(false)
      expect(result1.error).toBe('INVALID_PATH')

      // No traversal, but path not allowed
      const result2 = validateProxyPath('/internal', {
        allowedPaths: ['/public'],
        blockTraversal: true
      })
      expect(result2.valid).toBe(false)
      expect(result2.error).toBe('PATH_NOT_ALLOWED')
    })
  })
})
