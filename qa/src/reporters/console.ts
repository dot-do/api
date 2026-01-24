/**
 * Console Reporter - pretty output for terminal
 */

import type { Reporter, TestResult, TestRun } from '../types.js'

const SYMBOLS = {
  pass: '\u2713',  // ✓
  fail: '\u2717',  // ✗
  skip: '\u25CB',  // ○
  pending: '\u25CF', // ●
}

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

function colorize(color: keyof typeof COLORS, text: string): string {
  // Check if running in environment that supports colors
  const supportsColor = typeof process !== 'undefined' &&
    process.stdout?.isTTY &&
    process.env.TERM !== 'dumb' &&
    !process.env.NO_COLOR

  if (!supportsColor) {
    return text
  }

  return `${COLORS[color]}${text}${COLORS.reset}`
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(2)}s`
}

export class ConsoleReporter implements Reporter {
  private output: string[] = []
  private verbose: boolean

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose ?? false
  }

  private log(message: string): void {
    this.output.push(message)
    console.log(message)
  }

  onRunStart(run: Pick<TestRun, 'runId' | 'startedAt'>): void {
    this.log('')
    this.log(colorize('bold', '  API.QA Test Runner'))
    this.log(colorize('gray', `  Run ID: ${run.runId}`))
    this.log('')
  }

  onTestStart(test: Pick<TestResult, 'id' | 'name'>): void {
    if (this.verbose) {
      process.stdout.write(colorize('gray', `  ${SYMBOLS.pending} ${test.name}...`))
    }
  }

  onTestComplete(result: TestResult): void {
    let symbol: string
    let color: keyof typeof COLORS

    switch (result.status) {
      case 'passed':
        symbol = SYMBOLS.pass
        color = 'green'
        break
      case 'failed':
        symbol = SYMBOLS.fail
        color = 'red'
        break
      case 'skipped':
        symbol = SYMBOLS.skip
        color = 'yellow'
        break
      default:
        symbol = SYMBOLS.pending
        color = 'gray'
    }

    if (this.verbose) {
      // Clear the "pending" line
      process.stdout.write('\r\x1b[K')
    }

    const duration = colorize('gray', ` (${formatDuration(result.duration)})`)
    this.log(`  ${colorize(color, symbol)} ${result.name}${duration}`)

    // Show failure details
    if (result.status === 'failed') {
      if (result.error) {
        this.log(colorize('red', `    Error: ${result.error.message}`))
      }

      for (const assertion of result.assertions) {
        if (!assertion.passed) {
          this.log(colorize('red', `    ${assertion.path}: ${assertion.message}`))
          if (this.verbose) {
            this.log(colorize('gray', `      Expected: ${JSON.stringify(assertion.expected)}`))
            this.log(colorize('gray', `      Actual: ${JSON.stringify(assertion.actual)}`))
          }
        }
      }
    }
  }

  onRunComplete(run: TestRun): void {
    this.log('')

    const { summary } = run

    // Summary line
    const parts: string[] = []

    if (summary.passed > 0) {
      parts.push(colorize('green', `${summary.passed} passed`))
    }
    if (summary.failed > 0) {
      parts.push(colorize('red', `${summary.failed} failed`))
    }
    if (summary.skipped > 0) {
      parts.push(colorize('yellow', `${summary.skipped} skipped`))
    }

    this.log(`  ${colorize('bold', 'Tests:')} ${parts.join(', ')}`)
    this.log(`  ${colorize('bold', 'Time:')}  ${formatDuration(summary.duration)}`)
    this.log('')

    // Exit code hint
    if (summary.failed > 0) {
      this.log(colorize('red', `  ${summary.failed} test(s) failed`))
    } else {
      this.log(colorize('green', '  All tests passed'))
    }
    this.log('')
  }

  getOutput(): string {
    return this.output.join('\n')
  }
}

export function createConsoleReporter(options?: { verbose?: boolean }): ConsoleReporter {
  return new ConsoleReporter(options)
}
