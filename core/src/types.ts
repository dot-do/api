import type { Hono, Context } from 'hono'
import type { TestingConfig as _TestingConfig, RestEndpointTest as _RestEndpointTest, RestTestCase as _RestTestCase } from './conventions/testing'
import type { EventSinkConfig as _EventSinkConfig, DatabaseConfig as _DatabaseConfig } from './conventions/database/types'

// Re-export types from canonical sources
export type TestingConfig = _TestingConfig
export type RestEndpointTest = _RestEndpointTest
export type RestTestCase = _RestTestCase
export type EventSinkConfig = _EventSinkConfig
export type DatabaseConfig = _DatabaseConfig
export type { FieldDef, SchemaDef, ModelDef } from './conventions/database/types'

// Response envelope types
export interface ApiMeta {
  name: string
  description?: string
  url?: string
  docs?: string
  repo?: string
  type?: string
  version?: string
  login?: string
  signup?: string
  from?: string
}

/** HATEOAS links — all values are URL strings. Absent keys mean not applicable. */
export interface Links {
  self?: string
  home?: string
  collection?: string
  first?: string
  prev?: string
  next?: string
  last?: string
  docs?: string
  [key: string]: string | undefined
}

/** Actions — map of action name to mutation URL string (or legacy {method, href} object for backward compatibility) */
export interface Actions {
  [key: string]: string | { method: string; href: string; description?: string }
}

/** Options — map of option name to view-customization URL */
export interface Options {
  [key: string]: string
}

export interface UserContext {
  authenticated: boolean
  level?: 'L0' | 'L1' | 'L2' | 'L3'
  id?: string
  name?: string
  email?: string
  tenant?: string
  agent?: { id: string; name: string }
  plan?: string
  usage?: Record<string, { used: number; limit: number; period?: string }>
  links?: Record<string, string>
}

/** @deprecated Use UserContext instead */
export interface UserInfo {
  id?: string
  email?: string
  name?: string
  [key: string]: unknown
}

/** @deprecated Use top-level total/limit/page instead */
export interface ResponseMeta {
  total?: number
  limit?: number
  offset?: number
  cursor?: string
  [key: string]: unknown
}

export interface ResponseEnvelope {
  api: ApiMeta
  $context?: string
  $type?: string
  $id?: string
  total?: number
  limit?: number
  page?: number
  links?: Links
  // Semantic payload key (e.g. "contacts", "contact", "score") — added dynamically
  [payloadKey: string]: unknown
  actions?: Actions
  options?: Options
  error?: ErrorDetail
  user?: UserContext
}

export interface ErrorDetail {
  message: string
  code?: string
  status?: number
  details?: unknown
  fields?: Record<string, string>
  retryAfter?: number
  yourVersion?: number
  currentVersion?: number
  feature?: string
}

/** Context for building actionable error links */
export interface ErrorContext {
  baseUrl?: string
  tenant?: string
  collection?: string
  entityId?: string
  query?: string
}

/** Full error response with actionable links */
export interface ErrorResponse {
  error: ErrorDetail
  links?: Record<string, string>
  actions?: Record<string, string>
  options?: Record<string, string>
  upgrade?: Record<string, string>
}

// Respond helper options
export interface RespondOptions<T = unknown> {
  /** The data payload */
  data?: T
  /** Semantic key name for the payload (e.g. "contacts", "contact", "score"). Defaults to "data". */
  key?: string
  /** MDXLD $context — tenant namespace URL */
  $context?: string
  /** MDXLD $type — collection/type URL */
  $type?: string
  /** MDXLD $id — specific resource URL */
  $id?: string
  /** Total count (list responses) */
  total?: number
  /** Page size (list responses) */
  limit?: number
  /** Current page number (page-based pagination) */
  page?: number
  links?: Links
  actions?: Actions
  options?: Options
  /** @deprecated Use top-level total/limit/page instead */
  meta?: ResponseMeta
  status?: number
  error?: ErrorDetail
  user?: UserContext | UserInfo
}

// Auth configuration
export interface AuthConfig {
  mode: 'required' | 'optional' | 'none'
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

// Database schema types are re-exported from ./conventions/database/types at the top of this file

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
  events?: import('./conventions/events/types').EventsConfig
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
  user?: UserContext | UserInfo
  geo?: GeoInfo
  apiConfig: ApiConfig
  /** Set by routerMiddleware: complete parsed route info */
  routeInfo?: import('./router').RouteInfo
  /** Set by routerMiddleware: resolved tenant slug */
  tenant?: string
  /** Set by routerMiddleware: source of tenant resolution */
  tenantSource?: 'path' | 'header' | 'subdomain' | 'token' | 'default'
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
