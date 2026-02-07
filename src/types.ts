import type { Hono, Context } from 'hono'
import type { TestingConfig as _TestingConfig, RestEndpointTest as _RestEndpointTest, RestTestCase as _RestTestCase } from './conventions/testing'
import type { EventSinkConfig as _EventSinkConfig, DatabaseConfig as _DatabaseConfig } from './conventions/database/types'

// Re-export types from canonical sources
export type TestingConfig = _TestingConfig
export type RestEndpointTest = _RestEndpointTest
export type RestTestCase = _RestTestCase
export type EventSinkConfig = _EventSinkConfig
export type DatabaseConfig = _DatabaseConfig

// Response envelope types
export interface ApiMeta {
  name: string
  description?: string
  url?: string
  type?: string
  version?: string
}

export interface Links {
  self?: string
  next?: string
  prev?: string
  first?: string
  last?: string
  docs?: string
  [key: string]: string | undefined
}

export interface Actions {
  [key: string]: {
    method: string
    href: string
    description?: string
  }
}

export interface UserInfo {
  id?: string
  email?: string
  name?: string
  [key: string]: unknown
}

export interface ResponseMeta {
  total?: number
  limit?: number
  offset?: number
  cursor?: string
  [key: string]: unknown
}

export interface ResponseEnvelope<T = unknown> {
  api: ApiMeta
  links?: Links
  actions?: Actions
  data?: T
  user?: UserInfo
  meta?: ResponseMeta
  error?: ErrorDetail
  [key: string]: unknown
}

export interface ErrorDetail {
  message: string
  code?: string
  status?: number
  details?: unknown
}

// Respond helper options
export interface RespondOptions<T = unknown> {
  data?: T
  key?: string
  links?: Links
  actions?: Actions
  meta?: ResponseMeta
  status?: number
  error?: ErrorDetail
  user?: UserInfo
}

// Auth configuration
export interface AuthConfig {
  mode: 'required' | 'optional' | 'none'
  trustSnippets?: boolean
  /**
   * SECURITY WARNING: When set to true, allows JWT tokens to be decoded without
   * cryptographic signature verification. This is INSECURE and should only be used
   * in controlled environments where tokens have already been verified upstream
   * (e.g., by a CDN snippet or edge layer).
   *
   * Enabling this flag means ANY attacker who can craft a JWT-like string can
   * impersonate any user. Only enable this if you fully understand the security
   * implications and have other verification mechanisms in place.
   *
   * @default false
   */
  trustUnverified?: boolean
}

// Rate limit configuration
export interface RateLimitConfig {
  binding: string
  limit?: number
  period?: number
}

// CRUD configuration
export interface CrudConfig {
  db: string
  table: string
  primaryKey?: string
  searchable?: string[]
  sortable?: string[]
  pageSize?: number
  maxPageSize?: number
  columns?: string[]
}

// Proxy configuration
export interface ProxyConfig {
  upstream: string
  cacheTtl?: number
  headers?: Record<string, string>
  rewritePath?: (path: string) => string
  /** Optional list of allowed path prefixes for stricter access control */
  allowedPaths?: string[]
  /**
   * Block requests with path traversal sequences (../).
   * Checks both the normalized path and X-Original-Path header.
   * Enable this to prevent SSRF via path traversal attacks.
   */
  blockTraversal?: boolean
}

// RPC configuration
export interface RpcConfig {
  binding?: string
  url?: string
  methods?: string[]
}

// Test case for MCP tools
export interface McpToolTest {
  id?: string
  name: string
  description?: string
  tags?: string[]
  input: unknown
  expect: {
    status: 'success' | 'error'
    output?: unknown
    error?: { code?: string | number; message?: string }
    match?: 'exact' | 'partial' | 'schema'
  }
}

// Example for MCP tools
export interface McpToolExample {
  name: string
  input?: unknown
  output?: unknown
}

// MCP Tool definition
export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  examples?: McpToolExample[]
  tests?: McpToolTest[]
  handler: (input: unknown, c: Context) => Promise<unknown>
}

// MCP Resource definition
export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
  handler: (c: Context) => Promise<unknown>
}

// MCP configuration
export interface McpConfig {
  name: string
  version?: string
  tools?: McpTool[]
  resources?: McpResource[]
}

// Analytics configuration
export interface AnalyticsConfig {
  binding: string
  dataset?: string
}


// Landing page configuration
export type LandingConfig = false | ((c: Context<ApiEnv>) => Response | Promise<Response>)

// Database schema field definition (IceType-inspired)
export type FieldDef = string

// Database schema definition
export type SchemaDef = Record<string, Record<string, FieldDef>>

// Functions/Services configuration (imported from convention)
export type { FunctionsConfig } from './conventions/functions'

// Main API configuration
export interface ApiConfig {
  name: string
  description?: string
  version?: string
  basePath?: string
  auth?: AuthConfig
  rateLimit?: RateLimitConfig
  crud?: CrudConfig
  proxy?: ProxyConfig
  rpc?: RpcConfig
  mcp?: McpConfig
  analytics?: AnalyticsConfig
  analyticsBuffer?: import('./conventions/analytics-buffer').AnalyticsBufferConfig
  testing?: TestingConfig
  database?: DatabaseConfig
  functions?: import('./conventions/functions').FunctionsConfig
  landing?: LandingConfig
  routes?: (app: Hono<ApiEnv>) => void
}

// Cloudflare bindings env
export interface Bindings {
  [key: string]: unknown
}

// Variables set by middleware
export interface Variables {
  requestId: string
  respond: <T = unknown>(options: RespondOptions<T>) => Response
  user?: UserInfo
  geo?: GeoInfo
  apiConfig: ApiConfig
}

export interface GeoInfo {
  country?: string
  city?: string
  continent?: string
  latitude?: string
  longitude?: string
  region?: string
  timezone?: string
}

// Hono environment type
export interface ApiEnv {
  Bindings: Bindings
  Variables: Variables
}
