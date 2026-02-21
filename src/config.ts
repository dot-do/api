import type { ApiConfig, AuthConfig, RateLimitConfig } from './types'
import type { DatabaseConfig } from './conventions/database/types'

// =============================================================================
// Known Config Keys
// =============================================================================

/**
 * Keys that are ALWAYS treated as config, never as user-defined functions.
 * Even if the value is a function (e.g. `routes`, `landing`, `before`, `after`),
 * these are config properties of ApiConfig.
 */
export const KNOWN_CONFIG_KEYS = new Set([
  'name',
  'description',
  'version',
  'basePath',
  'auth',
  'rateLimit',
  'crud',
  'proxy',
  'rpc',
  'mcp',
  'analytics',
  'analyticsBuffer',
  'testing',
  'database',
  'functions',
  'landing',
  'routes',
  'plans',
  'features',
  'before',
  'after',
  'webhooks',
  'source',
  'proxies',
])

// =============================================================================
// Types
// =============================================================================

/** Flexible input: full ApiConfig, mixed config+functions, or nothing */
export type ApiInput = ApiConfig | Record<string, unknown> | undefined

/** Result of resolving input into config + extracted functions */
export interface ResolvedConfig {
  config: ApiConfig
  functions?: Record<string, Function>
}

// =============================================================================
// Main Resolver
// =============================================================================

/**
 * Resolve flexible API input into a normalized ApiConfig + optional extracted functions.
 *
 * - No input → minimal defaults (`{ name: 'api' }`)
 * - Standard ApiConfig → pass through
 * - Mixed object → separate known config keys from function values
 */
export function resolveConfig(input?: ApiInput): ResolvedConfig {
  // No input — minimal defaults
  if (input === undefined || input === null) {
    return { config: { name: 'api' } }
  }

  // Separate config from functions
  const { config, functions } = separateFunctionsFromConfig(input as Record<string, unknown>)

  // Ensure name defaults
  const resolvedConfig: ApiConfig = {
    name: 'api',
    ...config,
  }

  const hasFunctions = Object.keys(functions).length > 0
  return {
    config: resolvedConfig,
    functions: hasFunctions ? functions : undefined,
  }
}

// =============================================================================
// Separator
// =============================================================================

/**
 * Separate an input object into config properties and user-defined functions.
 *
 * Rules:
 * - Key in KNOWN_CONFIG_KEYS → always config (regardless of value type)
 * - Value is a function AND key is NOT a known config key → user function
 * - Everything else → config
 */
export function separateFunctionsFromConfig(input: Record<string, unknown>): {
  config: Partial<ApiConfig>
  functions: Record<string, Function>
} {
  const config: Record<string, unknown> = {}
  const functions: Record<string, Function> = {}

  for (const [key, value] of Object.entries(input)) {
    if (KNOWN_CONFIG_KEYS.has(key)) {
      // Known config key — always goes to config
      config[key] = value
    } else if (typeof value === 'function') {
      // Unknown key with function value — user-defined function
      functions[key] = value as Function
    } else {
      // Unknown key with non-function value — treat as config
      config[key] = value
    }
  }

  return { config: config as Partial<ApiConfig>, functions }
}

// =============================================================================
// Env Auto-Discovery
// =============================================================================

/**
 * Discover API configuration from Cloudflare Workers env bindings.
 *
 * | Binding found    | What happens                        |
 * |-----------------|-------------------------------------|
 * | DB / DATABASE   | Database convention enabled          |
 * | AUTH / IDENTITY | Auth middleware enabled (optional)   |
 * | EVENTS / PIPELINE | CDC events (future placeholder)   |
 * | RATE_LIMITER    | Rate limiting enabled                |
 */
export function discoverEnv(env: Record<string, unknown>): Partial<ApiConfig> {
  const discovered: Partial<ApiConfig> = {}

  // Database binding
  if (env.DB || env.DATABASE) {
    const bindingName = env.DB ? 'DB' : 'DATABASE'
    discovered.database = {
      driver: 'do',
      binding: bindingName,
      schema: {},
    } as DatabaseConfig
  }

  // Auth binding
  if (env.AUTH || env.IDENTITY) {
    discovered.auth = {
      mode: 'optional',
    } as AuthConfig
  }

  // Rate limiter binding
  if (env.RATE_LIMITER) {
    discovered.rateLimit = {
      binding: 'RATE_LIMITER',
    } as RateLimitConfig
  }

  // EVENTS / PIPELINE — future placeholder, no-op for now
  // When implemented, this will enable CDC event forwarding

  return discovered
}

// =============================================================================
// Name Inference
// =============================================================================

/**
 * Infer API name from environment variables / worker metadata.
 *
 * Priority:
 * 1. WORKER_NAME
 * 2. CF_WORKER
 * 3. NAME
 * 4. Falls back to 'api'
 */
export function inferApiName(env: Record<string, unknown>): string {
  if (typeof env.WORKER_NAME === 'string' && env.WORKER_NAME) {
    return env.WORKER_NAME
  }
  if (typeof env.CF_WORKER === 'string' && env.CF_WORKER) {
    return env.CF_WORKER
  }
  if (typeof env.NAME === 'string' && env.NAME) {
    return env.NAME
  }
  return 'api'
}
