/**
 * TAP Reporter - Test Anything Protocol output
 * https://testanything.org/
 */

import type { Reporter, TestResult, TestRun } from '../types.js'

export class TapReporter implements Reporter {
  private output: string[] = []
  private testNumber: number = 0
  private totalTests: number = 0

  private log(line: string): void {
    this.output.push(line)
    console.log(line)
  }

  onRunStart(_run: Pick<TestRun, 'runId' | 'startedAt'>): void {
    this.testNumber = 0
    // TAP version header
    this.log('TAP version 14')
  }

  onTestStart(_test: Pick<TestResult, 'id' | 'name'>): void {
    // TAP doesn't have a test start concept
  }

  onTestComplete(result: TestResult): void {
    this.testNumber++
    this.totalTests++

    const status = result.status === 'passed' ? 'ok' :
                   result.status === 'skipped' ? 'ok' : 'not ok'

    const directive = result.status === 'skipped' ? ' # SKIP' : ''
    const description = result.name.replace(/#/g, '\\#')  // Escape # in descriptions

    this.log(`${status} ${this.testNumber} - ${description}${directive}`)

    // Add YAML diagnostic block for failures
    if (result.status === 'failed') {
      this.log('  ---')

      if (result.error) {
        this.log(`  message: "${this.escapeYaml(result.error.message)}"`)
      }

      if (result.assertions.length > 0) {
        this.log('  assertions:')
        for (const assertion of result.assertions) {
          if (!assertion.passed) {
            this.log(`    - path: "${assertion.path}"`)
            this.log(`      expected: ${JSON.stringify(assertion.expected)}`)
            this.log(`      actual: ${JSON.stringify(assertion.actual)}`)
            if (assertion.message) {
              this.log(`      message: "${this.escapeYaml(assertion.message)}"`)
            }
          }
        }
      }

      this.log(`  duration_ms: ${result.duration}`)
      this.log('  ...')
    }
  }

  onRunComplete(run: TestRun): void {
    // TAP plan
    this.log(`1..${this.totalTests}`)

    // Summary comment
    this.log('')
    this.log(`# tests ${run.summary.total}`)
    this.log(`# pass ${run.summary.passed}`)
    this.log(`# fail ${run.summary.failed}`)
    this.log(`# skip ${run.summary.skipped}`)
    this.log(`# duration ${run.summary.duration}ms`)
  }

  private escapeYaml(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
  }

  getOutput(): string {
    return this.output.join('\n')
  }
}

export function createTapReporter(): TapReporter {
  return new TapReporter()
}
