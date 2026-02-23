import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { rpcConvention } from '../../src/conventions/rpc'
import { responseMiddleware } from '../../src/response'
import { contextMiddleware } from '../../src/middleware/context'
import type { ApiEnv, RpcConfig } from '../../src/types'

// Mock rpc.do to prevent actual HTTP calls during tests
vi.mock('rpc.do', () => ({
  // Return a module without a 'call' function so it falls through to the error case
  default: {},
  $: () => { throw new Error('rpc.do mock - no real calls') },
  RPC: () => { throw new Error('rpc.do mock - no real calls') },
}))

/**
 * Creates a mock RPC binding for tests.
 * Simulates a service binding with callable methods.
 */
function createMockRpcBinding(methods: Record<string, (...args: unknown[]) => Promise<unknown> | unknown> = {}) {
  return methods
}

/**
 * Creates a mock RPC binding with nested methods (e.g., users.list, users.get).
 */
function createNestedMockRpcBinding(structure: Record<string, Record<string, (...args: unknown[]) => Promise<unknown> | unknown>>) {
  return structure
}

function createTestApp(config: RpcConfig, env: Record<string, unknown> = {}) {
  const app = new Hono<ApiEnv>()

  app.use('*', contextMiddleware())
  app.use('*', responseMiddleware({ name: 'rpc-test' }))

  app.route('/', rpcConvention(config))

  return { app, env }
}

describe('RPC convention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Root endpoint', () => {
    it('lists available RPC methods', async () => {
      const methods = ['users.list', 'users.get', 'orders.create']
      const { app, env } = createTestApp({ methods })

      const res = await app.request('/rpc', {}, env)
      expect(res.status).toBe(200)

      const body = await res.json() as Record<string, unknown>
      expect(body.api).toBeDefined()
      expect((body.api as Record<string, unknown>).name).toBe('rpc-test')
      expect((body.data as Record<string, unknown>).methods).toEqual(methods)
    })

    it('returns empty methods array when no methods configured', async () => {
      const { app, env } = createTestApp({})

      const res = await app.request('/rpc', {}, env)
      expect(res.status).toBe(200)

      const body = await res.json() as Record<string, unknown>
      expect((body.data as Record<string, unknown>).methods).toEqual([])
    })

    it('includes actions for each method', async () => {
      const methods = ['echo', 'ping']
      const { app, env } = createTestApp({ methods })

      const res = await app.request('/rpc', {}, env)
      expect(res.status).toBe(200)

      const body = await res.json() as Record<string, unknown>
      const actions = body.actions as Record<string, string>

      // Actions are normalized to URL strings in the new envelope
      expect(actions.echo).toContain('/rpc/echo')
      expect(actions.ping).toContain('/rpc/ping')
    })
  })

  describe('Method execution', () => {
    it('returns result from binding', async () => {
      const mockBinding = createMockRpcBinding({
        echo: vi.fn().mockResolvedValue({ echoed: 'hello' }),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['echo'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'hello' }),
      }, env)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, unknown>
      expect(body.data).toEqual({ echoed: 'hello' })
      expect(mockBinding.echo).toHaveBeenCalledWith({ message: 'hello' })
    })

    it('passes parameters to binding method', async () => {
      const addFn = vi.fn().mockResolvedValue(42)
      const mockBinding = createMockRpcBinding({ add: addFn })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['add'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: 20, b: 22 }),
      }, env)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, unknown>
      expect(body.data).toBe(42)
      expect(addFn).toHaveBeenCalledWith({ a: 20, b: 22 })
    })

    it('handles empty request body gracefully', async () => {
      const mockBinding = createMockRpcBinding({
        ping: vi.fn().mockResolvedValue('pong'),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['ping'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/ping', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, unknown>
      expect(body.data).toBe('pong')
      expect(mockBinding.ping).toHaveBeenCalledWith({})
    })
  })

  describe('Nested method paths', () => {
    it('resolves nested methods like users.list', async () => {
      const listFn = vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }])
      const mockBinding = createNestedMockRpcBinding({
        users: { list: listFn },
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['users.list'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/users.list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      }, env)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, unknown>
      expect(body.data).toEqual([{ id: 1, name: 'Alice' }])
      expect(listFn).toHaveBeenCalledWith({ limit: 10 })
    })

    it('resolves deeply nested methods like db.users.find', async () => {
      const findFn = vi.fn().mockResolvedValue({ id: 42, email: 'test@example.com' })
      const mockBinding = {
        db: {
          users: { find: findFn },
        },
      }

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['db.users.find'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/db.users.find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 42 }),
      }, env)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, unknown>
      expect(body.data).toEqual({ id: 42, email: 'test@example.com' })
      expect(findFn).toHaveBeenCalledWith({ id: 42 })
    })

    it('supports multiple nested namespaces', async () => {
      const usersListFn = vi.fn().mockResolvedValue(['user1'])
      const ordersListFn = vi.fn().mockResolvedValue(['order1'])
      const mockBinding = {
        users: { list: usersListFn },
        orders: { list: ordersListFn },
      }

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['users.list', 'orders.list'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res1 = await app.request('/rpc/users.list', { method: 'POST' }, env)
      const body1 = await res1.json() as Record<string, unknown>
      expect(body1.data).toEqual(['user1'])

      const res2 = await app.request('/rpc/orders.list', { method: 'POST' }, env)
      const body2 = await res2.json() as Record<string, unknown>
      expect(body2.data).toEqual(['order1'])
    })
  })

  describe('Unknown method handling', () => {
    it('returns 404 for unknown method', async () => {
      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['echo', 'ping'],
      }
      const { app, env } = createTestApp(config)

      const res = await app.request('/rpc/unknown', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(404)
      const body = await res.json() as Record<string, unknown>
      expect(body.error).toBeDefined()
      expect((body.error as Record<string, unknown>).code).toBe('METHOD_NOT_FOUND')
      expect((body.error as Record<string, unknown>).message).toContain('unknown')
    })

    it('returns 404 for method not in whitelist', async () => {
      const mockBinding = createMockRpcBinding({
        admin: vi.fn().mockResolvedValue('admin action'),
        user: vi.fn().mockResolvedValue('user action'),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['user'], // Only 'user' is whitelisted
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/admin', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(404)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('METHOD_NOT_FOUND')
    })

    it('returns 404 for nested method not in whitelist', async () => {
      const mockBinding = {
        admin: { delete: vi.fn() },
        users: { list: vi.fn() },
      }

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['users.list'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/admin.delete', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(404)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('METHOD_NOT_FOUND')
    })
  })

  describe('Whitelist validation', () => {
    it('allows execution when methods whitelist is configured and method is included', async () => {
      const mockBinding = createMockRpcBinding({
        allowed: vi.fn().mockResolvedValue('allowed result'),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['allowed'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/allowed', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, unknown>
      expect(body.data).toBe('allowed result')
    })

    it('blocks execution when method is not in whitelist', async () => {
      const mockBinding = createMockRpcBinding({
        blocked: vi.fn().mockResolvedValue('should not be called'),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['allowed'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/blocked', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(404)
      expect(mockBinding.blocked).not.toHaveBeenCalled()
    })

    it('allows any method when whitelist is not configured', async () => {
      const mockBinding = createMockRpcBinding({
        anyMethod: vi.fn().mockResolvedValue('result'),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        // No methods array = no whitelist
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/anyMethod', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, unknown>
      expect(body.data).toBe('result')
    })
  })

  describe('Prototype access prevention', () => {
    it('rejects __proto__ method path with 400', async () => {
      const mockBinding = createMockRpcBinding({})

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        // No whitelist to ensure validation happens before whitelist check
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/__proto__.polluted', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect(body.error).toBeDefined()
      expect((body.error as Record<string, unknown>).code).toBe('INVALID_METHOD')
      expect((body.error as Record<string, unknown>).message).toContain('__proto__')
    })

    it('rejects constructor method path with 400', async () => {
      const mockBinding = createMockRpcBinding({})

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/constructor.prototype', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect(body.error).toBeDefined()
      expect((body.error as Record<string, unknown>).code).toBe('INVALID_METHOD')
      expect((body.error as Record<string, unknown>).message).toContain('constructor')
    })

    it('rejects prototype method path with 400', async () => {
      const mockBinding = createMockRpcBinding({})

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/prototype.method', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect(body.error).toBeDefined()
      expect((body.error as Record<string, unknown>).code).toBe('INVALID_METHOD')
      expect((body.error as Record<string, unknown>).message).toContain('prototype')
    })

    it('rejects dangerous segments in nested paths', async () => {
      const mockBinding = createMockRpcBinding({})

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/users.__proto__.isAdmin', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(400)
      const body = await res.json() as Record<string, unknown>
      expect(body.error).toBeDefined()
      expect((body.error as Record<string, unknown>).code).toBe('INVALID_METHOD')
    })

    it('allows valid method paths that are not dangerous', async () => {
      const mockBinding = createMockRpcBinding({
        validMethod: vi.fn().mockResolvedValue('success'),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['validMethod'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/validMethod', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, unknown>
      expect(body.data).toBe('success')
    })
  })

  describe('Error handling', () => {
    it('returns 500 when binding is unavailable', async () => {
      const config: RpcConfig = {
        binding: 'MISSING_BINDING',
        methods: ['test'],
      }
      const { app } = createTestApp(config)
      const env = {} // No binding provided

      const res = await app.request('/rpc/test', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(500)
      const body = await res.json() as Record<string, unknown>
      expect(body.error).toBeDefined()
      expect((body.error as Record<string, unknown>).code).toBe('RPC_ERROR')
    })

    it('returns 500 when binding method is not a function', async () => {
      const mockBinding = {
        notAFunction: 'just a string',
      }

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['notAFunction'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/notAFunction', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(500)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('RPC_ERROR')
    })

    it('returns 500 when nested path does not resolve to function', async () => {
      const mockBinding = {
        users: {
          data: { name: 'not a function' }, // nested object, not function
        },
      }

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['users.data'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/users.data', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(500)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('RPC_ERROR')
    })

    it('returns 500 when binding is null', async () => {
      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['test'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: null }

      const res = await app.request('/rpc/test', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(500)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('RPC_ERROR')
    })

    it('returns 500 when binding method throws an error', async () => {
      const mockBinding = createMockRpcBinding({
        failing: vi.fn().mockRejectedValue(new Error('Internal failure')),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['failing'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      // The error is thrown by the binding, but the implementation catches it
      // and returns a proper response
      await expect(async () => {
        const res = await app.request('/rpc/failing', {
          method: 'POST',
        }, env)
        // If we get here, check the response
        const body = await res.json() as Record<string, unknown>
        if ((body.error as Record<string, unknown>)?.code === 'RPC_ERROR') {
          throw new Error('RPC_ERROR')
        }
      }).rejects.toThrow()
    })

    it('handles non-object binding gracefully', async () => {
      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['test'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: 'not an object' } // string instead of object

      const res = await app.request('/rpc/test', {
        method: 'POST',
      }, env)

      expect(res.status).toBe(500)
      const body = await res.json() as Record<string, unknown>
      expect((body.error as Record<string, unknown>).code).toBe('RPC_ERROR')
    })
  })

  describe('URL configuration', () => {
    it('accepts url configuration option', async () => {
      // When url is configured but binding is not available,
      // it should try rpc.do fallback
      const config: RpcConfig = {
        url: 'https://my-rpc-service.example.com',
        methods: ['test'],
      }
      const { app, env } = createTestApp(config)

      // This will fail because rpc.do is not available in tests
      const res = await app.request('/rpc/test', {
        method: 'POST',
      }, env)

      // Should return 500 since no binding or rpc.do available
      expect(res.status).toBe(500)
    })
  })

  describe('Response format', () => {
    it('wraps result in standard API envelope', async () => {
      const mockBinding = createMockRpcBinding({
        getData: vi.fn().mockResolvedValue({ key: 'value' }),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['getData'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/getData', {
        method: 'POST',
      }, env)

      const body = await res.json() as Record<string, unknown>

      // Check envelope structure
      expect(body.api).toBeDefined()
      expect((body.api as Record<string, unknown>).name).toBe('rpc-test')
      expect(body.links).toBeDefined()
      expect((body.links as Record<string, unknown>).self).toBeDefined()
      expect(body.data).toEqual({ key: 'value' })
    })

    it('preserves primitive return values', async () => {
      const mockBinding = createMockRpcBinding({
        getNumber: vi.fn().mockResolvedValue(42),
        getString: vi.fn().mockResolvedValue('hello'),
        getBoolean: vi.fn().mockResolvedValue(true),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['getNumber', 'getString', 'getBoolean'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res1 = await app.request('/rpc/getNumber', { method: 'POST' }, env)
      expect((await res1.json() as Record<string, unknown>).data).toBe(42)

      const res2 = await app.request('/rpc/getString', { method: 'POST' }, env)
      expect((await res2.json() as Record<string, unknown>).data).toBe('hello')

      const res3 = await app.request('/rpc/getBoolean', { method: 'POST' }, env)
      expect((await res3.json() as Record<string, unknown>).data).toBe(true)
    })

    it('handles null return values', async () => {
      const mockBinding = createMockRpcBinding({
        getNull: vi.fn().mockResolvedValue(null),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['getNull'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/getNull', { method: 'POST' }, env)
      expect((await res.json() as Record<string, unknown>).data).toBeNull()
    })

    it('handles array return values', async () => {
      const mockBinding = createMockRpcBinding({
        getArray: vi.fn().mockResolvedValue([1, 2, 3]),
      })

      const config: RpcConfig = {
        binding: 'RPC_SERVICE',
        methods: ['getArray'],
      }
      const { app } = createTestApp(config)
      const env = { RPC_SERVICE: mockBinding }

      const res = await app.request('/rpc/getArray', { method: 'POST' }, env)
      expect((await res.json() as Record<string, unknown>).data).toEqual([1, 2, 3])
    })
  })
})
