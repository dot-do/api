import { describe, it, expect } from 'vitest'
import { resolveConfig, separateFunctionsFromConfig, discoverEnv, inferApiName, KNOWN_CONFIG_KEYS } from '../src/config'
import type { ApiConfig } from '../src/types'

describe('resolveConfig', () => {
  it('returns minimal defaults with no args', () => {
    const result = resolveConfig()
    expect(result.config.name).toBe('api')
    expect(result.functions).toBeUndefined()
  })

  it('returns minimal defaults with undefined', () => {
    const result = resolveConfig(undefined)
    expect(result.config.name).toBe('api')
    expect(result.functions).toBeUndefined()
  })

  it('passes through standard ApiConfig with name', () => {
    const input: ApiConfig = { name: 'crm.do', description: 'AI-native CRM', version: '1.0.0' }
    const result = resolveConfig(input)
    expect(result.config.name).toBe('crm.do')
    expect(result.config.description).toBe('AI-native CRM')
    expect(result.config.version).toBe('1.0.0')
    expect(result.functions).toBeUndefined()
  })

  it('preserves all known config keys from ApiConfig', () => {
    const input: ApiConfig = {
      name: 'test-api',
      description: 'Test',
      version: '2.0.0',
      basePath: '/v2',
    }
    const result = resolveConfig(input)
    expect(result.config.name).toBe('test-api')
    expect(result.config.basePath).toBe('/v2')
  })

  it('extracts functions from mixed config+functions input', () => {
    const scoreFn = (contact: unknown) => ({ value: 87, grade: 'A' })
    const enrichFn = async (data: unknown) => ({ enriched: true })
    const result = resolveConfig({
      name: 'crm.do',
      description: 'AI-native CRM',
      score: scoreFn,
      enrich: enrichFn,
    })
    expect(result.config.name).toBe('crm.do')
    expect(result.config.description).toBe('AI-native CRM')
    expect(result.functions).toBeDefined()
    expect(result.functions!.score).toBe(scoreFn)
    expect(result.functions!.enrich).toBe(enrichFn)
  })

  it('handles functions-only input with default name', () => {
    const scoreFn = (contact: unknown) => ({ value: 87 })
    const sendFn = async (deal: unknown) => ({ sent: true })
    const result = resolveConfig({
      score: scoreFn,
      sendContract: sendFn,
    })
    expect(result.config.name).toBe('api')
    expect(result.functions).toBeDefined()
    expect(result.functions!.score).toBe(scoreFn)
    expect(result.functions!.sendContract).toBe(sendFn)
  })

  it('handles string config values correctly', () => {
    const result = resolveConfig({
      name: 'my-api',
      description: 'My API',
      version: '1.0.0',
    })
    expect(result.config.name).toBe('my-api')
    expect(result.config.description).toBe('My API')
    expect(result.config.version).toBe('1.0.0')
    expect(result.functions).toBeUndefined()
  })

  it('does not treat known config keys that are objects as functions', () => {
    const routesFn = () => {}
    const result = resolveConfig({
      name: 'test',
      routes: routesFn,
      auth: { mode: 'required' as const },
    })
    expect(result.config.name).toBe('test')
    expect(result.config.routes).toBe(routesFn)
    expect(result.config.auth).toEqual({ mode: 'required' })
    expect(result.functions).toBeUndefined()
  })
})

describe('separateFunctionsFromConfig', () => {
  it('separates function values from config keys', () => {
    const scoreFn = () => 42
    const enrichFn = async () => ({})
    const { config, functions } = separateFunctionsFromConfig({
      name: 'test',
      description: 'Test API',
      score: scoreFn,
      enrich: enrichFn,
    })
    expect(config.name).toBe('test')
    expect(config.description).toBe('Test API')
    expect(functions.score).toBe(scoreFn)
    expect(functions.enrich).toBe(enrichFn)
  })

  it('known config keys are always config, even if function-valued', () => {
    const landingFn = () => new Response('hi')
    const routesFn = () => {}
    const beforeFn = () => {}
    const afterFn = () => {}
    const { config, functions } = separateFunctionsFromConfig({
      landing: landingFn,
      routes: routesFn,
      before: beforeFn,
      after: afterFn,
    })
    expect(config.landing).toBe(landingFn)
    expect(config.routes).toBe(routesFn)
    expect(config.before).toBe(beforeFn)
    expect(config.after).toBe(afterFn)
    expect(Object.keys(functions)).toHaveLength(0)
  })

  it('string values for known config keys go to config', () => {
    const { config, functions } = separateFunctionsFromConfig({
      name: 'my-api',
      description: 'My Description',
      version: '2.0',
      basePath: '/v2',
    })
    expect(config.name).toBe('my-api')
    expect(config.description).toBe('My Description')
    expect(config.version).toBe('2.0')
    expect(config.basePath).toBe('/v2')
    expect(Object.keys(functions)).toHaveLength(0)
  })

  it('returns empty functions when no functions present', () => {
    const { config, functions } = separateFunctionsFromConfig({
      name: 'test',
    })
    expect(config.name).toBe('test')
    expect(Object.keys(functions)).toHaveLength(0)
  })

  it('handles mixed object config and function values', () => {
    const scoreFn = () => 42
    const { config, functions } = separateFunctionsFromConfig({
      name: 'test',
      auth: { mode: 'required' },
      rateLimit: { binding: 'RATE_LIMITER', limit: 100 },
      score: scoreFn,
    })
    expect(config.name).toBe('test')
    expect(config.auth).toEqual({ mode: 'required' })
    expect(config.rateLimit).toEqual({ binding: 'RATE_LIMITER', limit: 100 })
    expect(functions.score).toBe(scoreFn)
  })
})

describe('discoverEnv', () => {
  it('returns empty config for empty env', () => {
    const result = discoverEnv({})
    expect(result).toEqual({})
  })

  it('discovers DB binding', () => {
    const mockDb = { prepare: () => {} }
    const result = discoverEnv({ DB: mockDb })
    expect(result.database).toBeDefined()
  })

  it('discovers DATABASE binding', () => {
    const mockDb = { prepare: () => {} }
    const result = discoverEnv({ DATABASE: mockDb })
    expect(result.database).toBeDefined()
  })

  it('discovers AUTH binding', () => {
    const mockAuth = { verify: () => {} }
    const result = discoverEnv({ AUTH: mockAuth })
    expect(result.auth).toBeDefined()
    expect(result.auth!.mode).toBe('optional')
  })

  it('discovers IDENTITY binding', () => {
    const mockIdentity = { verify: () => {} }
    const result = discoverEnv({ IDENTITY: mockIdentity })
    expect(result.auth).toBeDefined()
  })

  it('discovers RATE_LIMITER binding', () => {
    const mockLimiter = { limit: () => {} }
    const result = discoverEnv({ RATE_LIMITER: mockLimiter })
    expect(result.rateLimit).toBeDefined()
    expect(result.rateLimit!.binding).toBe('RATE_LIMITER')
  })

  it('discovers EVENTS binding (placeholder)', () => {
    const mockEvents = { send: () => {} }
    const result = discoverEnv({ EVENTS: mockEvents })
    // Events is a future placeholder — currently no-op
    expect(result).toBeDefined()
  })

  it('discovers PIPELINE binding (placeholder)', () => {
    const mockPipeline = { send: () => {} }
    const result = discoverEnv({ PIPELINE: mockPipeline })
    expect(result).toBeDefined()
  })

  it('discovers multiple bindings at once', () => {
    const result = discoverEnv({
      DB: { prepare: () => {} },
      AUTH: { verify: () => {} },
      RATE_LIMITER: { limit: () => {} },
    })
    expect(result.database).toBeDefined()
    expect(result.auth).toBeDefined()
    expect(result.rateLimit).toBeDefined()
  })
})

describe('inferApiName', () => {
  it('returns "api" for empty env', () => {
    expect(inferApiName({})).toBe('api')
  })

  it('infers name from WORKER_NAME', () => {
    expect(inferApiName({ WORKER_NAME: 'crm-do' })).toBe('crm-do')
  })

  it('infers name from CF_WORKER', () => {
    expect(inferApiName({ CF_WORKER: 'billing-api' })).toBe('billing-api')
  })

  it('infers name from NAME', () => {
    expect(inferApiName({ NAME: 'analytics.do' })).toBe('analytics.do')
  })

  it('prefers WORKER_NAME over others', () => {
    expect(inferApiName({
      WORKER_NAME: 'primary',
      CF_WORKER: 'secondary',
      NAME: 'tertiary',
    })).toBe('primary')
  })

  it('returns "api" when env has no name hints', () => {
    expect(inferApiName({ DB: {}, AUTH: {} })).toBe('api')
  })
})

describe('KNOWN_CONFIG_KEYS', () => {
  it('includes all documented known config keys', () => {
    const expected = [
      'name', 'description', 'version', 'basePath', 'auth', 'rateLimit',
      'crud', 'proxy', 'rpc', 'mcp', 'analytics', 'analyticsBuffer',
      'testing', 'database', 'functions', 'landing', 'routes', 'plans',
      'features', 'before', 'after', 'webhooks', 'source', 'proxies',
    ]
    for (const key of expected) {
      expect(KNOWN_CONFIG_KEYS.has(key)).toBe(true)
    }
  })
})
