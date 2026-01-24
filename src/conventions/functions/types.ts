/**
 * Functions Convention Types
 *
 * Unified API pattern for:
 * - Service actions (send email, process image)
 * - Proxy wrappers (Apollo.io, Stripe)
 * - Package APIs (lodash, esbuild)
 * - Mashups (combine multiple sources)
 * - Utilities (WHOIS, DNS → valuable API)
 */

import type { Context } from 'hono'

// =============================================================================
// Core Function Types
// =============================================================================

/**
 * Function handler signature
 */
export type FunctionHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  ctx: FunctionContext
) => Promise<TOutput>

/**
 * Context passed to function handlers
 */
export interface FunctionContext {
  /** Hono context */
  c: Context
  /** Request ID for tracing */
  requestId: string
  /** Authenticated user (if any) */
  user?: { id: string; [key: string]: unknown }
  /** Environment bindings */
  env: Record<string, unknown>
  /** Fetch with automatic retries and caching */
  fetch: typeof fetch
  /** Cache helper */
  cache: CacheHelper
  /** Call another function */
  call: <T>(name: string, input: unknown) => Promise<T>
}

/**
 * Cache helper for function handlers
 */
export interface CacheHelper {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>
}

// =============================================================================
// Function Definition
// =============================================================================

/**
 * Function definition - a single callable unit
 */
export interface FunctionDef<TInput = unknown, TOutput = unknown> {
  /** Function name (e.g., "email.send", "image.resize") */
  name: string
  /** Description for docs and MCP */
  description: string
  /** Input schema (JSON Schema) */
  input: JsonSchema
  /** Output schema (JSON Schema) */
  output?: JsonSchema
  /** The handler function */
  handler: FunctionHandler<TInput, TOutput>
  /** Examples for docs and testing */
  examples?: Array<{
    name: string
    input: TInput
    output?: TOutput
  }>
  /** Cache configuration */
  cache?: CacheConfig
  /** Rate limit configuration */
  rateLimit?: RateLimitConfig
  /** Tags for organization */
  tags?: string[]
}

// =============================================================================
// Proxy Definition
// =============================================================================

/**
 * Proxy definition - wrap an external API
 */
export interface ProxyDef {
  /** Proxy name (e.g., "apollo", "stripe") */
  name: string
  /** Description */
  description?: string
  /** Upstream base URL */
  upstream: string
  /** Authentication for upstream */
  auth?: ProxyAuth
  /** Request transformation */
  transformRequest?: (req: ProxyRequest) => ProxyRequest | Promise<ProxyRequest>
  /** Response transformation */
  transformResponse?: (res: ProxyResponse, req: ProxyRequest) => unknown | Promise<unknown>
  /** Error transformation */
  transformError?: (error: ProxyError) => unknown
  /** Cache configuration */
  cache?: CacheConfig
  /** Rate limit for upstream calls */
  rateLimit?: RateLimitConfig
  /** Retry configuration */
  retry?: RetryConfig
  /** Endpoints to expose (if not all) */
  endpoints?: ProxyEndpoint[]
  /** Headers to forward */
  forwardHeaders?: string[]
  /** Headers to add */
  addHeaders?: Record<string, string>
}

export interface ProxyAuth {
  type: 'bearer' | 'basic' | 'api-key' | 'oauth2' | 'custom'
  /** Environment variable name for token/key */
  tokenVar?: string
  /** Static token (not recommended) */
  token?: string
  /** Header name for api-key auth */
  header?: string
  /** Custom auth function */
  custom?: (req: ProxyRequest, ctx: FunctionContext) => Promise<ProxyRequest>
}

export interface ProxyRequest {
  method: string
  path: string
  query?: Record<string, string>
  headers?: Record<string, string>
  body?: unknown
}

export interface ProxyResponse {
  status: number
  headers: Record<string, string>
  body: unknown
}

export interface ProxyError {
  status: number
  message: string
  body?: unknown
}

export interface ProxyEndpoint {
  /** Path pattern (e.g., "/companies/:domain") */
  path: string
  /** HTTP methods to allow */
  methods?: string[]
  /** Override upstream path */
  upstream?: string
  /** Custom transform for this endpoint */
  transform?: (res: unknown) => unknown
  /** Cache override */
  cache?: CacheConfig
}

// =============================================================================
// Package Definition
// =============================================================================

/**
 * Package definition - expose npm package as API
 */
export interface PackageDef {
  /** Package name */
  name: string
  /** Module to import (default: same as name) */
  module?: string
  /** Functions to expose */
  expose: string[] | PackageFunction[]
  /** Description */
  description?: string
  /** Namespace for function names (default: package name) */
  namespace?: string
}

export interface PackageFunction {
  /** Function name in the module */
  name: string
  /** Exposed name (default: same as name) */
  as?: string
  /** Description */
  description?: string
  /** Input schema override */
  input?: JsonSchema
  /** Output schema override */
  output?: JsonSchema
  /** Transform input before calling */
  transformInput?: (input: unknown) => unknown
  /** Transform output after calling */
  transformOutput?: (output: unknown) => unknown
}

// =============================================================================
// Mashup Definition
// =============================================================================

/**
 * Mashup definition - combine multiple sources
 */
export interface MashupDef {
  /** Mashup name (e.g., "company.enrich") */
  name: string
  /** Description */
  description: string
  /** Input schema */
  input: JsonSchema
  /** Sources to fetch from */
  sources: Record<string, MashupSource>
  /** How to merge results */
  merge: 'deep' | 'shallow' | MergeFn
  /** Output schema */
  output?: JsonSchema
  /** Cache the merged result */
  cache?: CacheConfig
  /** Run sources in parallel (default: true) */
  parallel?: boolean
}

export interface MashupSource {
  /** URL template (supports {param} interpolation) */
  url: string
  /** HTTP method (default: GET) */
  method?: string
  /** Headers to send */
  headers?: Record<string, string>
  /** Body template */
  body?: unknown
  /** Transform the response */
  transform?: (data: unknown) => unknown
  /** Field in input to use for URL params */
  params?: Record<string, string>
  /** Whether this source is required (default: true) */
  required?: boolean
  /** Timeout in ms */
  timeout?: number
  /** Cache this source separately */
  cache?: CacheConfig
}

export type MergeFn = (results: Record<string, unknown>, input: unknown) => unknown

// =============================================================================
// Utility Types
// =============================================================================

export interface CacheConfig {
  /** TTL in seconds */
  ttl: number
  /** Cache key template (supports {param} interpolation) */
  key?: string
  /** Stale-while-revalidate */
  swr?: number
  /** Cache storage (default: KV) */
  storage?: 'kv' | 'cache-api' | 'memory'
}

export interface RateLimitConfig {
  /** Requests per window */
  limit: number
  /** Window in seconds */
  window: number
  /** Rate limit key (default: ip) */
  key?: 'ip' | 'user' | 'api-key' | string
}

export interface RetryConfig {
  /** Max retries */
  attempts: number
  /** Initial delay in ms */
  delay: number
  /** Backoff multiplier */
  backoff?: number
  /** Status codes to retry */
  retryOn?: number[]
}

export interface JsonSchema {
  type?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  description?: string
  default?: unknown
  enum?: unknown[]
  format?: string
  [key: string]: unknown
}

// =============================================================================
// Lookup/Reference Definition
// =============================================================================

/**
 * Lookup definition - read-only reference data API
 *
 * Examples: GeoNames, country codes, ZIP codes, timezones, currencies
 */
export interface LookupDef {
  /** Lookup name (e.g., "geonames", "countries") */
  name: string
  /** Description */
  description?: string
  /** Data source */
  source: LookupSource
  /** Primary key field for get by ID */
  primaryKey: string
  /** Fields available for lookup */
  fields: LookupField[]
  /** Search configuration */
  search?: LookupSearch
  /** Autocomplete configuration */
  autocomplete?: LookupAutocomplete
  /** Cache configuration (lookups are highly cacheable) */
  cache?: CacheConfig
  /** Output transformation */
  transform?: (item: unknown) => unknown
}

export interface LookupSource {
  /** Source type */
  type: 'database' | 'kv' | 'r2' | 'static' | 'remote'
  /** Binding name for database/kv/r2 */
  binding?: string
  /** Table/bucket/prefix name */
  name?: string
  /** Remote URL for remote source */
  url?: string
  /** Static data (for small datasets) */
  data?: unknown[]
  /** SQL query template (for database) */
  query?: string
}

export interface LookupField {
  /** Field name */
  name: string
  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'date' | 'json'
  /** Is this field indexed/searchable */
  indexed?: boolean
  /** Is this field included in search results */
  select?: boolean
  /** Field description */
  description?: string
}

export interface LookupSearch {
  /** Fields to search in */
  fields: string[]
  /** Minimum query length */
  minLength?: number
  /** Maximum results */
  limit?: number
  /** Full-text search enabled */
  fullText?: boolean
  /** Fuzzy matching enabled */
  fuzzy?: boolean
}

export interface LookupAutocomplete {
  /** Field to autocomplete on */
  field: string
  /** Additional fields to return */
  include?: string[]
  /** Maximum suggestions */
  limit?: number
  /** Minimum query length */
  minLength?: number
}

// =============================================================================
// Pipeline Definition
// =============================================================================

/**
 * Pipeline definition - chain of transformations
 *
 * For complex data processing flows
 */
export interface PipelineDef {
  /** Pipeline name */
  name: string
  /** Description */
  description: string
  /** Input schema */
  input: JsonSchema
  /** Pipeline steps */
  steps: PipelineStep[]
  /** Output schema */
  output?: JsonSchema
  /** Error handling */
  onError?: 'fail' | 'continue' | 'rollback'
  /** Cache final result */
  cache?: CacheConfig
}

export interface PipelineStep {
  /** Step name for debugging */
  name: string
  /** Step type */
  type: 'function' | 'proxy' | 'lookup' | 'transform' | 'condition' | 'parallel'
  /** For function: function name to call */
  function?: string
  /** For proxy: proxy name and path */
  proxy?: { name: string; path: string }
  /** For lookup: lookup name and key */
  lookup?: { name: string; key: string }
  /** For transform: transformation function */
  transform?: (data: unknown, ctx: FunctionContext) => unknown | Promise<unknown>
  /** For condition: predicate and branches */
  condition?: {
    if: (data: unknown) => boolean
    then: PipelineStep[]
    else?: PipelineStep[]
  }
  /** For parallel: steps to run concurrently */
  parallel?: PipelineStep[]
  /** Input mapping from previous step */
  inputMap?: Record<string, string>
  /** Output mapping to next step */
  outputMap?: Record<string, string>
  /** Skip this step if condition */
  skipIf?: (data: unknown) => boolean
}

// =============================================================================
// Main Configuration
// =============================================================================

/**
 * Functions convention configuration
 */
export interface FunctionsConfig {
  /** Service functions (actions) */
  functions?: FunctionDef[]
  /** Proxy wrappers (external APIs) */
  proxies?: ProxyDef[]
  /** Package APIs (npm modules) */
  packages?: PackageDef[]
  /** Mashups (combine sources) */
  mashups?: MashupDef[]
  /** Lookups (reference data) */
  lookups?: LookupDef[]
  /** Pipelines (transformation chains) */
  pipelines?: PipelineDef[]
  /** Global cache binding */
  cache?: string
  /** Global rate limit binding */
  rateLimit?: string
  /** Base path for REST endpoints */
  basePath?: string
  /** Enable MCP tools (default: true) */
  mcp?: boolean
}
