/**
 * Core types for api.qa testing framework
 */

// =============================================================================
// Base Types
// =============================================================================

export type MatchMode = 'exact' | 'partial' | 'schema'

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

export type ProtocolType = 'rest' | 'mcp' | 'rpc' | 'oauth'

export interface JSONSchema {
  type?: string | string[]
  properties?: Record<string, JSONSchema>
  items?: JSONSchema | JSONSchema[]
  required?: string[]
  additionalProperties?: boolean | JSONSchema
  enum?: unknown[]
  const?: unknown
  oneOf?: JSONSchema[]
  anyOf?: JSONSchema[]
  allOf?: JSONSchema[]
  not?: JSONSchema
  if?: JSONSchema
  then?: JSONSchema
  else?: JSONSchema
  format?: string
  pattern?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  minProperties?: number
  maxProperties?: number
  default?: unknown
  description?: string
  $ref?: string
  $defs?: Record<string, JSONSchema>
  definitions?: Record<string, JSONSchema>
}

// =============================================================================
// Assertion Matchers
// =============================================================================

export interface TypeMatcher {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined'
}

export interface PatternMatcher {
  pattern: string
}

export interface FormatMatcher {
  format: 'email' | 'date-time' | 'date' | 'time' | 'uri' | 'uuid' | 'ipv4' | 'ipv6' | 'hostname'
}

export interface RangeMatcher {
  gte?: number
  gt?: number
  lte?: number
  lt?: number
}

export interface LengthMatcher {
  length?: number
  minLength?: number
  maxLength?: number
}

export interface EnumMatcher {
  oneOf: unknown[]
}

export interface OptionalMatcher {
  optional: true
}

export type Matcher =
  | TypeMatcher
  | PatternMatcher
  | FormatMatcher
  | RangeMatcher
  | LengthMatcher
  | EnumMatcher
  | OptionalMatcher
  | (TypeMatcher & PatternMatcher)
  | (TypeMatcher & FormatMatcher)
  | (TypeMatcher & RangeMatcher)
  | (TypeMatcher & LengthMatcher)
  | unknown // for literal values

export type ExpectValue = Matcher | unknown

export interface ExpectBody {
  [jsonPath: string]: ExpectValue
}

// =============================================================================
// Test Expectations
// =============================================================================

export interface RpcExpectation {
  status: 'success' | 'error'
  output?: ExpectBody | unknown
  error?: {
    code?: string | number
    message?: string | PatternMatcher
  }
  match?: MatchMode
}

export interface RestExpectation {
  status: number | RangeMatcher
  headers?: Record<string, string | PatternMatcher>
  body?: ExpectBody | unknown
  match?: MatchMode
}

// =============================================================================
// Test Case Definitions
// =============================================================================

export interface Example<TInput = unknown, TOutput = unknown> {
  name: string
  input?: TInput
  output?: TOutput
  request?: RestRequest
  response?: RestResponse
}

export interface RestRequest {
  method?: string
  path?: string
  body?: unknown
  headers?: Record<string, string>
  query?: Record<string, string>
}

export interface RestResponse {
  status: number
  body?: unknown
  headers?: Record<string, string>
}

export interface BaseTestCase {
  id?: string
  name: string
  description?: string
  tags?: string[]
  timeout?: number
  skip?: boolean | string
  only?: boolean
}

export interface RpcTestCase extends BaseTestCase {
  type?: 'rpc' | 'mcp'
  method?: string
  input: unknown
  expect: RpcExpectation
}

export interface RestTestCase extends BaseTestCase {
  type?: 'rest'
  request: RestRequest
  expect: RestExpectation
}

export type TestCase = RpcTestCase | RestTestCase

// =============================================================================
// MCP Protocol Types
// =============================================================================

export interface McpTool<TInput = unknown, TOutput = unknown> {
  name: string
  description?: string
  inputSchema?: JSONSchema
  outputSchema?: JSONSchema
  examples?: Example<TInput, TOutput>[]
  tests?: RpcTestCase[]
}

export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface McpConfig {
  name?: string
  version?: string
  description?: string
  tools?: McpTool[]
  resources?: McpResource[]
  prompts?: McpPrompt[]
}

export interface McpPrompt {
  name: string
  description?: string
  arguments?: {
    name: string
    description?: string
    required?: boolean
  }[]
}

// =============================================================================
// RPC Protocol Types (capnweb/rpc.do)
// =============================================================================

export type RpcTransport = 'http' | 'ws' | 'binding'

export interface RpcMethod<TInput = unknown, TOutput = unknown> {
  path: string
  description?: string
  inputSchema?: JSONSchema
  outputSchema?: JSONSchema
  examples?: Example<TInput, TOutput>[]
  tests?: RpcTestCase[]
}

export interface RpcBatchTest extends BaseTestCase {
  calls: {
    path: string
    args: unknown[]
  }[]
  expect: {
    batchSize?: number
    allSuccess?: boolean
    results?: ExpectBody[]
  }
}

export interface RpcPipelineTest extends BaseTestCase {
  pipeline: string
  expect: {
    output?: ExpectBody | unknown
    match?: MatchMode
  }
}

export interface RpcConfig {
  type: 'rpc'
  transport?: RpcTransport
  baseUrl?: string
  schema?: string
  methods?: RpcMethod[]
  batchTests?: RpcBatchTest[]
  pipelineTests?: RpcPipelineTest[]
}

// =============================================================================
// REST Protocol Types
// =============================================================================

export interface RestEndpoint<TInput = unknown, TOutput = unknown> {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  description?: string
  inputSchema?: JSONSchema
  outputSchema?: JSONSchema
  examples?: Example<TInput, TOutput>[]
  tests?: RestTestCase[]
}

export interface RestConfig {
  type: 'rest'
  baseUrl?: string
  endpoints?: RestEndpoint[]
}

// =============================================================================
// OAuth 2.1 Protocol Types
// =============================================================================

export type OAuthFlow = 'authorization_code' | 'client_credentials' | 'refresh_token'

export type McpOAuthTestType = 'discovery' | 'registration' | 'token' | 'mcp'

export interface McpOAuthTest extends BaseTestCase {
  type: McpOAuthTestType
  flow?: OAuthFlow
  pkce?: boolean
  authenticated?: boolean
  method?: string
  request?: Record<string, unknown>
  expect: {
    status?: number
    [jsonPath: string]: ExpectValue
  }
}

export interface OAuthConfig {
  registrationEndpoint?: string
  flows?: OAuthFlow[]
  pkce?: boolean
  scopes?: string[]
}

export interface McpOAuthConfig {
  type: 'mcp-oauth'
  server: string
  oauth: OAuthConfig
  tests?: McpOAuthTest[]
}

// =============================================================================
// Test Results
// =============================================================================

export interface AssertionResult {
  path: string
  expected: unknown
  actual: unknown
  passed: boolean
  message?: string
}

export interface TestResult {
  id: string
  name: string
  status: TestStatus
  duration: number
  request?: unknown
  response?: unknown
  assertions: AssertionResult[]
  error?: {
    message: string
    stack?: string
  }
  tags?: string[]
}

export interface TestRunSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
}

export interface TestRun {
  runId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  duration: number
  results: TestResult[]
  summary: TestRunSummary
}

// =============================================================================
// Discovery Types
// =============================================================================

export interface TestSummary {
  total: number
  byType: Record<ProtocolType, number>
  byTag: Record<string, number>
}

export interface TestListResponse {
  tests: Array<{
    id: string
    name: string
    method?: string
    type: ProtocolType
    input?: unknown
    expect: unknown
    tags?: string[]
  }>
  summary: TestSummary
}

export interface TestRunRequest {
  ids?: string[]
  tags?: string[]
  all?: boolean
  options?: TestRunOptions
}

export interface TestRunOptions {
  parallel?: boolean
  timeout?: number
  retries?: number
  baseUrl?: string
  reporter?: 'json' | 'tap' | 'junit' | 'console'
}

// =============================================================================
// Testing Convention Config (for api.do integration)
// =============================================================================

export interface TestingConfig {
  enabled?: boolean
  endpoint?: string
  tags?: string[]
  endpoints?: RestEndpoint[]
}

// =============================================================================
// CLI Types
// =============================================================================

export interface CliOptions {
  baseUrl?: string
  tags?: string[]
  type?: ProtocolType
  format?: 'json' | 'tap' | 'junit' | 'console'
  parallel?: boolean
  timeout?: number
  retries?: number
  output?: string
  auth?: 'none' | 'oauth2' | 'bearer'
  verbose?: boolean
}

// =============================================================================
// Context Types
// =============================================================================

export interface TestContext {
  baseUrl: string
  accessToken?: string
  clientId?: string
  clientSecret?: string
  variables: Record<string, unknown>
  headers?: Record<string, string>
}

// =============================================================================
// Reporter Types
// =============================================================================

export interface Reporter {
  onRunStart?(run: Pick<TestRun, 'runId' | 'startedAt'>): void
  onTestStart?(test: Pick<TestResult, 'id' | 'name'>): void
  onTestComplete?(result: TestResult): void
  onRunComplete?(run: TestRun): void
  getOutput?(): string
}
