/**
 * api.qa - TDD Testing Framework for REST, RPC & MCP APIs
 *
 * A convention-first testing framework that embeds tests, types, and examples
 * directly in API definitions, enabling automated discovery and execution of
 * e2e tests across multiple protocol types.
 *
 * @example
 * ```typescript
 * import { TestRunner, discover, runTests } from 'api.qa'
 *
 * // Quick run
 * const run = await runTests('https://api.example.com')
 * console.log(run.summary)
 *
 * // With options
 * const runner = new TestRunner({
 *   baseUrl: 'https://api.example.com',
 *   parallel: true,
 *   tags: ['smoke'],
 * })
 * const run = await runner.run()
 * ```
 */

// Core types
export * from './types.js'

// Assertions
export {
  // Matchers
  match,
  matchType,
  matchPattern,
  matchFormat,
  matchRange,
  matchLength,
  matchEnum,
  deepEqual,
  isMatcher,
  isTypeMatcher,
  isPatternMatcher,
  isFormatMatcher,
  isRangeMatcher,
  isLengthMatcher,
  isEnumMatcher,
  isOptionalMatcher,
  type MatchResult,
  // Partial matching
  matchPartial,
  matchExact,
  matchWithPaths,
  assertMatch,
  type PartialMatchResult,
  // JSONPath
  getValueByPath,
  setValueByPath,
  hasPath,
  parsePath,
  // Schema validation
  validateSchema,
  matchSchema,
  inferSchema,
  type SchemaValidationResult,
  // Main assert
  assert,
  type AssertOptions,
} from './assertions/index.js'

// Protocol runners
export {
  executeRestTest,
  createRestTestSuite,
  type RestExecutionOptions,
} from './protocols/rest.js'

export {
  executeMcpTest,
  executeMcpMethod,
  listMcpTools,
  extractMcpTests,
  type McpExecutionOptions,
} from './protocols/mcp.js'

export {
  executeRpcTest,
  executeRpcBatchTest,
  executeRpcPipelineTest,
  fetchRpcSchema,
  extractRpcTests,
  type RpcExecutionOptions,
} from './protocols/rpc.js'

export {
  executeOAuthTest,
  discoverOAuthMetadata,
  registerClient,
  exchangeCodeForToken,
  getClientCredentialsToken,
  generatePkce,
  createAuthenticatedContext,
  type OAuthExecutionOptions,
  type OAuthMetadata,
  type ClientRegistration,
  type TokenResponse,
} from './protocols/oauth.js'

// Discovery
export {
  discover,
  hasTests,
  discoverMcpTests,
  discoverRpcTests,
  discoverOpenApiTests,
  listTools,
  listResources,
  listPrompts,
  getServerInfo,
  fetchSchema,
  fetchOpenApiSpec,
  extractEndpoints,
  type DiscoveryOptions,
  type DiscoveryResult,
  type McpDiscoveryOptions,
  type RpcDiscoveryOptions,
  type OpenApiDiscoveryOptions,
} from './discovery/index.js'

// Runner
export {
  TestRunner,
  runTests,
  discoverTests,
  execute,
  executeTest,
  executeSequential,
  executeParallel,
  getTestProtocol,
  createContext,
  cloneContext,
  setVariable,
  getVariable,
  interpolate,
  interpolateObject,
  extractVariables,
  createContextFromEnv,
  type TestRunnerOptions,
  type ExecutorOptions,
} from './runner/index.js'

// Reporters
export {
  createReporter,
  ConsoleReporter,
  createConsoleReporter,
  JsonReporter,
  createJsonReporter,
  TapReporter,
  createTapReporter,
  JunitReporter,
  createJunitReporter,
  type ReporterType,
  type ReporterOptions,
  type JsonReporterOptions,
  type JunitReporterOptions,
} from './reporters/index.js'

// CLI
export { main } from './cli/index.js'

// Convenience factory function
import { TestRunner, type TestRunnerOptions } from './runner/index.js'
import { createReporter, type ReporterType } from './reporters/index.js'

/**
 * Create a test runner with fluent API
 */
export function QA(baseUrl: string, options: Partial<TestRunnerOptions> = {}) {
  const runner = new TestRunner({ baseUrl, ...options })

  return {
    /**
     * Set reporter
     */
    reporter(type: ReporterType) {
      runner.setReporter(createReporter(type))
      return this
    },

    /**
     * Run all tests
     */
    run() {
      return runner.run()
    },

    /**
     * Run tests by ID
     */
    runById(ids: string[]) {
      return runner.runById(ids)
    },

    /**
     * Run tests by tags
     */
    runByTags(tags: string[]) {
      return runner.runByTags(tags)
    },

    /**
     * Discover tests without running
     */
    discover() {
      return runner.discover()
    },

    /**
     * Get the underlying runner
     */
    getRunner() {
      return runner
    },
  }
}
