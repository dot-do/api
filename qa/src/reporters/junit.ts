/**
 * JUnit Reporter - XML output for CI/CD integration
 */

import type { Reporter, TestResult, TestRun } from '../types.js'

export interface JunitReporterOptions {
  suiteName?: string
  includeTimestamp?: boolean
}

export class JunitReporter implements Reporter {
  private results: TestResult[] = []
  private run: TestRun | null = null
  private options: JunitReporterOptions

  constructor(options: JunitReporterOptions = {}) {
    this.options = {
      suiteName: 'api.qa',
      includeTimestamp: true,
      ...options,
    }
  }

  onRunStart(_run: Pick<TestRun, 'runId' | 'startedAt'>): void {
    this.results = []
  }

  onTestStart(_test: Pick<TestResult, 'id' | 'name'>): void {
    // No action needed
  }

  onTestComplete(result: TestResult): void {
    this.results.push(result)
  }

  onRunComplete(run: TestRun): void {
    this.run = run
    console.log(this.getOutput())
  }

  getOutput(): string {
    if (!this.run) {
      return ''
    }

    const lines: string[] = []

    lines.push('<?xml version="1.0" encoding="UTF-8"?>')

    const timestamp = this.options.includeTimestamp
      ? ` timestamp="${this.run.startedAt}"`
      : ''

    lines.push(
      `<testsuites name="${this.escapeXml(this.options.suiteName!)}"` +
      ` tests="${this.run.summary.total}"` +
      ` failures="${this.run.summary.failed}"` +
      ` errors="0"` +
      ` skipped="${this.run.summary.skipped}"` +
      ` time="${(this.run.summary.duration / 1000).toFixed(3)}"${timestamp}>`
    )

    // Group tests by tags or use single suite
    const testsByTag = this.groupByTags()

    for (const [tag, tests] of testsByTag) {
      const suiteFailures = tests.filter(t => t.status === 'failed').length
      const suiteSkipped = tests.filter(t => t.status === 'skipped').length
      const suiteDuration = tests.reduce((acc, t) => acc + t.duration, 0)

      lines.push(
        `  <testsuite name="${this.escapeXml(tag)}"` +
        ` tests="${tests.length}"` +
        ` failures="${suiteFailures}"` +
        ` errors="0"` +
        ` skipped="${suiteSkipped}"` +
        ` time="${(suiteDuration / 1000).toFixed(3)}">`
      )

      for (const result of tests) {
        lines.push(this.formatTestCase(result))
      }

      lines.push('  </testsuite>')
    }

    lines.push('</testsuites>')

    return lines.join('\n')
  }

  private groupByTags(): Map<string, TestResult[]> {
    const groups = new Map<string, TestResult[]>()

    for (const result of this.results) {
      const tag = result.tags?.[0] || 'default'
      const existing = groups.get(tag) || []
      existing.push(result)
      groups.set(tag, existing)
    }

    return groups
  }

  private formatTestCase(result: TestResult): string {
    const lines: string[] = []
    const className = result.id?.split('.').slice(0, -1).join('.') || 'api.qa'
    const name = result.name

    lines.push(
      `    <testcase name="${this.escapeXml(name)}"` +
      ` classname="${this.escapeXml(className)}"` +
      ` time="${(result.duration / 1000).toFixed(3)}">`
    )

    if (result.status === 'failed') {
      const failedAssertions = result.assertions.filter(a => !a.passed)
      const message = result.error?.message ||
                     failedAssertions.map(a => a.message).join('; ') ||
                     'Test failed'

      lines.push(
        `      <failure message="${this.escapeXml(message)}" type="AssertionError">` +
        `<![CDATA[`
      )

      if (result.error?.stack) {
        lines.push(result.error.stack)
      }

      for (const assertion of failedAssertions) {
        lines.push(`Path: ${assertion.path}`)
        lines.push(`Expected: ${JSON.stringify(assertion.expected)}`)
        lines.push(`Actual: ${JSON.stringify(assertion.actual)}`)
        if (assertion.message) {
          lines.push(`Message: ${assertion.message}`)
        }
        lines.push('')
      }

      lines.push(']]></failure>')
    }

    if (result.status === 'skipped') {
      lines.push('      <skipped/>')
    }

    lines.push('    </testcase>')

    return lines.join('\n')
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}

export function createJunitReporter(options?: JunitReporterOptions): JunitReporter {
  return new JunitReporter(options)
}
