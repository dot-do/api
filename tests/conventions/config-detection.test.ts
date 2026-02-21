/**
 * Config Detection Convention Tests
 *
 * Tests for:
 * 1. detectInputType() - classifying inputs passed to API()
 * 2. wrapPackage() - generating routes from module exports
 * 3. wrapClient() - generating routes from SDK client instances
 */

import { describe, it, expect } from 'vitest'
import {
  detectInputType,
  wrapPackage,
  wrapClient,
  type DetectedInput,
  type PackageWrapConfig,
  type ClientWrapConfig,
  type GeneratedRoute,
} from '../../src/conventions/config-detection'

// =============================================================================
// 1. detectInputType()
// =============================================================================

describe('detectInputType', () => {
  describe('primitives and nullish', () => {
    it('classifies null as unknown', () => {
      const result = detectInputType(null)
      expect(result.kind).toBe('unknown')
      expect(result.reason).toContain('null')
    })

    it('classifies undefined as unknown', () => {
      const result = detectInputType(undefined)
      expect(result.kind).toBe('unknown')
      expect(result.reason).toContain('undefined')
    })

    it('classifies a number as unknown', () => {
      const result = detectInputType(42)
      expect(result.kind).toBe('unknown')
      expect(result.reason).toContain('number')
    })

    it('classifies a boolean as unknown', () => {
      const result = detectInputType(true)
      expect(result.kind).toBe('unknown')
      expect(result.reason).toContain('boolean')
    })
  })

  describe('function detection', () => {
    it('classifies a plain function', () => {
      const fn = () => 'hello'
      const result = detectInputType(fn)
      expect(result.kind).toBe('function')
      expect(result.value).toBe(fn)
    })

    it('classifies an async function', () => {
      const fn = async () => 'hello'
      const result = detectInputType(fn)
      expect(result.kind).toBe('function')
    })

    it('classifies a named function', () => {
      function myHandler() { return 'ok' }
      const result = detectInputType(myHandler)
      expect(result.kind).toBe('function')
    })
  })

  describe('string detection', () => {
    it('classifies a string as string', () => {
      const result = detectInputType('my-api')
      expect(result.kind).toBe('string')
      expect(result.value).toBe('my-api')
    })

    it('classifies a URL string as string', () => {
      const result = detectInputType('https://api.example.com')
      expect(result.kind).toBe('string')
    })

    it('classifies an empty string as string', () => {
      const result = detectInputType('')
      expect(result.kind).toBe('string')
    })
  })

  describe('array detection', () => {
    it('classifies an array as array', () => {
      const result = detectInputType([1, 2, 3])
      expect(result.kind).toBe('array')
    })

    it('classifies an empty array as array', () => {
      const result = detectInputType([])
      expect(result.kind).toBe('array')
    })

    it('classifies an array of objects as array', () => {
      const result = detectInputType([{ id: 1 }, { id: 2 }])
      expect(result.kind).toBe('array')
    })
  })

  describe('config detection', () => {
    it('classifies an object with known config keys as config', () => {
      const result = detectInputType({
        name: 'my-api',
        description: 'Test API',
        version: '1.0.0',
      })
      expect(result.kind).toBe('config')
      expect(result.reason).toContain('config keys')
    })

    it('classifies a full ApiConfig-like object as config', () => {
      const result = detectInputType({
        name: 'my-api',
        auth: { mode: 'required' },
        database: { driver: 'do', binding: 'DB', schema: {} },
      })
      expect(result.kind).toBe('config')
    })

    it('classifies when majority of keys are config keys', () => {
      const result = detectInputType({
        name: 'my-api',
        version: '1.0',
        customField: 'value',
      })
      expect(result.kind).toBe('config')
    })
  })

  describe('binding detection', () => {
    it('classifies an object with fetch+get as binding', () => {
      const binding = {
        fetch: async () => new Response(),
        get: () => ({}),
        connect: () => ({}),
      }
      const result = detectInputType(binding)
      expect(result.kind).toBe('binding')
      expect(result.reason).toContain('binding')
    })

    it('classifies a DO namespace shape as binding', () => {
      const doNamespace = {
        idFromName: () => 'id',
        idFromString: () => 'id',
        get: () => ({}),
      }
      const result = detectInputType(doNamespace)
      expect(result.kind).toBe('binding')
    })
  })

  describe('module detection', () => {
    it('classifies an object of functions as module', () => {
      const mod = {
        camelCase: (s: string) => s,
        kebabCase: (s: string) => s,
        snakeCase: (s: string) => s,
      }
      const result = detectInputType(mod)
      expect(result.kind).toBe('module')
      expect(result.functions).toBeDefined()
      expect(Object.keys(result.functions!)).toContain('camelCase')
      expect(Object.keys(result.functions!)).toContain('kebabCase')
      expect(Object.keys(result.functions!)).toContain('snakeCase')
    })

    it('classifies a module with mixed values but majority functions', () => {
      const mod = {
        transform: () => {},
        parse: () => {},
        VERSION: '1.0.0',
      }
      const result = detectInputType(mod)
      expect(result.kind).toBe('module')
      expect(Object.keys(result.functions!)).toHaveLength(2)
    })

    it('extracts only function values from module', () => {
      const mod = {
        hello: () => 'world',
        config: { key: 'value' },
        count: 42,
      }
      const result = detectInputType(mod)
      // Has 1 function out of 3 keys, but no config keys, so it is module
      expect(result.kind).toBe('module')
      expect(result.functions).toBeDefined()
      expect(Object.keys(result.functions!)).toEqual(['hello'])
    })
  })

  describe('class instance detection', () => {
    it('classifies a class instance with methods', () => {
      class ApiClient {
        list() { return [] }
        create() { return {} }
      }
      const client = new ApiClient()
      const result = detectInputType(client)
      expect(result.kind).toBe('class-instance')
      expect(result.functions).toBeDefined()
      expect(Object.keys(result.functions!)).toContain('list')
      expect(Object.keys(result.functions!)).toContain('create')
    })

    it('detects nested resources on class instances', () => {
      class StripeClient {
        customers = {
          list: () => [],
          create: () => ({}),
          retrieve: () => ({}),
        }
        charges = {
          list: () => [],
          create: () => ({}),
        }
        getVersion() { return '1.0' }
      }
      const client = new StripeClient()
      const result = detectInputType(client)
      expect(result.kind).toBe('class-instance')
      expect(result.namespaces).toBeDefined()
      expect(result.namespaces!.customers).toBeDefined()
      expect(Object.keys(result.namespaces!.customers)).toContain('list')
      expect(Object.keys(result.namespaces!.customers)).toContain('create')
      expect(result.namespaces!.charges).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('classifies an empty object as unknown', () => {
      const result = detectInputType({})
      expect(result.kind).toBe('unknown')
    })

    it('preserves the original value', () => {
      const original = { name: 'test' }
      const result = detectInputType(original)
      expect(result.value).toBe(original)
    })

    it('always provides a reason', () => {
      const inputs = [null, undefined, 42, 'str', () => {}, [], {}, { name: 'x' }]
      for (const input of inputs) {
        const result = detectInputType(input)
        expect(result.reason).toBeTruthy()
        expect(typeof result.reason).toBe('string')
      }
    })
  })
})

// =============================================================================
// 2. wrapPackage()
// =============================================================================

describe('wrapPackage', () => {
  it('generates routes for all functions in a module', () => {
    const mod = {
      camelCase: (s: string) => s.replace(/-./g, (m) => m[1].toUpperCase()),
      kebabCase: (s: string) => s.replace(/([A-Z])/g, '-$1').toLowerCase(),
      trim: (s: string) => s.trim(),
    }

    const routes = wrapPackage({ module: mod, namespace: 'lodash' })

    // Each function gets both GET and POST routes
    expect(routes.length).toBe(6)

    const camelRoutes = routes.filter((r) => r.name === 'lodash.camelCase')
    expect(camelRoutes).toHaveLength(2)
    expect(camelRoutes.map((r) => r.method).sort()).toEqual(['GET', 'POST'])
    expect(camelRoutes[0].path).toBe('/lodash/camelCase')
  })

  it('uses dot notation for route names', () => {
    const mod = {
      upper: () => {},
      lower: () => {},
    }

    const routes = wrapPackage({ module: mod, namespace: 'text' })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).toContain('text.upper')
    expect(names).toContain('text.lower')
  })

  it('traverses nested objects', () => {
    const mod = {
      string: {
        trim: (s: string) => s.trim(),
        pad: (s: string) => s,
      },
      array: {
        flatten: (a: unknown[]) => a.flat(),
      },
    }

    const routes = wrapPackage({ module: mod, namespace: 'utils' })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).toContain('utils.string.trim')
    expect(names).toContain('utils.string.pad')
    expect(names).toContain('utils.array.flatten')
  })

  it('respects include filter', () => {
    const mod = {
      allowed: () => {},
      blocked: () => {},
    }

    const routes = wrapPackage({ module: mod, namespace: 'pkg', include: ['allowed'] })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).toContain('pkg.allowed')
    expect(names).not.toContain('pkg.blocked')
  })

  it('respects exclude filter', () => {
    const mod = {
      keep: () => {},
      remove: () => {},
    }

    const routes = wrapPackage({ module: mod, namespace: 'pkg', exclude: ['remove'] })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).toContain('pkg.keep')
    expect(names).not.toContain('pkg.remove')
  })

  it('respects maxDepth', () => {
    const mod = {
      level1: {
        level2: {
          level3: {
            deep: () => {},
          },
        },
      },
    }

    const routes = wrapPackage({ module: mod, namespace: 'deep', maxDepth: 2 })
    const names = [...new Set(routes.map((r) => r.name))]
    // maxDepth=2 means we can go 2 levels deep, so level3 (depth 2) is reached but level3.deep (depth 3) is not
    expect(names).not.toContain('deep.level1.level2.level3.deep')
  })

  it('skips private properties (starting with _)', () => {
    const mod = {
      publicFn: () => {},
      _privateFn: () => {},
    }

    const routes = wrapPackage({ module: mod, namespace: 'pkg' })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).toContain('pkg.publicFn')
    expect(names).not.toContain('pkg._privateFn')
  })

  it('maps read methods to GET', () => {
    const mod = {
      list: () => [],
      get: () => ({}),
      search: () => [],
      create: () => ({}),
    }

    const routes = wrapPackage({ module: mod, namespace: 'api' })
    const listRoute = routes.find((r) => r.name === 'api.list' && r.method === 'GET')
    const getRoute = routes.find((r) => r.name === 'api.get' && r.method === 'GET')
    const searchRoute = routes.find((r) => r.name === 'api.search' && r.method === 'GET')
    const createRoute = routes.find((r) => r.name === 'api.create' && r.method === 'POST')

    expect(listRoute).toBeDefined()
    expect(getRoute).toBeDefined()
    expect(searchRoute).toBeDefined()
    expect(createRoute).toBeDefined()
  })

  it('uses custom basePath', () => {
    const mod = { fn: () => {} }
    const routes = wrapPackage({ module: mod, namespace: 'pkg', basePath: '/custom/path' })
    expect(routes[0].path).toBe('/custom/path/fn')
  })

  it('skips non-function values', () => {
    const mod = {
      fn: () => {},
      config: 'value',
      count: 42,
      flag: true,
    }

    const routes = wrapPackage({ module: mod, namespace: 'pkg' })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).toEqual(['pkg.fn'])
  })

  it('returns empty array for empty module', () => {
    const routes = wrapPackage({ module: {}, namespace: 'empty' })
    expect(routes).toHaveLength(0)
  })

  it('provides description for each route', () => {
    const mod = { transform: () => {} }
    const routes = wrapPackage({ module: mod, namespace: 'pkg' })
    for (const route of routes) {
      expect(route.description).toBeTruthy()
      expect(route.description).toContain('pkg.transform')
    }
  })
})

// =============================================================================
// 3. wrapClient()
// =============================================================================

describe('wrapClient', () => {
  it('generates routes from class instance methods', () => {
    class Service {
      list() { return [] }
      create(data: unknown) { return data }
      delete(id: string) { return id }
    }

    const routes = wrapClient({ client: new Service(), namespace: 'svc' })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).toContain('svc.list')
    expect(names).toContain('svc.create')
    expect(names).toContain('svc.delete')
  })

  it('generates routes from nested resources', () => {
    class StripeClient {
      customers = {
        list: () => [],
        create: () => ({}),
        retrieve: () => ({}),
      }
      charges = {
        list: () => [],
        create: () => ({}),
      }
    }

    const routes = wrapClient({ client: new StripeClient(), namespace: 'stripe' })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).toContain('stripe.customers.list')
    expect(names).toContain('stripe.customers.create')
    expect(names).toContain('stripe.customers.retrieve')
    expect(names).toContain('stripe.charges.list')
    expect(names).toContain('stripe.charges.create')
  })

  it('maps read methods to GET by default', () => {
    class Client {
      list() { return [] }
      retrieve() { return {} }
      search() { return [] }
      create() { return {} }
      update() { return {} }
      delete() { return {} }
    }

    const routes = wrapClient({ client: new Client(), namespace: 'api' })

    // list, retrieve, search should have GET as primary method
    const listGet = routes.find((r) => r.name === 'api.list' && r.method === 'GET')
    const retrieveGet = routes.find((r) => r.name === 'api.retrieve' && r.method === 'GET')
    const searchGet = routes.find((r) => r.name === 'api.search' && r.method === 'GET')
    expect(listGet).toBeDefined()
    expect(retrieveGet).toBeDefined()
    expect(searchGet).toBeDefined()

    // create, update, delete should have POST as primary method
    const createPost = routes.find((r) => r.name === 'api.create' && r.method === 'POST')
    const updatePost = routes.find((r) => r.name === 'api.update' && r.method === 'POST')
    const deletePost = routes.find((r) => r.name === 'api.delete' && r.method === 'POST')
    expect(createPost).toBeDefined()
    expect(updatePost).toBeDefined()
    expect(deletePost).toBeDefined()
  })

  it('supports custom readMethods', () => {
    class Client {
      fetch() { return {} }
      save() { return {} }
    }

    const routes = wrapClient({
      client: new Client(),
      namespace: 'api',
      readMethods: ['fetch'],
    })

    const fetchGet = routes.find((r) => r.name === 'api.fetch' && r.method === 'GET')
    const savePost = routes.find((r) => r.name === 'api.save' && r.method === 'POST')
    expect(fetchGet).toBeDefined()
    expect(savePost).toBeDefined()
  })

  it('respects include filter', () => {
    class Client {
      allowed = {
        list: () => [],
      }
      blocked = {
        list: () => [],
      }
    }

    const routes = wrapClient({ client: new Client(), namespace: 'api', include: ['allowed'] })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names.some((n) => n.startsWith('api.allowed'))).toBe(true)
    expect(names.some((n) => n.startsWith('api.blocked'))).toBe(false)
  })

  it('respects exclude filter', () => {
    class Client {
      keep = {
        list: () => [],
      }
      remove = {
        list: () => [],
      }
    }

    const routes = wrapClient({ client: new Client(), namespace: 'api', exclude: ['remove'] })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names.some((n) => n.startsWith('api.keep'))).toBe(true)
    expect(names.some((n) => n.startsWith('api.remove'))).toBe(false)
  })

  it('respects maxDepth', () => {
    const client = {
      level1: {
        level2: {
          level3: {
            deepMethod: () => {},
          },
        },
      },
    }

    const routes = wrapClient({ client, namespace: 'api', maxDepth: 2 })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).not.toContain('api.level1.level2.level3.deepMethod')
  })

  it('binds methods to the original object', () => {
    class Counter {
      value = 0
      increment() { this.value++; return this.value }
    }

    const counter = new Counter()
    const routes = wrapClient({ client: counter, namespace: 'counter' })
    const incrementRoute = routes.find((r) => r.name === 'counter.increment')
    expect(incrementRoute).toBeDefined()

    // Call the handler - it should be bound to the counter instance
    const result = incrementRoute!.handler()
    expect(result).toBe(1)
    expect(counter.value).toBe(1)
  })

  it('skips private properties', () => {
    class Client {
      _internal() { return 'secret' }
      public() { return 'visible' }
    }

    const routes = wrapClient({ client: new Client(), namespace: 'api' })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).not.toContain('api._internal')
    expect(names).toContain('api.public')
  })

  it('uses custom basePath', () => {
    class Client {
      list() { return [] }
    }

    const routes = wrapClient({ client: new Client(), namespace: 'api', basePath: '/v2/api' })
    const listRoute = routes.find((r) => r.name === 'api.list')
    expect(listRoute!.path).toBe('/v2/api/list')
  })

  it('handles client with no methods gracefully', () => {
    const client = { config: 'value', count: 42 }
    const routes = wrapClient({ client, namespace: 'api' })
    expect(routes).toHaveLength(0)
  })

  it('avoids circular references', () => {
    const client: Record<string, unknown> = {
      method: () => 'ok',
    }
    client.self = client  // Circular reference

    // Should not throw or loop forever
    const routes = wrapClient({ client, namespace: 'api' })
    expect(routes.length).toBeGreaterThan(0)
  })

  it('generates correct paths for deeply nested resources', () => {
    class PaymentClient {
      payment = {
        intents: {
          create: () => ({}),
          confirm: () => ({}),
        },
      }
    }

    const routes = wrapClient({ client: new PaymentClient(), namespace: 'stripe', maxDepth: 4 })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).toContain('stripe.payment.intents.create')
    expect(names).toContain('stripe.payment.intents.confirm')

    const createRoute = routes.find((r) => r.name === 'stripe.payment.intents.create')
    expect(createRoute!.path).toBe('/stripe/payment/intents/create')
  })
})

// =============================================================================
// Integration: detectInputType + wrapPackage/wrapClient
// =============================================================================

describe('integration: detect and wrap', () => {
  it('detects a module and wraps it into routes', () => {
    const mod = {
      upper: (s: string) => s.toUpperCase(),
      lower: (s: string) => s.toLowerCase(),
      reverse: (s: string) => s.split('').reverse().join(''),
    }

    const detected = detectInputType(mod)
    expect(detected.kind).toBe('module')

    const routes = wrapPackage({ module: mod, namespace: 'text' })
    expect(routes.length).toBe(6) // 3 functions x 2 methods each
  })

  it('detects a class instance and wraps it into routes', () => {
    class CrmClient {
      contacts = {
        list: () => [],
        create: () => ({}),
        get: () => ({}),
      }
      deals = {
        list: () => [],
        create: () => ({}),
      }
    }

    const client = new CrmClient()
    const detected = detectInputType(client)
    expect(detected.kind).toBe('class-instance')

    const routes = wrapClient({ client, namespace: 'crm' })
    const names = [...new Set(routes.map((r) => r.name))]
    expect(names).toContain('crm.contacts.list')
    expect(names).toContain('crm.contacts.create')
    expect(names).toContain('crm.contacts.get')
    expect(names).toContain('crm.deals.list')
    expect(names).toContain('crm.deals.create')
  })
})
