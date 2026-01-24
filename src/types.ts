import type { Hono, Context } from 'hono'

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

// REST endpoint test definition
export interface RestEndpointTest {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  tests?: Array<{
    id?: string
    name: string
    description?: string
    tags?: string[]
    request?: {
      method?: string
      path?: string
      body?: unknown
      headers?: Record<string, string>
      query?: Record<string, string>
    }
    expect: {
      status: number
      headers?: Record<string, string>
      body?: unknown
      match?: 'exact' | 'partial' | 'schema'
    }
  }>
}

// Testing configuration
export interface TestingConfig {
  enabled?: boolean
  endpoint?: string
  tags?: string[]
  endpoints?: RestEndpointTest[]
}

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
  testing?: TestingConfig
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
