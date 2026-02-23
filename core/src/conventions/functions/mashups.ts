/**
 * Data Mashups Sub-module
 *
 * Combines data from multiple sources into a unified response.
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiEnv } from '../../types'
import type {
  FunctionsConfig,
  MashupDef,
} from './types'
import {
  type McpTool,
  buildCacheKey,
  getCacheValue,
  setCacheValue,
  deepMerge,
} from './utils'

// =============================================================================
// Request Handler
// =============================================================================

export function createMashupHandler(mashup: MashupDef, config: FunctionsConfig) {
  return async (c: Context<ApiEnv>) => {
    const input = c.req.method === 'GET'
      ? Object.fromEntries(new URL(c.req.url).searchParams)
      : await c.req.json().catch(() => ({}))

    // Check cache
    if (mashup.cache) {
      const cacheKey = buildCacheKey(`mashup:${mashup.name}`, input, mashup.cache.key)
      const cached = await getCacheValue(c, config, cacheKey)
      if (cached !== null) {
        return c.var.respond({ data: cached, meta: { cached: true } })
      }
    }

    // Fetch all sources
    const results: Record<string, unknown> = {}
    const errors: Record<string, string> = {}

    const fetchSource = async (name: string, source: typeof mashup.sources[string]) => {
      try {
        // Interpolate URL with input values
        let url = source.url
        for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
          url = url.replace(`{${key}}`, String(value))
        }
        if (source.params) {
          for (const [param, inputKey] of Object.entries(source.params)) {
            url = url.replace(`{${param}}`, String((input as Record<string, unknown>)[inputKey]))
          }
        }

        const response = await fetch(url, {
          method: source.method || 'GET',
          headers: source.headers,
          body: source.body ? JSON.stringify(source.body) : undefined,
          signal: source.timeout ? AbortSignal.timeout(source.timeout) : undefined,
        })

        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`)
        }

        let data = await response.json()

        if (source.transform) {
          data = source.transform(data)
        }

        results[name] = data
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        errors[name] = err.message
        if (source.required !== false) {
          throw new Error(`Required source ${name} failed: ${err.message}`)
        }
      }
    }

    try {
      if (mashup.parallel !== false) {
        await Promise.all(
          Object.entries(mashup.sources).map(([name, source]) => fetchSource(name, source))
        )
      } else {
        for (const [name, source] of Object.entries(mashup.sources)) {
          await fetchSource(name, source)
        }
      }

      // Merge results
      let merged: unknown
      if (typeof mashup.merge === 'function') {
        merged = mashup.merge(results, input)
      } else if (mashup.merge === 'deep') {
        merged = deepMerge({}, ...Object.values(results))
      } else {
        merged = Object.assign({}, ...Object.values(results))
      }

      // Cache result
      if (mashup.cache) {
        const cacheKey = buildCacheKey(`mashup:${mashup.name}`, input, mashup.cache.key)
        setCacheValue(c, config, cacheKey, merged, mashup.cache.ttl).catch(() => {})
      }

      return c.var.respond({ data: merged, meta: { sources: Object.keys(results), errors } })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return c.var.respond({
        error: { message: err.message, code: 'MASHUP_ERROR', details: errors },
        status: 500,
      })
    }
  }
}

// =============================================================================
// Route Registration
// =============================================================================

export function registerMashupRoutes(
  app: Hono<ApiEnv>,
  config: FunctionsConfig,
  mcpTools: McpTool[]
): void {
  const basePath = config.basePath || ''

  if (config.mashups) {
    for (const mashup of config.mashups) {
      const path = `${basePath}/${mashup.name.replace(/\./g, '/')}`

      app.post(path, createMashupHandler(mashup, config))
      app.get(path, createMashupHandler(mashup, config))

      mcpTools.push({
        name: mashup.name,
        description: mashup.description,
        inputSchema: mashup.input,
      })
    }
  }
}
