/**
 * Shared utilities for the functions convention sub-modules.
 */

import type { Context } from 'hono'
import type { ApiEnv } from '../../types'
import type {
  FunctionsConfig,
  FunctionContext,
  CacheHelper,
  JsonSchema,
} from './types'

// =============================================================================
// Types
// =============================================================================

export interface McpTool {
  name: string
  description: string
  inputSchema: JsonSchema
}

export type CallableFn = (input: unknown, ctx: FunctionContext) => Promise<unknown>

// =============================================================================
// Cache Helpers
// =============================================================================

export function createCacheHelper(c: Context<ApiEnv>, config: FunctionsConfig): CacheHelper {
  const kvBinding = config.cache ? (c.env as Record<string, KVNamespace>)[config.cache] : null

  return {
    async get<T>(key: string): Promise<T | null> {
      if (!kvBinding) return null
      return kvBinding.get(key, 'json')
    },
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      if (!kvBinding) return
      await kvBinding.put(key, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined)
    },
    async getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
      const cached = await this.get<T>(key)
      if (cached !== null) return cached
      const value = await fn()
      await this.set(key, value, ttl)
      return value
    },
  }
}

export function buildCacheKey(prefix: string, input: unknown, template?: string): string {
  if (template) {
    let key = template
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      key = key.replace(`{${k}}`, String(v))
    }
    return `${prefix}:${key}`
  }
  return `${prefix}:${JSON.stringify(input)}`
}

export async function getCacheValue(c: Context<ApiEnv>, config: FunctionsConfig, key: string): Promise<unknown | null> {
  const kvBinding = config.cache ? (c.env as Record<string, KVNamespace>)[config.cache] : null
  if (!kvBinding) return null
  return kvBinding.get(key, 'json')
}

export async function setCacheValue(c: Context<ApiEnv>, config: FunctionsConfig, key: string, value: unknown, ttl?: number): Promise<void> {
  const kvBinding = config.cache ? (c.env as Record<string, KVNamespace>)[config.cache] : null
  if (!kvBinding) return
  await kvBinding.put(key, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined)
}

// =============================================================================
// Function Context Helper
// =============================================================================

export function createFunctionContext(
  c: Context<ApiEnv>,
  config: FunctionsConfig,
  registry: Map<string, CallableFn>
): FunctionContext {
  const cache = createCacheHelper(c, config)

  return {
    c: c as Context,
    requestId: c.var.requestId,
    user: c.var.user ? { id: c.var.user.id || '', ...c.var.user } : undefined,
    env: c.env as Record<string, unknown>,
    fetch,
    cache,
    call: async <T>(name: string, input: unknown): Promise<T> => {
      const fn = registry.get(name)
      if (!fn) throw new Error(`Function not found: ${name}`)
      return fn(input, createFunctionContext(c, config, registry)) as Promise<T>
    },
  }
}

// =============================================================================
// Deep Merge Utility
// =============================================================================

/** Keys that could be used for prototype pollution attacks */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype']

export function deepMerge(target: Record<string, unknown>, ...sources: unknown[]): Record<string, unknown> {
  for (const source of sources) {
    if (source && typeof source === 'object') {
      for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
        // Skip dangerous keys to prevent prototype pollution
        if (DANGEROUS_KEYS.includes(key)) continue
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          target[key] = deepMerge((target[key] || {}) as Record<string, unknown>, value)
        } else {
          target[key] = value
        }
      }
    }
  }
  return target
}
