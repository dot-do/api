/**
 * TestRunner - main class for running tests
 */

import type {
  TestCase,
  TestResult,
  TestRun,
  TestRunSummary,
  TestContext,
  Reporter,
} from '../types.js'
import { discover, type DiscoveryOptions } from '../discovery/index.js'
import { execute, type ExecutorOptions } from './executor.js'
import { createContextFromEnv } from './context.js'

export * from './context.js'
export * from './executor.js'

export interface TestRunnerOptions {
  baseUrl: string
  timeout?: number
  retries?: number
  parallel?: boolean
  concurrency?: number
  headers?: Record<string, string>
  context?: TestContext
  reporter?: Reporter
  tags?: string[]
  ids?: string[]
}

/**
 * Generate a unique run ID
 */
function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Filter tests by tags and/or IDs
 */
function filterTests(tests: TestCase[], options: { tags?: string[]; ids?: string[] }): TestCase[] {
  let filtered = tests

  if (options.ids && options.ids.length > 0) {
    filtered = filtered.filter((t) => options.ids!.includes(t.id || t.name))
  }

  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter((t) => {
      if (!t.tags) return false
      return options.tags!.some((tag) => t.tags!.includes(tag))
    })
  }

  return filtered
}

/**
 * Calculate run summary from results
 */
function calculateSummary(results: TestResult[], duration: number): TestRunSummary {
  return {
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    duration,
  }
}

export class TestRunner {
  private options: TestRunnerOptions
  private context: TestContext
  private reporter?: Reporter

  constructor(options: TestRunnerOptions) {
    this.options = options
    this.context = options.context || createContextFromEnv(options.baseUrl)
    this.reporter = options.reporter
  }

  /**
   * Discover tests from the server
   */
  async discover(): Promise<TestCase[]> {
    const discoveryOptions: DiscoveryOptions = {
      baseUrl: this.options.baseUrl,
      timeout: this.options.timeout,
      headers: this.options.headers,
      accessToken: this.context.accessToken,
    }

    const result = await discover(discoveryOptions)
    return result.allTests
  }

  /**
   * Run all discovered tests
   */
  async run(tests?: TestCase[]): Promise<TestRun> {
    const runId = generateRunId()
    const startedAt = new Date().toISOString()
    const startTime = Date.now()

    this.reporter?.onRunStart?.({ runId, startedAt })

    // Discover tests if not provided
    let testsToRun = tests || await this.discover()

    // Filter tests
    testsToRun = filterTests(testsToRun, {
      tags: this.options.tags,
      ids: this.options.ids,
    })

    const executorOptions: ExecutorOptions = {
      baseUrl: this.options.baseUrl,
      timeout: this.options.timeout,
      retries: this.options.retries,
      parallel: this.options.parallel,
      concurrency: this.options.concurrency,
      headers: this.options.headers,
      onTestStart: (test) => {
        this.reporter?.onTestStart?.({ id: test.id || test.name, name: test.name })
      },
      onTestComplete: (result) => {
        this.reporter?.onTestComplete?.(result)
      },
    }

    const results = await execute(testsToRun, executorOptions, this.context)

    const duration = Date.now() - startTime
    const completedAt = new Date().toISOString()

    const run: TestRun = {
      runId,
      status: 'completed',
      startedAt,
      completedAt,
      duration,
      results,
      summary: calculateSummary(results, duration),
    }

    this.reporter?.onRunComplete?.(run)

    return run
  }

  /**
   * Run specific tests by ID
   */
  async runById(ids: string[]): Promise<TestRun> {
    const allTests = await this.discover()
    const tests = allTests.filter((t) => ids.includes(t.id || t.name))
    return this.run(tests)
  }

  /**
   * Run tests by tags
   */
  async runByTags(tags: string[]): Promise<TestRun> {
    const allTests = await this.discover()
    const tests = allTests.filter((t) => t.tags?.some((tag) => tags.includes(tag)))
    return this.run(tests)
  }

  /**
   * Set the test context
   */
  setContext(context: Partial<TestContext>): void {
    this.context = { ...this.context, ...context }
  }

  /**
   * Set a reporter
   */
  setReporter(reporter: Reporter): void {
    this.reporter = reporter
  }
}

/**
 * Quick run function for simple use cases
 */
export async function runTests(
  baseUrl: string,
  options: Partial<TestRunnerOptions> = {}
): Promise<TestRun> {
  const runner = new TestRunner({ baseUrl, ...options })
  return runner.run()
}

/**
 * Discover and return tests without running
 */
export async function discoverTests(
  baseUrl: string,
  options: Partial<DiscoveryOptions> = {}
): Promise<TestCase[]> {
  const runner = new TestRunner({ baseUrl, ...options })
  return runner.discover()
}
