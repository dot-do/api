import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createContext,
  cloneContext,
  setVariable,
  getVariable,
  interpolate,
  interpolateObject,
  getTestProtocol,
  execute,
  executeSequential,
} from '../src/runner/index.js'
import type { TestCase, RpcTestCase, RestTestCase, TestContext } from '../src/types.js'

describe('context', () => {
  describe('createContext', () => {
    it('creates context with defaults', () => {
      const ctx = createContext({ baseUrl: 'https://api.example.com' })
      expect(ctx.baseUrl).toBe('https://api.example.com')
      expect(ctx.variables).toEqual({})
    })

    it('creates context with all options', () => {
      const ctx = createContext({
        baseUrl: 'https://api.example.com',
        accessToken: 'token123',
        clientId: 'client-id',
        variables: { userId: '123' },
      })
      expect(ctx.accessToken).toBe('token123')
      expect(ctx.clientId).toBe('client-id')
      expect(ctx.variables.userId).toBe('123')
    })
  })

  describe('cloneContext', () => {
    it('creates a copy with overrides', () => {
      const original = createContext({
        baseUrl: 'https://api.example.com',
        accessToken: 'token1',
        variables: { a: 1 },
      })

      const cloned = cloneContext(original, {
        accessToken: 'token2',
        variables: { b: 2 },
      })

      expect(cloned.baseUrl).toBe('https://api.example.com')
      expect(cloned.accessToken).toBe('token2')
      expect(cloned.variables).toEqual({ a: 1, b: 2 })
    })
  })

  describe('setVariable/getVariable', () => {
    it('sets and gets variables', () => {
      let ctx = createContext({ baseUrl: 'https://api.example.com' })
      ctx = setVariable(ctx, 'userId', '123')
      expect(getVariable(ctx, 'userId')).toBe('123')
    })
  })

  describe('interpolate', () => {
    it('interpolates ${var} syntax', () => {
      const ctx = createContext({
        baseUrl: 'https://api.example.com',
        variables: { userId: '123' },
      })
      expect(interpolate('/users/${userId}', ctx)).toBe('/users/123')
    })

    it('interpolates {{var}} syntax', () => {
      const ctx = createContext({
        baseUrl: 'https://api.example.com',
        variables: { name: 'Alice' },
      })
      expect(interpolate('Hello {{name}}', ctx)).toBe('Hello Alice')
    })
  })

  describe('interpolateObject', () => {
    it('interpolates nested objects', () => {
      const ctx = createContext({
        baseUrl: 'https://api.example.com',
        variables: { userId: '123' },
      })

      const result = interpolateObject(
        { path: '/users/${userId}', body: { id: '${userId}' } },
        ctx
      )

      expect(result).toEqual({ path: '/users/123', body: { id: '123' } })
    })
  })
})

describe('executor', () => {
  describe('getTestProtocol', () => {
    it('detects REST tests', () => {
      const test: RestTestCase = {
        name: 'test',
        request: { method: 'GET', path: '/users' },
        expect: { status: 200 },
      }
      expect(getTestProtocol(test)).toBe('rest')
    })

    it('detects MCP tests', () => {
      const test: RpcTestCase = {
        name: 'test',
        type: 'mcp',
        method: 'users.list',
        input: {},
        expect: { status: 'success' },
      }
      expect(getTestProtocol(test)).toBe('mcp')
    })

    it('detects RPC tests', () => {
      const test: RpcTestCase = {
        name: 'test',
        type: 'rpc',
        method: 'users.list',
        input: {},
        expect: { status: 'success' },
      }
      expect(getTestProtocol(test)).toBe('rpc')
    })

    it('infers type from structure', () => {
      const test: RpcTestCase = {
        name: 'test',
        method: 'users.list',
        input: {},
        expect: { status: 'success' },
      }
      expect(getTestProtocol(test)).toBe('mcp')
    })
  })

  describe('executeSequential', () => {
    it('skips tests with skip flag', async () => {
      const tests: TestCase[] = [
        {
          name: 'skipped test',
          skip: true,
          request: { method: 'GET', path: '/test' },
          expect: { status: 200 },
        } as RestTestCase,
      ]

      const results = await executeSequential(tests, {
        baseUrl: 'https://api.example.com',
      })

      expect(results[0]?.status).toBe('skipped')
    })
  })
})
